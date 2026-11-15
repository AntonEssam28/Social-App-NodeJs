import { mailjetProvider } from './../../../lib/email/init';
import { MailProvider } from './../../../pkg/email/mail.interface';
import { generateOTPCode } from "../../../lib/utils/otp";
import userRepository from "../../user/repository/user.repository";
import { LoginDTO, RegisterDTO, sendOtpDto, verifyAccountDto, forgotPasswordDto } from "../dto";
import { comparePassword, generateAccessToken, generateFreshToken, hashPassword } from "../utils";
import { userAlreadyExist, userAlreadyVerified, userNotExist, userNotVerified } from "../../user/errors";
import { Gender, Provider } from "../enum";
import { cacheProvider } from "../../../lib/cache/init";
import { toSeconds } from "../../../pkg/utils/time";
import { invalidOtp, invalidPassword, loginTemporarilyLocked, otpExpired, twoStepVerificationAlreadyEnabled, twoStepVerificationNotEnabled } from '../errors';
import { verifyGoogleToken } from '../../../lib/utils/google-auth';
import { AppError } from '../../../lib/error/error';
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken"
import {env} from "../../../lib/config/env"
import { Types } from "mongoose";

export class AuthService{
    private twoStepVerification = '2-step-verification'
    private sendOtpkey = 'otp:'
    private passwordResetKey = 'password-reset:'
    private revokedTokenKey = 'revoked-token:'
    private readonly userRepository = userRepository;
    private readonly mailProvider:MailProvider
    constructor(){
        this.mailProvider = mailjetProvider
    }

