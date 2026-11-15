import {IUser} from "../interface/user.interface";
import {User, UserDocument} from "../model/user.model";
import {AbstractRepository} from "../../../lib/db/abstract.repository";
import { HydratedDocument } from "mongoose";


//T>>IUser
//model>>User

class userRepository extends AbstractRepository<IUser>{

    constructor(){
        super(User)
    }
    
    async findByEmail(email:string):Promise<UserDocument| null>{
        return User.findOne({email:email})
    }
}

//singleton
export default new userRepository();
