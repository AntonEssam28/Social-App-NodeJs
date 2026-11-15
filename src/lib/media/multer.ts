import multer,{memoryStorage} from "multer";

export function multerUpload(){
    return multer({storage:memoryStorage()})
}

export function multerUploadSingle(fileName:string){
    return multerUpload().single(fileName)
}

export function multerUploadArray(fieldName:string,maxCount:number){
    return multerUpload().array(fieldName,maxCount);
}