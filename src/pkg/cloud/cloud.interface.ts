//contract
//dependency injaction

import type { Request } from "express";
import type {} from "multer";

export type CloudFile = NonNullable<Request["file"]>;

export interface ICloudProvider{
    //return>>key>>URL
    uploadFile(file:CloudFile , path:string):Promise<string>;

    deleteFile(key:string):Promise<void>;

    getFile(key:string):Promise<Buffer>;
}