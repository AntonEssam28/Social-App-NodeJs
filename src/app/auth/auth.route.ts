import { Router } from "express";
import authController from "./controller/auth.controller";
import { authGuard } from "../../lib/auth/authGuard";

export const authRouter = Router()

authRouter.post("/register", authController.register);
authRouter.post("/verify-account", authController.verifyAccount);
authRouter.post("/login", authController.login);
authRouter.post("/google", authController.loginWithGoogle);
authRouter.post("/send-otp", authController.sendOtp);
authRouter.post("/forgot-password", authController.requestPasswordReset);
authRouter.post("/reset-password", authController.resetPassword);
authRouter.post("/2-step-verification/login", authController.verifyTwoStepLogin);
authRouter.post("/2-step-verification/enable", authGuard, authController.enableTwoStepVerification);
authRouter.post("/2-step-verification/verify", authGuard, authController.verifyCodeActiveTwoStepVerification);
authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authGuard, authController.logout);