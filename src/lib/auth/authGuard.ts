import { AppError } from "../error/error";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { NextFunction,Response,Request } from "express";
import { TUserPayload } from "../interface/userPayload.interface";
import { cacheProvider } from "../cache/init";
import { Types } from "mongoose";


export async function authGuard(req:Request,res:Response,next:NextFunction){
try{
    const token = req.cookies?.access_token;
    if(!token)  throw new AppError('No token provided' , 403)
    const payload = jwt.verify(token,env.jwt.secret);
    if(typeof payload === 'string' || payload.tokenType !== 'access' || typeof payload.id !== 'string' || typeof payload.jti !== 'string' || !Types.ObjectId.isValid(payload.id)) {
        throw new AppError('Invalid access token',401);
    }
    if(await cacheProvider.get(`revoked-token:${payload.jti}`)) {
        throw new AppError('Access token has been revoked',401);
    }
    req.user = payload as TUserPayload;
    next()
    
}catch(error){
    next(error)
}
}