import {Gender} from "../enum";

//contracts
export interface RegisterDTO{
    name:string;
    email:string;
    password:string;
    phoneNumber?:string;
    gender?:Gender
}

export interface LoginDTO{
    email:string;
    password:string;
}

export interface sendOtpDto{
    email:string;
}

export interface verifyAccountDto{
    email:string;
    code:string;
}

export interface forgotPasswordDto{
    email:string;
    code:string;
    newPassword:string;
}