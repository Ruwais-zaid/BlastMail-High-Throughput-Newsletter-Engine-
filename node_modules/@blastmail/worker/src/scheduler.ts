import { query } from '@blastmail/db'
import { Campaigns, EmailQueueMessage, Subscribers } from '@blastmail/types'
import { QueueManager, QUEUES } from '@blastmail/rabbitmq'

export class SchedulerService {
  private queueManager: QueueManager

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager
  }

  async processScheduledCampaigns(): Promise<void> {
    console.log('Checking for scheduled campaigns...')
    try {
      const campaigns: Campaigns[] = await query(`
        SELECT id, subject, body_html, scheduled_at
        FROM campaigns
        WHERE status = 'scheduled'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC 
        LIMIT 10
      `)

      if (campaigns.length === 0) {
        console.log('No scheduled campaigns found.')
        return
      }

      console.log(`Found ${campaigns.length} campaign(s) to process.`)

      for (const campaign of campaigns) {
        await this.queueCampaign(campaign)
      }
    } catch (error) {
      console.error('Error processing scheduled campaigns:', error)
    }
  }

  private async queueCampaign(campaign: Campaigns): Promise<void> {
    console.log(`Queuing campaign ID ${campaign.id} | Subject: "${campaign.subject}"`)

    let transactionCompleted = false

    try {
      await query('BEGIN')

      const updateResult = await query(
        `UPDATE campaigns SET status = 'sending', updated_at = NOW()
         WHERE id = $1 AND status = 'scheduled' RETURNING id`,
        [campaign.id]
      )

      if (updateResult.length === 0) {
        console.log(`Campaign ID ${campaign.id} was already processed by another worker.`)
        await query('ROLLBACK')
        return
      }

      const subscribers: Subscribers[] = await query(`
        SELECT id, email FROM subscribers WHERE status = 'subscribed'
      `)

      if (subscribers.length === 0) {
        console.warn('No subscribers found.')
        await query(`UPDATE campaigns SET status = 'failed', updated_at = NOW() WHERE id = $1`, [
          campaign.id,
        ])
        await query('COMMIT')
        transactionCompleted = true
        return
      }

      console.log(`${subscribers.length} subscriber(s) found.`)

      const batchSize = 100
      let queuedCount = 0

      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        let batchQueued = 0

        for (const sub of batch) {
          const message: EmailQueueMessage = {
            email: sub.email,
            campaignId: campaign.id,
            subscriberId: sub.id,
            subject: campaign.subject,
            bodyHtml: campaign.body_html,
            queuedAt: new Date().toISOString(),
          }
          console.log('DEBUG: Creating message for:', {
            email: sub.email,
            campaignId: campaign.id,
            subscriberId: sub.id,
            subject: campaign.subject.substring(0, 50) + '...',
          })
          const publishResult = await this.queueManager.publish(
            QUEUES.EMAIL_DELIVERY,
            Buffer.from(JSON.stringify(message))
          )

          if (publishResult) {
            queuedCount++
            batchQueued++
          } else {
            console.error('FAILED: Check RabbitMQ connection')
            throw new Error('Failed to publish message')
          }
        }

        console.log(
          `Batch ${batchNumber}: ${batchQueued}/${batch.length} queued ` +
            `(Total: ${queuedCount}/${subscribers.length})`
        )

        if (i + batchSize < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      console.log(`Campaign ${campaign.id} queued successfully (${queuedCount} emails)`)

      if (queuedCount === 0) {
        console.error(`No emails queued for campaign ${campaign.id}. Marking as failed.`)
        await query(`UPDATE campaigns SET status = 'failed', updated_at = NOW() WHERE id = $1`, [
          campaign.id,
        ])
      }

      await query('COMMIT')
      transactionCompleted = true
    } catch (error) {
      console.error(`Failed to queue campaign ID ${campaign.id}:`, error)

      if (!transactionCompleted) {
        try {
          await query('ROLLBACK')
        } catch (rollbackError) {
          console.error('Error during transaction rollback:', rollbackError)
        }
      }

      try {
        await query(`UPDATE campaigns SET status = 'failed', updated_at = NOW() WHERE id = $1`, [
          campaign.id,
        ])
      } catch (updateError) {
        console.error('Error updating campaign status to failed:', updateError)
      }
    }
  }
  async updateCompletedCampaign(): Promise<void> {
    console.log('Checking for completed campaigns...')

    try {
      const campaigns = await query(`
      SELECT 
        c.id,
        c.subject,
        COUNT(DISTINCT s.id) as total_subscribers_for_campaign,
        COUNT(DISTINCT cl.id) as sent_logs_count
      FROM campaigns c 
      CROSS JOIN (SELECT id FROM subscribers WHERE status = 'subscribed') s
      LEFT JOIN campaign_logs cl ON cl.campaign_id = c.id 
        AND cl.subscriber_id = s.id 
        AND cl.status = 'sent'
      WHERE c.status = 'sending'
      GROUP BY c.id, c.subject
      HAVING COUNT(DISTINCT cl.id) >= COUNT(DISTINCT s.id)
        AND COUNT(DISTINCT s.id) > 0
    `)

      for (const campaign of campaigns) {
        try {
          const updateResult = await query(
            `UPDATE campaigns SET status = 'sent', updated_at = NOW()
           WHERE id = $1 AND status = 'sending' RETURNING id`,
            [campaign.id]
          )

          if (updateResult.length > 0) {
            console.log(
              `Campaign ${campaign.id} marked as SENT ` +
                `(${campaign.sent_logs_count}/${campaign.total_subscribers_for_campaign} emails sent)`
            )
          }
        } catch (error) {
          console.error(`Failed to mark campaign ID ${campaign.id} as sent:`, error)
        }
      }

      console.log(`Checked ${campaigns.length} completed campaign(s).`)
    } catch (error) {
      console.error('Error updating completed campaigns:', error)
    }
  }
}
