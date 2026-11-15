import { MailjetProvider } from "../../pkg/email/mailjet";
import { NodeMailerProvider } from "../../pkg/email/nodemailer";
import {env} from "../config/env";

export const mailjetProvider = new MailjetProvider({
    apiKey:env.mailjet.apiKey,
    apiSecret:env.mailjet.apiSecret,
    fromEmail:env.mailjet.fromEmail,
    fromName:env.mailjet.fromName,
});


export const nodeMailerProvider = new NodeMailerProvider(env.nodemailer)