//Interface Subscribers
export interface Subscribers {
  id: number
  email: string
  status: 'subscribed' | 'unsubscribed'
  created_at: Date
}

export interface Campaigns {
  id: number
  subject: string
  body_html: string
  status: 'draft' | 'scheduled' | 'sent' | 'failed' | 'sending'
  scheduled_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CampaignLogs {
  id: number
  campaign_id: number
  subscriber_id: number
  status: 'sent' | 'failed'
  message_id: string | null
  error_message: string | null
  sent_at: Date
}

export interface TrackingEvents {
  id: number
  campaign_id: number
  subscriber_id: number
  event_type: 'opened' | 'clicked'
  event_data: string | null
  created_at: Date
}

export interface EmailQueueMessage {
  email: string
  campaignId: number
  subscriberId: number
  subject: string
  bodyHtml: string
  queuedAt: string
}

export * from './validators'
