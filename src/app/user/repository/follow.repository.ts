import { Types } from "mongoose";
import { Follow, FollowStatus } from "../model/follow.model";

class FollowRepository {
    find(followerId: Types.ObjectId, followeeId: Types.ObjectId) {
        return Follow.findOne({ followerId, followeeId });
    }

    create(followerId: Types.ObjectId, followeeId: Types.ObjectId, status: FollowStatus) {
        return Follow.create({ followerId, followeeId, status });
    }

    remove(followerId: Types.ObjectId, followeeId: Types.ObjectId) {
        return Follow.findOneAndDelete({ followerId, followeeId });
    }

    async getFollowingIds(followerId: Types.ObjectId) {
        const follows = await Follow.find({ followerId }).select("followeeId").lean();
        return follows.map((follow) => follow.followeeId);
    }

    countFollowers(userId: Types.ObjectId) {
        return Follow.countDocuments({ followeeId: userId, status: "accepted" });
    }

    countFollowing(userId: Types.ObjectId) {
        return Follow.countDocuments({ followerId: userId, status: "accepted" });
    }

    getPendingRequests(userId: Types.ObjectId) {
        return Follow.find({ followeeId: userId, status: "pending" })
            .select("followerId createdAt")
            .lean();
    }

    acceptRequest(followerId: Types.ObjectId, followeeId: Types.ObjectId) {
        return Follow.findOneAndUpdate(
            { followerId, followeeId, status: "pending" },
            { status: "accepted" },
            { new: true }
        );
    }

    declineRequest(followerId: Types.ObjectId, followeeId: Types.ObjectId) {
        return Follow.findOneAndDelete({ followerId, followeeId, status: "pending" });
    }
}

export default new FollowRepository();
