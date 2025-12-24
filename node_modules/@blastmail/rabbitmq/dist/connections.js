"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQConnection = void 0;
const amqp = __importStar(require("amqplib"));
class RabbitMQConnection {
    connection = null;
    channel = null;
    url;
    reconnectTimeout = null;
    isConnecting = false;
    constructor(url) {
        this.url = url || process.env.RABBITMQ_URL || 'amqp://blastmail:admin@localhost:5672';
    }
    async connect() {
        if (this.isConnecting) {
            console.log('Connection attempt already in progress...');
            return;
        }
        if (this.connection && this.channel) {
            console.log(' Already connected to RabbitMQ');
            return;
        }
        try {
            this.isConnecting = true;
            console.log('Connecting to RabbitMQ...');
            // @ts-ignore
            this.connection = await amqp.connect(this.url);
            // @ts-ignore
            this.channel = await this.connection.createChannel();
            if (this.channel) {
                await this.channel.prefetch(10);
            }
            console.log('Connected to RabbitMQ successfully');
            if (this.connection) {
                this.connection.on('error', (err) => {
                    console.error('RabbitMQ connection error:', err);
                    this.handleDisconnect();
                });
            }
            if (this.connection) {
                this.connection.on('close', () => {
                    console.warn('RabbitMQ connection closed');
                    this.handleDisconnect();
                });
            }
            this.isConnecting = false;
        }
        catch (error) {
            this.isConnecting = false;
            console.error('Failed to connect to RabbitMQ:', error);
            this.scheduleReconnect();
            throw error;
        }
    }
    handleDisconnect() {
        this.cleanup();
        this.scheduleReconnect();
    }
    cleanup() {
        if (this.channel) {
            this.channel = null;
        }
        if (this.connection) {
            this.connection = null;
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimeout)
            return;
        console.log('Scheduling reconnect in 5 seconds...');
        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            try {
                await this.connect();
            }
            catch (error) {
                console.error('Reconnect failed:', error);
            }
        }, 5000);
    }
    getChannel() {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not initialized. Call connect() first.');
        }
        return this.channel;
    }
    async close() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                // @ts-ignore
                await this.connection.close();
            }
            console.log('RabbitMQ connection closed');
        }
        catch (error) {
            console.error('Error closing RabbitMQ connection:', error);
        }
        finally {
            this.cleanup();
        }
    }
    isConnected() {
        return this.connection !== null && this.channel !== null;
    }
}
exports.RabbitMQConnection = RabbitMQConnection;
//# sourceMappingURL=connections.js.map