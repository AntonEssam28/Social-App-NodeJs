import {AppError} from "../../lib/error/error";

export const invalidOtp = new AppError ('Invalid OTP.',404)
export const otpExpired = new AppError ('OTP Expired , Please resned OTP',400)
export const invalidPassword = new AppError ('Invalid Password.',403)
export const loginTemporarilyLocked = new AppError ('Too many failed login attempts. Please try again in 5 minutes.',429)
export const twoStepVerificationAlreadyEnabled = new AppError ('Two-step verification is already enabled.',400)
export const twoStepVerificationNotEnabled = new AppError ('Two-step verification is not enabled for this account.',400)