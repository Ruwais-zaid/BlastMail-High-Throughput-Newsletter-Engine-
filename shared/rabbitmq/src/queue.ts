import { Channel, ConsumeMessage, Options } from 'amqplib'
import { RabbitMQConnection } from './connections'
import { QueueConfig } from './types'

export class QueueManager {
  private connection: RabbitMQConnection
  constructor(connection: RabbitMQConnection) {
    this.connection = connection
  }

  async assertQueue(config: QueueConfig): Promise<void> {
    const channel: Channel = await this.connection.getChannel()
    const options: Options.AssertQueue = {
      durable: config.durable ?? true,
    }
    if (config.deadLetterExchange) {
      options.deadLetterExchange = config.deadLetterExchange
    }
    if (config.messageTtl) {
      options.messageTtl = config.messageTtl
    }
    await channel.assertQueue(config.name, options)
    console.log(`Queue ${config.name} asserted`)
  }
  async deleteQueue(queueName: string): Promise<void> {
    try {
      const channel: Channel = await this.connection.getChannel()
      await channel.deleteQueue(queueName)
      console.log(`Queue ${queueName} deleted`)
    } catch (error) {
      console.error(`Failed to delete queue ${queueName}:`, error)
    }
  }
  async publish(queueName: string, message: Buffer): Promise<boolean> {
    try {
      const channel: Channel = await this.connection.getChannel()
      const sent = channel.sendToQueue(queueName, message, {
        persistent: true,
        contentType: 'application/json',
      })

      if (sent) {
        console.log(`Published message to "${queueName}"`)
      } else {
        console.warn(`Channel buffer full, message to "${queueName}" not sent`)
      }
      return sent
    } catch (error) {
      console.error(`Failed to publish to ${queueName}:`, error)
      return false
    }
  }

  async consume(
    queueName: string,
    handler: (message: ConsumeMessage) => Promise<void>,
    options?: { noAck?: boolean }
  ): Promise<void> {
    const channel: Channel = await this.connection.getChannel()

    await channel.consume(
      queueName,
      async (msg: ConsumeMessage | null) => {
        if (!msg) {
          console.warn(`Received null message from ${queueName}`)
          return
        }

        try {
          const messageContent = JSON.parse(msg.content.toString())
          console.log(`Received message from ${queueName}:`, {
            messageId: messageContent.campaign_id || 'unknown',
            subscriberId: messageContent.subscriber_id || 'unknown',
          })
          await handler(msg)
          if (!options?.noAck) {
            channel.ack(msg)
            console.log(`Message from ${queueName} processed and acknowledged.`)
          }
        } catch (error) {
          console.error(`Error processing message from ${queueName}:`, error)
          if (!options?.noAck) {
            channel.nack(msg, false, false)
            console.log(`Message from ${queueName} rejected`)
          }
        }
      },
      {
        noAck: options?.noAck || false,
      }
    )

    console.log(`Consuming messages from ${queueName}`)
  }
  async getQueueMessageCount(queueName: string): Promise<number> {
    try {
      const channel: Channel = await this.connection.getChannel()
      const queueInfo = await channel.checkQueue(queueName)
      return queueInfo.messageCount
    } catch (error) {
      console.error(`Failed to get message count for ${queueName}:`, error)
      throw error
    }
  }

  async purgeQueue(queueName: string): Promise<void> {
    try {
      const channel: Channel = await this.connection.getChannel()
      await channel.purgeQueue(queueName)
      console.log(`Queue ${queueName} purged`)
    } catch (error) {
      console.error(`Failed to purge queue ${queueName}:`, error)
      throw error
    }
  }

  async close(): Promise<void> {
    await this.connection.close()
  }
}
