"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisConnection = void 0;
const redis_1 = require("redis");
class RedisConnection {
    client = null;
    url;
    constructor(url) {
        this.url = url || 'redis://localhost:6379';
    }
    async connect() {
        if (this.client?.isOpen) {
            console.log('Redis client already connected');
            return this.client;
        }
        try {
            console.log('Connecting to Redis server at', this.url);
            this.client = (0, redis_1.createClient)({ url: this.url });
            this.client.on('error', (err) => console.error('Redis Client Error', err));
            this.client.on('reconnecting', () => {
                console.log('Reconnecting to Redis server...');
            });
            await this.client.connect();
            console.log('Connected to Redis server');
            return this.client;
        }
        catch (error) {
            console.error('Failed to connect to Redis server:', error);
            throw error;
        }
    }
    getClient() {
        if (!this.client || !this.client?.isOpen) {
            console.log('Redis client not connected. Call connect() first.');
        }
        return Promise.resolve(this.client);
    }
    async close() {
        if (this.client && this.client?.isOpen) {
            await this.client.quit();
            console.log('Redis client disconnected');
        }
    }
}
exports.RedisConnection = RedisConnection;
//# sourceMappingURL=connection.js.map