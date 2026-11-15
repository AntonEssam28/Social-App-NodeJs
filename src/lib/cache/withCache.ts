import { NextFunction,Request,Response } from "express";
import {cacheProvider} from "./init"

export function withCache(ttl = 3600) {
    return async (req:Request,res:Response,next:NextFunction) =>{
        //request >> check if data exist in cache >> if exist >> return data from cache >> else >> next() >> controller >> service >> db >> return data to controller >> set data in cache
        //method + url
        let key = `${req.method}:${req.originalUrl}`;
        const cached = await cacheProvider.get(key);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(JSON.parse(cached));
        }

        const originalJson = res.json.bind(res);

        res.json = ((body) =>{
            //1.cache body
            cacheProvider.set(key,JSON.stringify(body),ttl);
            //2.send response
            res.setHeader('X-Cache', 'MISS');
            return originalJson(body); //cache + res.json >> cache + res.json >> res.json >> send response to client
        });
        next();
    }
}
