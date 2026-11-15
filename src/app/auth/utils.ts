import { TUserPayload } from './../../lib/interface/userPayload.interface';
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import {env} from "../../lib/config/env";
import { toMs, toSeconds } from "../../pkg/utils/time";
import {Response} from "express"

export async function hashPassword(password:string){
    return argon2.hash(password);
}

export async function comparePassword(password:string,hashedPassword:string){
    return argon2.verify(hashedPassword,password);
}

export function generateAccessToken(payload:TUserPayload){
    return jwt.sign(
        {...payload,jti:randomUUID(),tokenType:'access'},
        env.jwt.secret,
        {expiresIn: toSeconds(1,'hours')}
    )
}

export function generateFreshToken(payload:TUserPayload){
    return jwt.sign(
        {...payload,jti:randomUUID(),tokenType:'refresh'},
        env.jwt.secret,
        {expiresIn:toSeconds(7,'days')}
    )
}

export function setCookies(res:Response,accessToken:string,refreshToken:string){
    res.cookie('access_token',accessToken,{
        httpOnly:true,
        maxAge:toMs(1,'hours')
    })
    res.cookie('refresh_token',refreshToken,{
        httpOnly:true,
        maxAge:toMs(7,'days'),
        path:'/api/auth'
    })
}