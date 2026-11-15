import { NextFunction, Request, Response } from "express";
import authServiceInstance, { AuthService } from "../service/auth.service";
import { AppError } from "../../../lib/error/error";
import { setCookies } from "../utils";

export class AuthController {
    private readonly authService: AuthService = authServiceInstance;

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.authService.register(req.body);
            const userData = user.toObject();
            delete userData.password;
            res.status(201).json({
                message: "User Created Successfully",
                success: true,
                data: userData
            });
        } catch (error) {
            next(error);
        }
    };

    verifyAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.authService.verifyAccount(req.body);
            res.status(200).json({
                message: "Account verified successfully",
                success: true,
                data: user ? { email: user.email, isVerified: user.isVerified } : null
            });
        } catch (error) {
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.login(req.body);
            if ("requiresTwoStepVerification" in result) {
                res.status(202).json({
                    message: "Verification code sent",
                    success: true,
                    data: result
                });
                return;
            }

            setCookies(res, result.accessToken, result.refreshToken);
            res.status(200).json({ message: "Login successful", success: true });
        } catch (error) {
            next(error);
        }
    };

    loginWithGoogle = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.loginWithGoogle(req.body.idToken);
            if ("requiresTwoStepVerification" in result) {
                res.status(202).json({
                    message: "Verification code sent",
                    success: true,
                    data: result
                });
                return;
            }

            setCookies(res, result.accessToken, result.refreshToken);
            res.status(200).json({ message: "Login successful", success: true });
        } catch (error) {
            next(error);
        }
    };

    sendOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.authService.sendOtp(req.body);
            res.status(200).json({ message: "OTP sent successfully", success: true });
        } catch (error) {
            next(error);
        }
    };

    enableTwoStepVerification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.authService.enable2StepVerification(req.body.email);
            res.status(200).json({
                message: "Two-step verification code sent",
                success: true
            });
        } catch (error) {
            next(error);
        }
    };

    verifyCodeActiveTwoStepVerification = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const user = await this.authService.verifyCodeActiveTwoStepVerification(
                req.body.email,
                req.body.code
            );
            res.status(200).json({
                message: "Two-step verification enabled",
                success: true,
                data: { email: user.email, isTwoStepVerificationEnabled: user.isTwoStepVerificationEnabled }
            });
        } catch (error) {
            next(error);
        }
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies?.refresh_token;
            if (typeof token !== "string") {
                throw new AppError("No refresh token provided", 401);
            }

            const result = await this.authService.refreshToken(token);
            setCookies(res, result.accessToken, result.refreshToken);
            res.status(200).json({ message: "Tokens refreshed successfully", success: true });
        } catch (error) {
            next(error);
        }
    };
}

export const authController = new AuthController();
export default authController;
