import { query } from '@blastmail/db'
import { CampaignAnalytics } from '../types/analyticsTypes'

export class AnalyticsService {
  async getCampaignAnalytics(campaignId: number): Promise<CampaignAnalytics | null> {
    const sql = `
        WITH campaign_data AS (
    SELECT 
        c.id,
        c.subject, 
        c.status,
        c.scheduled_at,
        c.created_at,
        (SELECT COUNT(*) FROM subscribers WHERE status = 'subscribed') as total_subscribers
    FROM campaigns c
    WHERE c.id = $1
),
log_stats AS (
    SELECT 
        campaign_id,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count
    FROM campaign_logs 
    WHERE campaign_id = $1
    GROUP BY campaign_id
),
tracking_stats AS (
    SELECT 
        campaign_id,
        COUNT(DISTINCT subscriber_id) as unique_opens,
        COUNT(*) as total_opens
    FROM tracking_events
    WHERE campaign_id = $1 AND event_type = 'opened'
    GROUP BY campaign_id
)
SELECT 
    cd.id as campaign_id,
    cd.subject,
    cd.status,
    cd.total_subscribers,
    COALESCE(ls.sent_count,0) as emails_sent,
    COALESCE(ls.failed_count,0) as emails_failed,
    COALESCE(ts.unique_opens,0) as unique_opens,
    COALESCE(ts.total_opens,0) as total_opens,
    CASE 
        WHEN COALESCE(ls.sent_count,0) > 0
        THEN ROUND((COALESCE(ts.unique_opens,0)::numeric / ls.sent_count::numeric) * 100, 2)
        ELSE 0
    END as open_rate,
    cd.scheduled_at,
    cd.created_at
FROM campaign_data cd
LEFT JOIN log_stats ls ON cd.id = ls.campaign_id
LEFT JOIN tracking_stats ts ON cd.id = ts.campaign_id`

    const rows = await query<CampaignAnalytics>(sql, [campaignId])
    return rows.length > 0 ? rows[0] : null
  }

  async getAllCampaignsAnalytics(): Promise<CampaignAnalytics[]> {
    const sql = `
      WITH campaign_data AS (
        SELECT 
          c.id,
          c.subject,
          c.status,
          c.scheduled_at,
          c.created_at,
          COUNT(DISTINCT s.id) as total_subscribers
        FROM campaigns c
        CROSS JOIN subscribers s
        WHERE s.status = 'subscribed'
        GROUP BY c.id
      ),
      log_stats AS (
        SELECT
          campaign_id,
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count
        FROM campaign_logs
        GROUP BY campaign_id
      ),
      tracking_stats AS (
        SELECT
          campaign_id,
          COUNT(DISTINCT subscriber_id) as unique_opens,
          COUNT(*) as total_opens
        FROM tracking_events
        WHERE event_type = 'opened'
        GROUP BY campaign_id
      )
      SELECT 
        cd.id as campaign_id,
        cd.subject,
        cd.status,
        cd.total_subscribers,
        COALESCE(ls.sent_count, 0) as emails_sent,
        COALESCE(ls.failed_count, 0) as emails_failed,
        COALESCE(ts.unique_opens, 0) as unique_opens,
        COALESCE(ts.total_opens, 0) as total_opens,
        CASE 
          WHEN COALESCE(ls.sent_count, 0) > 0 
          THEN ROUND((COALESCE(ts.unique_opens, 0)::numeric / ls.sent_count::numeric) * 100, 2)
          ELSE 0 
        END as open_rate,
        cd.scheduled_at,
        cd.created_at
      FROM campaign_data cd
      LEFT JOIN log_stats ls ON cd.id = ls.campaign_id
      LEFT JOIN tracking_stats ts ON cd.id = ts.campaign_id
      ORDER BY cd.created_at DESC
    `

    return await query(sql)
  }
}
