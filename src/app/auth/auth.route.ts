import { Router } from "express";
import authController from "./controller/auth.controller";

export const authRouter = Router()

authRouter.post("/register", authController.register);
authRouter.post("/verify-account", authController.verifyAccount);
authRouter.post("/login", authController.login);
authRouter.post("/google", authController.loginWithGoogle);
authRouter.post("/send-otp", authController.sendOtp);
authRouter.post("/2-step-verification/enable", authController.enableTwoStepVerification);
authRouter.post("/2-step-verification/verify", authController.verifyCodeActiveTwoStepVerification);
authRouter.post("/refresh-token", authController.refreshToken);