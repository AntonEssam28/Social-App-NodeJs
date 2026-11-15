import { Router } from "express";
import userController from "./controller/user.controller";
import { multerUploadSingle } from "../../lib/media/multer";

export const userRouter = Router();

userRouter.post('/upload-profile-pic',multerUploadSingle('pp'),userController.uploadProfilePicture)