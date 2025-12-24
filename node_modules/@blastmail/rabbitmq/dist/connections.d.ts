import * as amqp from 'amqplib';
export declare class RabbitMQConnection {
    private connection;
    private channel;
    private url;
    private reconnectTimeout;
    private isConnecting;
    constructor(url?: string);
    connect(): Promise<void>;
    private handleDisconnect;
    private cleanup;
    private scheduleReconnect;
    getChannel(): amqp.Channel;
    close(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=connections.d.ts.map