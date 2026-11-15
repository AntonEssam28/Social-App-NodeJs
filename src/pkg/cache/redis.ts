import Redis from 'ioredis';
import { ICacheProvider } from './cache.interface';

interface IRedisConfig{
    host:string,
    port:number,
    password:string
}

export class RedisCacheProvider implements ICacheProvider {
    private readonly client:any;

    constructor(config:IRedisConfig){
        this.client = new Redis({
            host: config.host,
            port: Number(config.port),
            password: config.password,
            lazyConnect: true,
            maxRetriesPerRequest: 3
        });
            this.client.on('error', (err:Error) => console.error('Redis server error:', err.message));
            this.client.connect().catch((err:Error)=>console.log('Error connecting to Redis',err.message)); //connct to server // .catch()>>3shyan lw server el cache down server el BE myo23sh
    };
    async set(key:string,value:string,ttl:number){
        return this.client.set(key, value, 'EX', ttl);
    }
    async get(key:string){
        return this.client.get(key);
    }
    async incrementWithExpiry(key:string, ttl:number){
        return this.client.eval(
            "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
            1,
            key,
            ttl,
        );
    }
    async ttl(key:string){
        return this.client.ttl(key);
    }
    async del(key:string){
        return this.client.del(key);
    }
}
