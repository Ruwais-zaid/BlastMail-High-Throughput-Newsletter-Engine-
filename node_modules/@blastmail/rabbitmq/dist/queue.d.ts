import { ConsumeMessage } from 'amqplib';
import { RabbitMQConnection } from './connections';
import { QueueConfig } from './types';
export declare class QueueManager {
    private connection;
    constructor(connection: RabbitMQConnection);
    assertQueue(config: QueueConfig): Promise<void>;
    deleteQueue(queuename: string): Promise<void>;
    publish(queuename: string, message: Buffer): Promise<boolean>;
    consume(queuename: string, handler: (message: ConsumeMessage) => Promise<void>): Promise<void>;
    getQueueMessageCount(queuename: string): Promise<number>;
    purgeQueue(queeuename: string): Promise<void>;
}
//# sourceMappingURL=queue.d.ts.map