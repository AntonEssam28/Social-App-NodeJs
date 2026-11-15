import { IUser } from "../../app/user/interface/user.interface";
import { User } from "../../app/user/model/user.model";
import { DeleteResult, HydratedDocument, Model, QueryFilter, QueryOptions, Types } from "mongoose";

export abstract class AbstractRepository<T> {
    protected constructor(private readonly model:Model<T>){

    }
    async create(data:T): Promise<HydratedDocument<T>>{
        return this.model.create(data)
    }
    
    async update(filter:QueryFilter<T>,newData:Partial<T>,options?:QueryOptions<T>): Promise<HydratedDocument<T> | null>{
        return this.model.findOneAndUpdate(filter,newData,options)
    }

    async delete(filter:QueryFilter<T>):Promise<DeleteResult | null>{
        return this.model.findOneAndDelete(filter)
    }

    async getOne(filter: QueryFilter<T>): Promise<HydratedDocument<T> | null> {
        return this.model.findOne(filter).exec();
    }
    
}