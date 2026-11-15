import { mailjetProvider, nodeMailerProvider } from './../../../lib/email/init';
import { MailProvider } from './../../../pkg/email/mail.interface';
import { generateOTPCode } from "../../../lib/utils/otp";
import userRepository from "../../user/repository/user.repository";
import { LoginDTO, RegisterDTO, sendOtpDto, verifyAccountDto, forgotPasswordDto } from "../dto";
import { comparePassword, generateAccessToken, generateFreshToken, hashPassword } from "../utils";
import { userAlreadyExist, userAlreadyVerified, userNotExist, userNotVerified } from "../../user/errors";
import { Gender, Provider } from "../enum";
import { cacheProvider } from "../../../lib/cache/init";
import { toSeconds } from "../../../pkg/utils/time";
import { invalidOtp, invalidPassword, loginTemporarilyLocked, otpExpired, twoStepVerificationAlreadyEnabled } from '../errors';
import { verifyGoogleToken } from '../../../lib/utils/google-auth';
import { AppError } from '../../../lib/error/error';
import jwt, { JsonWebTokenError } from "jsonwebtoken"
import {env} from "../../../lib/config/env"
import { Types } from "mongoose";

export class AuthService{
    private twoStepVerification = '2-step-verification'
    private sendOtpkey = 'otp:'
    private readonly userRepository = userRepository;
    private readonly mailProvider:MailProvider
    constructor(){
        this.mailProvider = nodeMailerProvider
    }
    
    register = async (registerDto:RegisterDTO)=>{
        const userExist = await this.userRepository.findByEmail(registerDto.email);
        if(userExist)throw userAlreadyExist;
        registerDto.password = await hashPassword(registerDto.password);
        const createUser = await this.userRepository.create({
            userName: registerDto.name,
            email: registerDto.email,
            password: registerDto.password,
            provider: Provider.LOCAL,
            gender: registerDto.gender ?? Gender.MALE
        });
        const code = generateOTPCode()

        await cacheProvider.set(`${this.sendOtpkey}${createUser._id.toString()}`,code,toSeconds(3,'minutes'));
        await this.mailProvider.send(registerDto.email,'verification code',`<h1>Your Verification Code is : ${code}</h1>`)
        return createUser;
    }

    verifyAccount = async (verifyAccountDto:verifyAccountDto)=>{
        const user = await this.userRepository.findByEmail(verifyAccountDto.email);
        if(!user)throw userNotExist;
        if(user.isVerified === true) throw userAlreadyVerified;
        const cacheCode = await cacheProvider.get(`${this.sendOtpkey}${user._id.toString()}`);
        if(!cacheCode) throw otpExpired
        if(cacheCode !== verifyAccountDto.code) throw invalidOtp;
        const updatedUser = await this.userRepository.update({email:verifyAccountDto.email},{isVerified:true});
        await cacheProvider.del(`${this.sendOtpkey}${user._id.toString()}`)
        return updatedUser
    }

    enable2StepVerification = async(email: string)=>{
        const user = await this.userRepository.findByEmail(email);
        if(!user) throw userNotExist;
        if(user.isTwoStepVerificationEnabled) throw twoStepVerificationAlreadyEnabled;

        const code = generateOTPCode();
        const verificationKey = `${this.twoStepVerification}:${email}`;
        await cacheProvider.set(verificationKey,code,toSeconds(3,'minutes'));
        await this.mailProvider.send(email,'2 step verification code',`Your 2 Step Verification Code is:${code}`);
    }

    verifyCodeActiveTwoStepVerification = async(email: string, code: string)=>{
        const user = await this.userRepository.findByEmail(email);
        if(!user) throw userNotExist;

        if(user.isTwoStepVerificationEnabled) throw twoStepVerificationAlreadyEnabled;
        const verificationKey = `${this.twoStepVerification}:${email}`;
        const cachedCode = await cacheProvider.get(verificationKey);
        if(!cachedCode) throw otpExpired;
        if(cachedCode !== code) throw invalidOtp;

        const updatedUser = await this.userRepository.update(
            {email},
            {isTwoStepVerificationEnabled: true},
            {new: true}
        );
        if(!updatedUser) throw userNotExist;
        await cacheProvider.del(verificationKey);
        return updatedUser;
    }

    login = async(loginDto: LoginDTO)=>{
        const loginAttemptKey = `${loginDto.email}:login`;
        const cachedAttempt = await cacheProvider.get(loginAttemptKey);
        if(cachedAttempt === '0') throw loginTemporarilyLocked;

        const user = await this.userRepository.getOne({email: loginDto.email});
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
            const verificationKey = `${this.twoStepVerification}:login:${loginDto.email}`;
            await cacheProvider.set(verificationKey, code, toSeconds(1, 'minutes'));
            await this.mailProvider.send(
                loginDto.email,
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
        const user = await userRepository.findByEmail(sendOtpDto.email);
        if(!user) throw userNotExist
        const code = generateOTPCode();

        await cacheProvider.set(`${this.sendOtpkey}${user._id.toString()}`,code,toSeconds(3,'minutes'));
        await mailjetProvider.send(sendOtpDto.email,'new otp', `<p>Your new Otp is: ${code}</p>`);
    }

    loginWithGoogle = async (idToken:string)=>{
        const payload = await verifyGoogleToken(idToken);
        if(!payload?.email || payload.email_verified !== true) {
            throw new AppError('Google account must have a verified email',403);
        }
        const email = payload.email.trim().toLowerCase();
        let user = await this.userRepository.findByEmail(email);

        if(!user){
            user = await this.userRepository.create({
                userName: payload.name?.trim() || email.split('@')[0],
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
            !Types.ObjectId.isValid(payload.id)
        ) {
            throw new AppError('Invalid refresh token',401);
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
}

export default new AuthService();