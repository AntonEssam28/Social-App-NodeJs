import {createTransport, Transport, Transporter} from 'nodemailer'
import { MailProvider } from './mail.interface';

interface INodeMailerConfig{
    host:string,
    port:number,
    user:string,
    pass:string,
    fromEmail:string,
}

export class NodeMailerProvider implements MailProvider{
    private client:Transporter;
    private readonly fromEmail:string;

    constructor(config:any){
        this.client = createTransport({
            host:config.host,
            port:config.port,
            secure:false,
            auth:{
                user:config.user,
                pass:config.password
            }
        });
        this.fromEmail = config.fromEmail;

    }

    async send(email:string, subject:string, html:string) {
        await this.client.sendMail({
            from:this.fromEmail,
            to:email,
            subject:subject,
            html:html
        });
}
}

