import { Router } from "express";
import userController from "./controller/user.controller";
import { multerUploadSingle } from "../../lib/media/multer";
import { authGuard } from "../../lib/auth/authGuard";

export const userRouter = Router();

userRouter.use(authGuard);

userRouter.get("/me",userController.getMyProfile);
userRouter.patch("/me",userController.updateProfile);
userRouter.patch("/me/privacy",userController.setProfilePrivacy);
userRouter.get("/search",userController.searchUsers);
userRouter.get("/suggestions",userController.getSuggestions);
userRouter.get("/follow-requests",userController.getFollowRequests);
userRouter.post("/follow-requests/:userId/accept",userController.acceptFollowRequest);
userRouter.post("/follow-requests/:userId/decline",userController.declineFollowRequest);
userRouter.post("/:userId/follow",userController.followUser);
userRouter.delete("/:userId/follow",userController.unfollowUser);
userRouter.post("/upload-profile-pic",multerUploadSingle("pp"),userController.uploadProfilePicture);
userRouter.get("/:userId",userController.getProfile);