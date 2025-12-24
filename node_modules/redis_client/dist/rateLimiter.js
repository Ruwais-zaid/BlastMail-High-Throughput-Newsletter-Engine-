"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    client;
    maxRequests;
    windowMs;
    constructor(client, maxRequests, windowMs) {
        this.client = client;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    async checkLimit(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        try {
            await this.client.zRemRangeByScore(key, 0, windowStart);
            const count = await this.client.zCard(key);
            if (count < this.maxRequests) {
                await this.client.zAdd(key, { score: now, value: `${now}` });
                await this.client.expire(key, Math.ceil(this.windowMs / 1000) + 1);
                return { allowed: true, waitTime: 0 };
            }
            else {
                const oldest = await this.client.zRange(key, 0, 0, { REV: false });
                if (oldest.length > 0) {
                    const oldestScore = await this.client.zScore(key, oldest[0]);
                    if (oldestScore !== null) {
                        const waitTime = Math.max(0, (oldestScore + this.windowMs) - now);
                        return { allowed: false, waitTime: Math.ceil(waitTime) };
                    }
                }
                return { allowed: false, waitTime: this.windowMs };
            }
        }
        catch (error) {
            console.error('Rate limiter error:', error);
            return { allowed: true, waitTime: 0 };
        }
    }
    async waitForSlot(key) {
        const result = await this.checkLimit(key);
        if (!result.allowed && result.waitTime > 0) {
            console.log(`Rate limit reached, waiting for ${result.waitTime} ms....`);
            await new Promise(resolve => setTimeout(resolve, result.waitTime));
            return this.waitForSlot(key);
        }
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map