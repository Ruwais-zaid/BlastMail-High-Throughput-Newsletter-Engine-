export const QUEUES = {
  EMAIL_DELIVERY: 'email_delivery',
  EMAIL_DLQ: 'email_delivery_dlq',
} as const

export * from './connections'
export * from './queue'
export * from './types'
