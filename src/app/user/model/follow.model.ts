import { model, Schema, Types } from "mongoose";

export type FollowStatus = "pending" | "accepted";

export interface IFollow {
    followerId: Types.ObjectId;
    followeeId: Types.ObjectId;
    status: FollowStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

const schema = new Schema<IFollow>({
    followerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    followeeId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted"],
        required: true
    }
}, { timestamps: true });

schema.index({ followerId: 1, followeeId: 1 }, { unique: true });

export const Follow = model<IFollow>("Follow", schema);
