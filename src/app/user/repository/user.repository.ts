import {IUser} from "../interface/user.interface";
import {User, UserDocument} from "../model/user.model";
import {AbstractRepository} from "../../../lib/db/abstract.repository";
import { HydratedDocument, Types } from "mongoose";


//T>>IUser
//model>>User

class userRepository extends AbstractRepository<IUser>{

    constructor(){
        super(User)
    }
    
    async findByEmail(email:string):Promise<UserDocument| null>{
        return User.findOne({email:email})
    }

    searchByUserName(query:string,excludeUserId:Types.ObjectId,excludedIds:Types.ObjectId[] = []){
        return User.find({
            _id: {$nin:[excludeUserId,...excludedIds]},
            userName: {$regex:query,$options:"i"}
        })
            .select("_id userName profilePicturePath isPrivate")
            .limit(20)
            .lean();
    }

    findBasicProfiles(userIds:Types.ObjectId[]){
        return User.find({_id:{$in:userIds}})
            .select("_id userName profilePicturePath")
            .lean();
    }
}

//singleton
export default new userRepository();
