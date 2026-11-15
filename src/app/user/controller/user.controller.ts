import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../lib/error/error";
import userService from "../service/user.service";

class UserController {
    private readonly userService = userService;

    uploadProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const file = req.file;
            if (!file) {
                throw new AppError("Profile picture is required", 400);
            }

            const userId = req.user?.id;
            if (!userId) {
                throw new AppError("Authentication required", 401);
            }

            await this.userService.uploadProfilePicture(file, userId);
            res.json({ message: "Profile picture uploaded successfully", success: true });
        } catch (error) {
            next(error);
        }
    };
}

export default new UserController();