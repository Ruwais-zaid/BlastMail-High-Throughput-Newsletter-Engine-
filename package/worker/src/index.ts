import dotenv from 'dotenv'
import cron from 'node-cron'
import { RabbitMQConnection, QueueManager, QUEUES } from '@blastmail/rabbitmq'
import { SchedulerService } from './scheduler'
import { RedisConnection, RateLimiter } from '@blastmail/redis'
import { ConsumerService } from './services/consumer'
import { EmailService } from './services/emailservice'

dotenv.config()

class WorkerService {
  private rabbitMQConnection: RabbitMQConnection
  private queueManager: QueueManager
  private schedulerService: SchedulerService
  private consumerService!: ConsumerService
  private emailService!: EmailService
  private rateLimiter!: RateLimiter
  private redisConnection: RedisConnection
  private isRunning: boolean

  constructor() {
    this.rabbitMQConnection = new RabbitMQConnection()
    this.redisConnection = new RedisConnection()
    this.queueManager = new QueueManager(this.rabbitMQConnection)
    this.schedulerService = new SchedulerService(this.queueManager)
    this.emailService = new EmailService()
    this.isRunning = false
  }

  async initServices(): Promise<void> {
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '5')
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000')
    const client = await this.redisConnection.getClient()

    if (!client) {
      throw new Error('Redis client is not connected')
    }
    this.rateLimiter = new RateLimiter(client, maxRequests, windowMs)
    console.log(`Rate Limiter initialized: ${maxRequests} emails per ${windowMs}ms\n`)
    this.consumerService = new ConsumerService(
      this.queueManager,
      this.rateLimiter,
      this.emailService
    )
  }

  async start(): Promise<void> {
    console.log('Starting Worker Service...')
    try {
      await this.rabbitMQConnection.connect()
      console.log('RabbitMQ connected')

      await this.redisConnection.connect()
      console.log('Redis connected')

      await this.initServices()
      console.log('Services initialized')

      await this.cleanupExistingQueues()
      console.log('Queues cleaned up')

      await this.assertQueues()
      console.log('Queues asserted')
      console.log('Verifying SMTP connection...')
      const smtpOk = await this.emailService.verifyConnection()
      if (!smtpOk) {
        console.warn('SMTP verification failed, but continuing... \n ')
      } else {
        console.log('SMTP connection verified')
      }

      if (!this.consumerService) {
        throw new Error('ConsumerService is not initialized')
      }

      console.log('Starting consumer service...')
      await this.consumerService.start()
      console.log('Consumer service started')

      this.startScheduledTasks()
      console.log('✓ Scheduled tasks started')

      console.log('\nWorker Service started successfully.')
      console.log('Status: Waiting for scheduled campaigns...')
    } catch (error) {
      console.error('Failed to start Worker Service:', error)
      process.exit(1)
    }
  }

  private async cleanupExistingQueues(): Promise<void> {
    console.log('Cleaning up existing queues...')

    try {
      await this.queueManager.deleteQueue(QUEUES.EMAIL_DELIVERY)
      console.log(`Deleted queue: ${QUEUES.EMAIL_DELIVERY}`)
    } catch (error) {
      console.log(`Queue ${QUEUES.EMAIL_DELIVERY} doesn't exist or couldn't be deleted`)
    }

    try {
      await this.queueManager.deleteQueue(QUEUES.EMAIL_DLQ)
      console.log(`Deleted queue: ${QUEUES.EMAIL_DLQ}`)
    } catch (error) {
      console.log(`Queue ${QUEUES.EMAIL_DLQ} doesn't exist or couldn't be deleted`)
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  private async assertQueues(): Promise<void> {
    console.log('Setting up queues...')
    console.log('Creating main queue WITHOUT TTL (temporary)...')
    await this.queueManager.assertQueue({
      name: QUEUES.EMAIL_DELIVERY,
      durable: true,
    })

    await this.queueManager.assertQueue({
      name: QUEUES.EMAIL_DLQ,
      durable: true,
    })

    console.log('Queues setup complete.')
  }

  private startScheduledTasks(): void {
    console.log('Starting scheduled tasks...')
    cron.schedule('*/1 * * * *', async () => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] Running scheduled campaign processor...`)

      try {
        await this.schedulerService.processScheduledCampaigns()
        await this.schedulerService.updateCompletedCampaign()

        const queueLength = await this.queueManager.getQueueMessageCount(QUEUES.EMAIL_DELIVERY)
        console.log(`${queueLength} messages pending in email delivery queue.`)
      } catch (error) {
        console.error('Error in scheduled task:', error)
      }
    })

    console.log('Scheduled tasks started.\n')
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Worker Service...')
    if (this.consumerService) {
      await this.consumerService.stop()
    }
    await this.rabbitMQConnection.close()
    await this.redisConnection.close()
    process.exit(0)
  }
}

const worker = new WorkerService()

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT signal')
  await worker.shutdown()
})

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM signal')
  await worker.shutdown()
})

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

worker.start().catch(error => {
  console.error('Error starting Worker Service:', error)
  process.exit(1)
})
