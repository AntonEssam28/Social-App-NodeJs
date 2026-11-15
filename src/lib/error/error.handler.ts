import { NextFunction,Response,Request } from "express";
import { AppError } from "./error";

export function globalErrorHandler(err:AppError, req:Request, res:Response, _next:NextFunction) {

    if (err.isOperational === true) {
        return res.status(err.statusCode).json({
            message: err.message,
            success: false,
            stack: err.stack,

        });
    }

    return res.status(500).json({
        error: 'Something went wrong',
        success: false,
    });
}