import {Provider,Gender} from '../../auth/enum';
import { Types } from 'mongoose';

export interface IUser{
    _id?: Types.ObjectId;
    userName:string;
    email:string;
    password?:string;
    provider:Provider;
    gender:Gender;
    phoneNumber?:string;
    isVerified?:boolean;
    isDeleted?:boolean
    isTwoStepVerificationEnabled?:boolean;
    profilePicturePath?:string
}
