import { RedisClientType, createClient } from 'redis'

export class RedisConnection {
  private client?: RedisClientType
  private url: string

  constructor(url?: string) {
    this.url = url || 'redis://localhost:6379'
  }

  async connect(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      console.log('Redis client already connected')
      return this.client
    }
    try {
      console.log('Connecting to Redis server at', this.url)
      this.client = createClient({ url: this.url })
      this.client.on('error', err => console.error('Redis Client Error', err))
      this.client.on('reconnecting', () => {
        console.log('Reconnecting to Redis server...')
      })
      await this.client.connect()
      console.log('Connected to Redis server')
      return this.client
    } catch (error) {
      console.error('Failed to connect to Redis server:', error)
      throw error
    }
  }

  getClient(): RedisClientType | undefined {
    if (!this.client || !this.client?.isOpen) {
      console.log('Redis client not connected. Call connect() first.')
    }
    return this.client
  }
  async close(): Promise<RedisClientType | void> {
    if (this.client && this.client?.isOpen) {
      await this.client.quit()
      console.log('Redis client disconnected')
    }
  }
}
