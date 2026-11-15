import {HydratedDocument, Schema} from 'mongoose';
import {model} from 'mongoose';
import {Provider,Gender} from '../../auth/enum';
import {IUser} from '../interface/user.interface';


export type UserDocument = HydratedDocument<IUser>;

const schema = new Schema<IUser>({
    userName:{
        type:String,
        required:true,
        trim:true,
        minlength:3,
        maxlength:20
    },
    email:{
        type:String,
        required:true,
        trim:true,
        unique:true,
        minlength:3,
        toLowercase:true
    },
    password:{
        type:String,
        required:function(this) {
            return this.provider === Provider.LOCAL
        },
        trim:true,
    },
    provider:{
        type:Number,
        default:Provider.LOCAL,
        enum:Provider
    },
    gender:{
        type:Number,
        default:Gender.MALE,
        enum:Gender
    },
    phoneNumber:{
        type:String,
        trim:true,
    },
    profilePicturePath:String,
    isTwoStepVerificationEnabled:{
        type:Boolean,
        default:false
    }
})

export const User = model('User',schema)