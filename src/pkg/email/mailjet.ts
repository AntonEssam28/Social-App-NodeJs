import Mailjet from 'node-mailjet';
import { MailProvider } from './mail.interface';

interface IMailConfig{
    apiKey:string;
    apiSecret:string;
    fromEmail:string;
    fromName:string
}

export class MailjetProvider implements MailProvider{
    private client:Mailjet | undefined;
    private readonly fromEmail:string;
    private readonly fromName:string;
    constructor(private readonly config:IMailConfig){
        this.fromEmail = config.fromEmail;
        this.fromName = config.fromName;
    }

    async send(email:string, subject:string, html:string) {
        if (!this.config.apiKey || !this.config.apiSecret) {
            throw new Error('Mailjet credentials are not configured');
        }
        this.client ??= new Mailjet({
            apiKey: this.config.apiKey,
            apiSecret: this.config.apiSecret,
        });
        await this.client.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: this.fromEmail,
                        Name: this.fromName,
                    },
                    To: [{ Email: email }],
                    Subject: subject,
                    HTMLPart: html,
                },
            ],
        });
}
}

