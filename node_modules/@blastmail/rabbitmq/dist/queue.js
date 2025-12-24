"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
class QueueManager {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async assertQueue(config) {
        const channel = await this.connection.getChannel();
        const options = {
            durable: config.durable ?? true,
            deadLetterExchange: config.deadLetterExchange,
            messageTtl: config.messageTtl,
        };
        await channel.assertQueue(config.name);
        if (config.deadLetterExchange) {
            options.deadLetterExchange = config.deadLetterExchange;
        }
        if (config.messageTtl) {
            options.messageTtl = config.messageTtl;
        }
        await channel.assertQueue(config.name, options);
        console.log(`Queue ${config.name} asserted`);
    }
    async deleteQueue(queuename) {
        try {
            const channel = await this.connection.getChannel();
            await channel.deleteQueue(queuename);
            console.log(`Queue ${queuename} deleted`);
        }
        catch (error) {
            console.error(`Failed to delete queue ${queuename}:`, error);
        }
    }
    async publish(queuename, message) {
        const channel = await this.connection.getChannel();
        const messageBuffer = Buffer.from(JSON.stringify(message));
        return channel.sendToQueue(queuename, messageBuffer, {
            persistent: true,
        });
    }
    async consume(queuename, handler) {
        const channel = await this.connection.getChannel();
        await channel.consume(queuename, async (msg) => {
            if (!msg)
                return;
            try {
                const messageContent = JSON.parse(msg.content.toString());
                console.log(`Received message from ${queuename}:`, messageContent);
                await handler(msg);
                channel.ack(msg);
                console.log(`Message from ${queuename} processed and acknowledged.`);
            }
            catch (error) {
                console.error(`Error processing message from ${queuename}:`, error);
                channel.nack(msg, false, false);
                console.log(`Message from ${queuename} not acknowledged and requeued.`);
            }
            {
                noAck: false;
            }
        });
    }
    async getQueueMessageCount(queuename) {
        const channel = await this.connection.getChannel();
        const queueInfo = await channel.checkQueue(queuename);
        return queueInfo.messageCount;
    }
    async purgeQueue(queeuename) {
        const channel = await this.connection.getChannel();
        await channel.purgeQueue(queeuename);
        console.log(`Queue ${queeuename} purged`);
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=queue.js.map