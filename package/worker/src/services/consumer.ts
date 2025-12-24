import { query } from '@blastmail/db'
import { EmailQueueMessage } from '@blastmail/types'
import { QueueManager, QUEUES } from '@blastmail/rabbitmq'
import { RateLimiter } from '@blastmail/redis'
import { EmailService } from './emailservice'
import { ConsumeMessage } from 'amqplib'

export class ConsumerService {
  private queueManager: QueueManager
  private rateLimiter: RateLimiter
  private emailService: EmailService
  private isRunning: boolean

  constructor(queueManager: QueueManager, rateLimiter: RateLimiter, emailService: EmailService) {
    this.queueManager = queueManager
    this.rateLimiter = rateLimiter
    this.emailService = emailService
    this.isRunning = false
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Consumer is already running')
      return
    }

    this.isRunning = true
    console.log('Starting email consumer...')

    try {
      await this.queueManager.consume(QUEUES.EMAIL_DELIVERY, async (message: ConsumeMessage) => {
        try {
          const rawContent = message.content.toString()
          let parsedData
          try {
            parsedData = JSON.parse(rawContent)
          } catch (parseError) {
            console.error('Failed to parse JSON:', parseError)
            console.error('Raw content:', rawContent)
            return
          }
          let emailMessage: EmailQueueMessage
          if (parsedData.type === 'Buffer' && Array.isArray(parsedData.data)) {
            console.log('DEBUG: Found wrapped Buffer, extracting...')
            const actualBuffer = Buffer.from(parsedData.data)
            const actualContent = actualBuffer.toString('utf-8')
            emailMessage = JSON.parse(actualContent)
          } else {
            emailMessage = parsedData
          }

          console.log('PARSED EMAIL MESSAGE:', {
            email: emailMessage.email,
            campaignId: emailMessage.campaignId,
            subscriberId: emailMessage.subscriberId,
            subject: emailMessage.subject?.substring(0, 50),
          })

          await this.processEmailMessage(emailMessage)
        } catch (error) {
          console.error('Failed to parse message:', error)
          console.error('Raw message:', message.content.toString())
        }
      })
      console.log('Email consumer started successfully')
    } catch (error) {
      this.isRunning = false
      console.error('Failed to start email consumer:', error)
      throw error
    }
  }

  private async processEmailMessage(message: EmailQueueMessage): Promise<void> {
    const startTime = Date.now()
    console.log(`Processing email to ${message.email}...`)

    try {
      await this.rateLimiter.waitForSlot('email_sending')
      const result = await this.emailService.sendEmail(message)
      await this.logEmail(message, result)

      const duration = Date.now() - startTime
      console.log(`Email processed in ${duration}ms`)
    } catch (error) {
      console.error(`Error processing email to ${message.email}:`, error)
      await this.logEmail(message, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error',
      })
    }
  }

  private async logEmail(
    message: EmailQueueMessage,
    result: { success: boolean; messageId?: string; error?: string }
  ): Promise<void> {
    try {
      if (!message.campaignId) {
        console.warn('campaignId is missing, cannot log')
        return
      }

      if (!message.subscriberId) {
        console.warn('subscriberId is missing, logging with null')
      }

      await query(
        `INSERT INTO campaign_logs (campaign_id, subscriber_id, status, message_id, error_message)
                 VALUES ($1, $2, $3, $4, $5)`,
        [
          message.campaignId,
          message.subscriberId,
          result.success ? 'sent' : 'failed',
          result.messageId || null,
          result.error || null,
        ]
      )

      console.log(`Email logged: ${result.success ? 'sent' : 'failed'}`)
    } catch (error) {
      console.error('Failed to log email:', {
        error: error,
        campaignId: message.campaignId,
        subscriberId: message.subscriberId,
      })
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false
    console.log(' Consumer stopped')
  }

  isConsumerRunning(): boolean {
    return this.isRunning
  }
}
