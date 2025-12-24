import * as amqp from 'amqplib'
export class RabbitMQConnection {
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null
  private url: string
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isConnecting = false
  constructor(url?: string) {
    this.url = url || process.env.RABBITMQ_URL || 'amqp://blastmail:admin@localhost:5672'
  }
  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('Connection attempt already in progress...')
      return
    }
    if (this.connection && this.channel) {
      console.log(' Already connected to RabbitMQ')
      return
    }
    try {
      this.isConnecting = true
      console.log('Connecting to RabbitMQ...')
      // @ts-ignore
      this.connection = await amqp.connect(this.url)
      // @ts-ignore
      this.channel = await this.connection.createChannel()
      if (this.channel) {
        await this.channel.prefetch(10)
      }

      console.log('Connected to RabbitMQ successfully')

      if (this.connection) {
        this.connection.on('error', (err: Error) => {
          console.error('RabbitMQ connection error:', err)
          this.handleDisconnect()
        })
      }

      if (this.connection) {
        this.connection.on('close', () => {
          console.warn('RabbitMQ connection closed')
          this.handleDisconnect()
        })
      }

      this.isConnecting = false
    } catch (error) {
      this.isConnecting = false
      console.error('Failed to connect to RabbitMQ:', error)
      this.scheduleReconnect()
      throw error
    }
  }

  private handleDisconnect(): void {
    this.cleanup()
    this.scheduleReconnect()
  }

  private cleanup(): void {
    if (this.channel) {
      this.channel = null
    }
    if (this.connection) {
      this.connection = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return

    console.log('Scheduling reconnect in 5 seconds...')
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null
      try {
        await this.connect()
      } catch (error) {
        console.error('Reconnect failed:', error)
      }
    }, 5000)
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.')
    }
    return this.channel
  }

  async close(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    try {
      if (this.channel) {
        await this.channel.close()
      }
      if (this.connection) {
        // @ts-ignore
        await this.connection.close()
      }
      console.log('RabbitMQ connection closed')
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error)
    } finally {
      this.cleanup()
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null
  }
}
