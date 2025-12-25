export interface CampaignAnalytics {
  campaignId: number
  subscriberId: number
  status: string
  totalSubscriber: string
  emailSent: number
  emailFailed: number
  uniqueOpens: number
  totalOpens: number
  openRate: number
  scheduled_at: string | null
  created_at: string
}
