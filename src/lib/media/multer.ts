import multer,{diskStorage} from "multer";

export function multerUpload(){
    return multer({storage:diskStorage({})})
}

export function multerUploadSingle(fileName:string){
    return multerUpload().single(fileName)
}

export function multerUploadArray(fieldName:string,maxCount:number){
    return multerUpload().array(fieldName,maxCount);
}