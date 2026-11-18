import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../lib/error/error";
import userService from "../service/user.service";

class UserController {
    private readonly userService = userService;

    private getUserId = (req:Request)=>{
        const userId = req.user?.id;
        if(!userId) throw new AppError("Authentication required",401);
        return userId;
    }

    private getParam = (req:Request,name:string)=>{
        const value = req.params[name];
        if(typeof value !== "string") throw new AppError(`Invalid ${name}`,400);
        return value;
    }

    getMyProfile = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const user = await this.userService.getMyProfile(this.getUserId(req));
            res.json({success:true,data:user});
        } catch(error) {
            next(error);
        }
    };

    getProfile = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const profile = await this.userService.getProfile(this.getParam(req,"userId"),this.getUserId(req));
            res.json({success:true,data:profile});
        } catch(error) {
            next(error);
        }
    };

    updateProfile = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const user = await this.userService.updateProfile(this.getUserId(req),req.body ?? {});
            res.json({message:"Profile updated successfully",success:true,data:user});
        } catch(error) {
            next(error);
        }
    };

    setProfilePrivacy = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const result = await this.userService.setProfilePrivacy(this.getUserId(req),req.body?.isPrivate);
            res.json({message:"Profile privacy updated successfully",success:true,data:result});
        } catch(error) {
            next(error);
        }
    };

    followUser = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const result = await this.userService.followUser(this.getUserId(req),this.getParam(req,"userId"));
            res.status(result.status === "pending" ? 202 : 200).json({
                message:result.status === "pending" ? "Follow request sent" : "User followed successfully",
                success:true,
                data:result
            });
        } catch(error) {
            next(error);
        }
    };

    unfollowUser = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const result = await this.userService.unfollowUser(this.getUserId(req),this.getParam(req,"userId"));
            res.json({message:"User unfollowed successfully",success:true,data:result});
        } catch(error) {
            next(error);
        }
    };

    getFollowRequests = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const requests = await this.userService.getFollowRequests(this.getUserId(req));
            res.json({success:true,data:requests});
        } catch(error) {
            next(error);
        }
    };

    acceptFollowRequest = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const result = await this.userService.respondToFollowRequest(
                this.getUserId(req),
                this.getParam(req,"userId"),
                true
            );
            res.json({message:"Follow request accepted",success:true,data:result});
        } catch(error) {
            next(error);
        }
    };

    declineFollowRequest = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const result = await this.userService.respondToFollowRequest(
                this.getUserId(req),
                this.getParam(req,"userId"),
                false
            );
            res.json({message:"Follow request declined",success:true,data:result});
        } catch(error) {
            next(error);
        }
    };

    searchUsers = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            if(typeof req.query.q !== "string") throw new AppError("Search query is required",400);
            const users = await this.userService.searchUsers(this.getUserId(req),req.query.q);
            res.json({success:true,data:users});
        } catch(error) {
            next(error);
        }
    };

    getSuggestions = async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const users = await this.userService.getSuggestions(this.getUserId(req));
            res.json({success:true,data:users});
        } catch(error) {
            next(error);
        }
    };

    uploadProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const file = req.file;
            if (!file) {
                throw new AppError("Profile picture is required", 400);
            }

            const userId = this.getUserId(req);

            if (!file.mimetype.startsWith("image/")) {
                throw new AppError("Profile picture must be an image", 400);
            }

            const user = await this.userService.uploadProfilePicture(file, userId);
            res.json({
                message: "Profile picture uploaded successfully",
                success: true,
                data: { profilePicturePath: user.profilePicturePath }
            });
        } catch (error) {
            next(error);
        }
    };

    deleteProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.userService.deleteProfilePicture(this.getUserId(req));
            res.json({
                message: "Profile picture deleted successfully",
                success: true,
                data: { profilePicturePath: user.profilePicturePath }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new UserController();