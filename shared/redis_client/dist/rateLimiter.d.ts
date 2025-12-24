import { RedisClientType } from "redis";
export declare class RateLimiter {
    private client;
    private maxRequests;
    private windowMs;
    constructor(client: RedisClientType, maxRequests: number, windowMs: number);
    checkLimit(key: string): Promise<{
        allowed: boolean;
        waitTime: number;
    }>;
    waitForSlot(key: string): Promise<void>;
}
//# sourceMappingURL=rateLimiter.d.ts.map