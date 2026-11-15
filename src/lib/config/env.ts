//schema >> validate data process.env
//1.errors>> missed fiellds
//2.transform data in process.env

import { z } from "zod";
import { config } from "dotenv";
config();

const schema = z.object({
    PORT:z.string().default("3000"),

    MONGODB_URL:z.string(),

    JWT_SECRET: z.string(),

    MAIL_USER: z.string().trim().toLowerCase().default(""),
    MAIL_PASS: z.string().default(""),
    
    GOOGLE_WEB_OAUTH_CLIENT_ID: z.string().default(""),

    REDIS_HOST: z.string().default("127.0.0.1"),
    REDIS_PORT: z.string().default('6379'),
    REDIS_PASSWORD: z.string().default(""),

    MAILJET_API_KEY: z.string().default(""),
    MAILJET_API_SECRET: z.string().default(""),
    MAILJET_FROM_EMAIL: z.string().default(""),
    MAILJET_FROM_NAME: z.string().default(""),

    S3_REGION:z.string(),
    S3_BUCKET_NAME:z.string(),
    S3_SECRET_KEY:z.string(),
    S3_ACCESS_KEY:z.string(),

});

const parsed = schema.parse(process.env);

export const env = {
    PORT: Number(parsed.PORT),
    db:{
        url:parsed.MONGODB_URL
    },
    google:{
        webClientId:{
            webClientId:parsed.GOOGLE_WEB_OAUTH_CLIENT_ID,
            isClientId:parsed.GOOGLE_WEB_OAUTH_CLIENT_ID,
        }
    },
    redis:{
        host:parsed.REDIS_HOST,
        port:Number(parsed.REDIS_PORT),
        password:parsed.REDIS_PASSWORD
    },
    nodemailer:{
        user:parsed.MAIL_USER,
        password:parsed.MAIL_PASS
    },
    mailjet:{
        apiKey: parsed.MAILJET_API_KEY,
        apiSecret: parsed.MAILJET_API_SECRET,
        fromEmail: parsed.MAILJET_FROM_EMAIL,
        fromName: parsed.MAILJET_FROM_NAME,
    },
    jwt:{
        secret:parsed.JWT_SECRET
    },
    payements:{},
    aws:{
        secretKey:parsed.S3_SECRET_KEY,
        accessKey:parsed.S3_ACCESS_KEY,
        region:parsed.S3_REGION,
        bucketName:parsed.S3_BUCKET_NAME,
    },
}