    private normalizeEmail = (email:unknown)=>{
        if(typeof email !== "string") throw new AppError("A valid email is required",400);
        const normalizedEmail = email.trim().toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            throw new AppError("A valid email is required",400);
        }
        return normalizedEmail;
    }
    
    register = async (registerDto:RegisterDTO)=>{
        const email = this.normalizeEmail(registerDto.email);
        if(typeof registerDto.name !== "string" || registerDto.name.trim().length < 3 || registerDto.name.trim().length > 20) {
            throw new AppError("User name must be between 3 and 20 characters",400);
        }
        if(typeof registerDto.password !== "string" || registerDto.password.length < 8) {
            throw new AppError("Password must be at least 8 characters",400);
        }
        const userExist = await this.userRepository.findByEmail(email);
        if(userExist)throw userAlreadyExist;
        const password = await hashPassword(registerDto.password);
        const createUser = await this.userRepository.create({
            userName: registerDto.name,
            email,
            password,
            phoneNumber: registerDto.phoneNumber,
            provider: Provider.LOCAL,
            gender: registerDto.gender ?? Gender.MALE
        });
        const code = generateOTPCode()

        await cacheProvider.set(`${this.sendOtpkey}${createUser._id.toString()}`,code,toSeconds(3,'minutes'));
        await this.mailProvider.send(email,'verification code',`<h1>Your Verification Code is : ${code}</h1>`)
        return createUser;
    }

    verifyAccount = async (verifyAccountDto:verifyAccountDto)=>{
        const email = this.normalizeEmail(verifyAccountDto.email);
        const user = await this.userRepository.findByEmail(email);
        if(!user)throw userNotExist;
        if(user.isVerified === true) throw userAlreadyVerified;
        const cacheCode = await cacheProvider.get(`${this.sendOtpkey}${user._id.toString()}`);
        if(!cacheCode) throw otpExpired
        if(cacheCode !== verifyAccountDto.code) throw invalidOtp;
        const updatedUser = await this.userRepository.update({email},{isVerified:true},{new:true});
        if(!updatedUser) throw userNotExist;
        await cacheProvider.del(`${this.sendOtpkey}${user._id.toString()}`)
        return updatedUser
    }

    enable2StepVerification = async(userId: string)=>{
        const user = await this.userRepository.getOne({_id:new Types.ObjectId(userId)});
        if(!user) throw userNotExist;
        if(user.isTwoStepVerificationEnabled) throw twoStepVerificationAlreadyEnabled;

        const code = generateOTPCode();
        const verificationKey = `${this.twoStepVerification}:${user.email}`;
        await cacheProvider.set(verificationKey,code,toSeconds(3,'minutes'));
        await this.mailProvider.send(user.email,'2 step verification code',`Your 2 Step Verification Code is:${code}`);
    }

    verifyCodeActiveTwoStepVerification = async(userId: string, code: string)=>{
        const user = await this.userRepository.getOne({_id:new Types.ObjectId(userId)});
        if(!user) throw userNotExist;

        if(user.isTwoStepVerificationEnabled) throw twoStepVerificationAlreadyEnabled;
        const verificationKey = `${this.twoStepVerification}:${user.email}`;
        const cachedCode = await cacheProvider.get(verificationKey);
        if(!cachedCode) throw otpExpired;
        if(cachedCode !== code) throw invalidOtp;

        const updatedUser = await this.userRepository.update(
            {_id:user._id},
            {isTwoStepVerificationEnabled: true},
            {new: true}
        );
        if(!updatedUser) throw userNotExist;
        await cacheProvider.del(verificationKey);
        return updatedUser;
    }

    login = async(loginDto: LoginDTO)=>{
        const email = this.normalizeEmail(loginDto.email);
        if(typeof loginDto.password !== "string") throw invalidPassword;
        const loginAttemptKey = `${email}:login`;
        const cachedAttempt = await cacheProvider.get(loginAttemptKey);
        if(cachedAttempt === '0') throw loginTemporarilyLocked;

        const user = await this.userRepository.getOne({email});
        if(!user) throw userNotExist;
        if(user.isVerified !== true) throw userNotVerified;

        const match = user.provider === Provider.LOCAL && user.password
            ? await comparePassword(loginDto.password,user.password)
            : false;
        if(!match){
            const attemptsRemaining = cachedAttempt === null ? 5 : Number(cachedAttempt);
            const nextAttempts = Math.max(attemptsRemaining - 1, 0);
            const ttlRemaining = await cacheProvider.ttl(loginAttemptKey);
            const ttl = nextAttempts === 0 || ttlRemaining <= 0
                ? toSeconds(5, 'minutes')
                : ttlRemaining;
            await cacheProvider.set(loginAttemptKey, String(nextAttempts), ttl);
            if(nextAttempts === 0) throw loginTemporarilyLocked;
            throw invalidPassword;
        }

        await cacheProvider.del(loginAttemptKey);

        if(user.isTwoStepVerificationEnabled){
            const code = generateOTPCode();
            const verificationKey = `${this.twoStepVerification}:login:${email}`;
            await cacheProvider.set(verificationKey, code, toSeconds(1, 'minutes'));
            await this.mailProvider.send(
                email,
                '2 step verification code',
                `<h3>Your code is ${code}</h3>`
            );
            return {requiresTwoStepVerification: true};
        }

        const accessToken = generateAccessToken({id: user._id.toString(), name: user.userName});
        const refreshToken = generateFreshToken({id: user._id.toString(), name: user.userName});
        return{
            accessToken,refreshToken
        }
    }

    sendOtp = async (sendOtpDto:sendOtpDto)=>{
        const email = this.normalizeEmail(sendOtpDto.email);
        const user = await userRepository.findByEmail(email);
        if(!user) throw userNotExist
        const code = generateOTPCode();

        await cacheProvider.set(`${this.sendOtpkey}${user._id.toString()}`,code,toSeconds(3,'minutes'));
        await this.mailProvider.send(email,'new otp', `<p>Your new Otp is: ${code}</p>`);
    }

    loginWithGoogle = async (idToken:string)=>{
        const payload = await verifyGoogleToken(idToken);
        if(!payload?.email || payload.email_verified !== true) {
            throw new AppError('Google account must have a verified email',403);
        }
        const email = payload.email.trim().toLowerCase();
        let user = await this.userRepository.findByEmail(email);

        if(!user){
            const suggestedName = (payload.name?.trim() || email.split('@')[0]).slice(0,20);
            user = await this.userRepository.create({
                userName: suggestedName.length >= 3 ? suggestedName : `${suggestedName}user`,
                email,
                provider: Provider.GOOGLE,
                gender: Gender.MALE,
                isVerified: true
            });
            if(!user) throw new AppError('Unable to create Google user',500);
        }else if(user.isVerified !== true){
            const verifiedUser = await this.userRepository.update(
                {email},
                {isVerified: true},
                {new: true}
            );
            if(!verifiedUser) throw userNotExist;
            user = verifiedUser;
        }

        if(user.isTwoStepVerificationEnabled){
            const code = generateOTPCode();
            const verificationKey = `${this.twoStepVerification}:login:${email}`;
            await cacheProvider.set(verificationKey,code,toSeconds(1,'minutes'));
            await this.mailProvider.send(email,'2 step verification code',`<h3>Your code is ${code}</h3>`);
            return {requiresTwoStepVerification: true};
        }

        const accessToken = generateAccessToken({
            id: user._id.toString(),
            name: user.userName,
            email: user.email
        });
        const refreshToken = generateFreshToken({
            id: user._id.toString(),
            name: user.userName,
            email: user.email
        });
        return {accessToken,refreshToken};
    }

    refreshToken = async (token: string)=>{
        let payload;
        try {
            payload = jwt.verify(token,env.jwt.secret);
        } catch(error) {
            if(error instanceof JsonWebTokenError) {
                throw new AppError('Invalid or expired refresh token',401);
            }
            throw error;
        }

        if(
            typeof payload === 'string' ||
            payload.tokenType !== 'refresh' ||
            typeof payload.id !== 'string' ||
            typeof payload.jti !== 'string' ||
            typeof payload.exp !== 'number' ||
            !Types.ObjectId.isValid(payload.id)
        ) {
            throw new AppError('Invalid refresh token',401);
        }
        const refreshTokenTtl = Math.max(payload.exp - Math.floor(Date.now()/1000),1);
        const refreshTokenClaimed = await cacheProvider.setIfNotExists(
            `${this.revokedTokenKey}${payload.jti}`,
            '1',
            refreshTokenTtl
        );
        if(!refreshTokenClaimed) {
            throw new AppError('Refresh token has been revoked',401);
        }

        const user = await this.userRepository.getOne({_id: new Types.ObjectId(payload.id)});
        if(!user) throw userNotExist;

        const tokenPayload = {
            id: user._id.toString(),
            name: user.userName,
            email: user.email
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateFreshToken(tokenPayload);
        return {
            accessToken,
            refreshToken
        };
    }

    verifyTwoStepLogin = async(email:string,code:string)=>{
        const normalizedEmail = this.normalizeEmail(email);
        const user = await this.userRepository.findByEmail(normalizedEmail);
        if(!user) throw userNotExist;
        if(!user.isTwoStepVerificationEnabled) throw twoStepVerificationNotEnabled;

        const verificationKey = `${this.twoStepVerification}:login:${normalizedEmail}`;
        const cachedCode = await cacheProvider.get(verificationKey);
        if(!cachedCode) throw otpExpired;
        if(cachedCode !== code) throw invalidOtp;
        await cacheProvider.del(verificationKey);

        const tokenPayload = {
            id: user._id.toString(),
            name: user.userName,
            email: user.email
        };
        return {
            accessToken: generateAccessToken(tokenPayload),
            refreshToken: generateFreshToken(tokenPayload)
        };
    }

    requestPasswordReset = async(email:string)=>{
        const normalizedEmail = this.normalizeEmail(email);
        const user = await this.userRepository.findByEmail(normalizedEmail);
        if(!user || user.provider !== Provider.LOCAL) return;

        const code = generateOTPCode();
        await cacheProvider.set(
            `${this.passwordResetKey}${user._id.toString()}`,
            code,
            toSeconds(10,'minutes')
        );
        await this.mailProvider.send(
            normalizedEmail,
            'Password reset code',
            `<p>Your password reset code is: ${code}</p>`
        );
    }

    resetPassword = async(resetDto:forgotPasswordDto)=>{
        const normalizedEmail = this.normalizeEmail(resetDto.email);
        if(typeof resetDto.code !== "string" || typeof resetDto.newPassword !== "string" || resetDto.newPassword.length < 8) {
            throw new AppError("A valid code and a password of at least 8 characters are required",400);
        }
        const user = await this.userRepository.findByEmail(normalizedEmail);
        if(!user || user.provider !== Provider.LOCAL) throw invalidOtp;

        const resetKey = `${this.passwordResetKey}${user._id.toString()}`;
        const cachedCode = await cacheProvider.get(resetKey);
        if(!cachedCode) throw otpExpired;
        if(cachedCode !== resetDto.code) throw invalidOtp;

        const password = await hashPassword(resetDto.newPassword);
        const updatedUser = await this.userRepository.update(
            {_id:user._id},
            {password},
            {new:true}
        );
        if(!updatedUser) throw userNotExist;
        await cacheProvider.del(resetKey);
    }

    revokeSessions = async(accessToken:string,refreshToken?:string)=>{
        await this.revokeProvidedToken(accessToken,'access');
        if(refreshToken) {
            await this.revokeProvidedToken(refreshToken,'refresh');
        }
    }

    private revokeProvidedToken = async(token:string,tokenType:'access'|'refresh')=>{
        let payload;
        try {
            payload = jwt.verify(token,env.jwt.secret);
        } catch(error) {
            if(error instanceof TokenExpiredError) return;
            if(error instanceof JsonWebTokenError) {
                throw new AppError('Invalid session token',401);
            }
            throw error;
        }
        if(typeof payload === 'string' || payload.tokenType !== tokenType || typeof payload.jti !== 'string') {
            throw new AppError('Invalid session token',401);
        }
        await this.revokeToken(payload.jti,payload.exp);
    }

    private revokeToken = async(jti:string,expiresAt?:number)=>{
        if(!expiresAt) return;
        const ttl = Math.max(expiresAt - Math.floor(Date.now()/1000),1);
        await cacheProvider.set(`${this.revokedTokenKey}${jti}`,'1',ttl);
    }
}

export default new AuthService();