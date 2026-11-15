import { s3CloudProvider } from './../../../lib/cloud/init';
import type { CloudFile, ICloudProvider } from "../../../pkg/cloud/cloud.interface";
import userRepository from '../repository/user.repository';
import followRepository from '../repository/follow.repository';
import { alreadyFollowing, cannotFollowSelf, followRequestNotFound, userNotExist } from '../errors';
import { AppError } from '../../../lib/error/error';
import { Gender } from '../../auth/enum';
import { Types } from 'mongoose';
import { IUser } from '../interface/user.interface';

class UserService{
    private readonly cloudProvider:ICloudProvider = s3CloudProvider;
    private readonly userRepository = userRepository;

    private getObjectId = (id:string)=>{
        if(!Types.ObjectId.isValid(id)) throw new AppError("Invalid user ID",400);
        return new Types.ObjectId(id);
    }

    getMyProfile = async(userId:string)=>{
        const user = await this.userRepository.getOne({_id:this.getObjectId(userId)});
        if(!user) throw userNotExist;
        const userData = user.toObject();
        delete userData.password;
        const [followersCount,followingCount] = await Promise.all([
            followRepository.countFollowers(this.getObjectId(userId)),
            followRepository.countFollowing(this.getObjectId(userId))
        ]);
        return {...userData,followersCount,followingCount};
    }

    getProfile = async(userId:string,viewerId:string)=>{
        const targetId = this.getObjectId(userId);
        const currentUserId = this.getObjectId(viewerId);
        const user = await this.userRepository.getOne({_id:targetId});
        if(!user) throw userNotExist;

        const isOwnProfile = targetId.equals(currentUserId);
        const relation = isOwnProfile ? null : await followRepository.find(currentUserId,targetId);
        const isFollowing = relation?.status === "accepted";
        const restricted = user.isPrivate === true && !isOwnProfile && !isFollowing;
        const [followersCount,followingCount] = await Promise.all([
            followRepository.countFollowers(targetId),
            followRepository.countFollowing(targetId)
        ]);
        const profile = {
            id:user._id.toString(),
            userName:user.userName,
            profilePicturePath:user.profilePicturePath,
            isPrivate:user.isPrivate === true,
            followersCount,
            followingCount
        };

        if(!restricted) {
            return {
                ...profile,
                gender:user.gender,
                followStatus:isOwnProfile ? "self" : relation?.status ?? "not-following",
                restricted:false
            };
        }

        return {
            ...profile,
            followStatus:relation?.status ?? "not-following",
            restricted:true
        };
    }

    updateProfile = async(userId:string,profileData:Record<string,unknown>)=>{
        if(!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
            throw new AppError("Profile data is required",400);
        }
        const updateData:Partial<IUser> = {};
        if("userName" in profileData) {
            if(typeof profileData.userName !== "string") throw new AppError("Invalid user name",400);
            const userName = profileData.userName.trim();
            if(userName.length < 3 || userName.length > 20) {
                throw new AppError("User name must be between 3 and 20 characters",400);
            }
            updateData.userName = userName;
        }
        if("phoneNumber" in profileData) {
            if(typeof profileData.phoneNumber !== "string" || profileData.phoneNumber.length > 30) {
                throw new AppError("Invalid phone number",400);
            }
            updateData.phoneNumber = profileData.phoneNumber.trim();
        }
        if("gender" in profileData) {
            if(profileData.gender !== Gender.MALE && profileData.gender !== Gender.FEMALE) {
                throw new AppError("Invalid gender",400);
            }
            updateData.gender = profileData.gender;
        }
        if(Object.keys(updateData).length === 0) throw new AppError("No profile fields to update",400);

        const user = await this.userRepository.update(
            {_id:this.getObjectId(userId)},
            updateData,
            {new:true,runValidators:true}
        );
        if(!user) throw userNotExist;
        const userData = user.toObject();
        delete userData.password;
        return userData;
    }

    setProfilePrivacy = async(userId:string,isPrivate:unknown)=>{
        if(typeof isPrivate !== "boolean") throw new AppError("isPrivate must be a boolean",400);
        const user = await this.userRepository.update(
            {_id:this.getObjectId(userId)},
            {isPrivate},
            {new:true}
        );
        if(!user) throw userNotExist;
        return {isPrivate:user.isPrivate === true};
    }

    followUser = async(userId:string,targetUserId:string)=>{
        const followerId = this.getObjectId(userId);
        const followeeId = this.getObjectId(targetUserId);
        if(followerId.equals(followeeId)) throw cannotFollowSelf;
        const targetUser = await this.userRepository.getOne({_id:followeeId});
        if(!targetUser) throw userNotExist;

        const existingFollow = await followRepository.find(followerId,followeeId);
        if(existingFollow?.status === "accepted") throw alreadyFollowing;
        if(existingFollow?.status === "pending") return {status:"pending"};

        const status = targetUser.isPrivate === true ? "pending" : "accepted";
        await followRepository.create(followerId,followeeId,status);
        return {status};
    }

    unfollowUser = async(userId:string,targetUserId:string)=>{
        const followerId = this.getObjectId(userId);
        const followeeId = this.getObjectId(targetUserId);
        if(followerId.equals(followeeId)) throw cannotFollowSelf;
        await followRepository.remove(followerId,followeeId);
        return {unfollowed:true};
    }

    getFollowRequests = async(userId:string)=>{
        const pendingRequests = await followRepository.getPendingRequests(this.getObjectId(userId));
        const userIds = pendingRequests.map((request)=>request.followerId);
        const profiles = await this.userRepository.findBasicProfiles(userIds);
        const profileById = new Map(profiles.map((profile)=>[profile._id.toString(),profile]));
        return pendingRequests.map((request)=>({
            user:profileById.get(request.followerId.toString()),
            createdAt:request.createdAt
        }));
    }

    respondToFollowRequest = async(userId:string,followerUserId:string,accept:boolean)=>{
        const followerId = this.getObjectId(followerUserId);
        const followeeId = this.getObjectId(userId);
        const request = accept
            ? await followRepository.acceptRequest(followerId,followeeId)
            : await followRepository.declineRequest(followerId,followeeId);
        if(!request) throw followRequestNotFound;
        return {status:accept ? "accepted" : "declined"};
    }

    searchUsers = async(userId:string,query:string)=>{
        const normalizedQuery = query.trim();
        if(normalizedQuery.length < 2) throw new AppError("Search query must be at least 2 characters",400);
        const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        return this.userRepository.searchByUserName(escapedQuery,this.getObjectId(userId));
    }

    getSuggestions = async(userId:string)=>{
        const currentUserId = this.getObjectId(userId);
        const followingIds = await followRepository.getFollowingIds(currentUserId);
        return this.userRepository.searchByUserName("",currentUserId,followingIds);
    }

    uploadProfilePicture = async (file:CloudFile,userId:string)=>{
        const objectId = this.getObjectId(userId);
        const existingUser = await this.userRepository.getOne({_id:objectId});
        if(!existingUser) throw userNotExist;
        const key = await this.cloudProvider.uploadFile(file,`users/${userId}`)
        const user = await this.userRepository.update({_id:objectId},{profilePicturePath:key},{new:true});
        if (!user) {
            throw userNotExist;
        }
        return user;
    }
}

export default new UserService();

