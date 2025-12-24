export interface QueueConfig {
  name: string
  durable?: boolean
  deadLetterExchange?: string
  messageTtl?: number
}
