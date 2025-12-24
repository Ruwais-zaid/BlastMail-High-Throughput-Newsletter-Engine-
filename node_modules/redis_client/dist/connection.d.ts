import { RedisClientType } from 'redis';
export declare class RedisConnection {
    private client;
    private url;
    constructor(url?: string);
    connect(): Promise<RedisClientType>;
    getClient(): Promise<RedisClientType | null>;
    close(): Promise<RedisClientType | void>;
}
//# sourceMappingURL=connection.d.ts.map