import { Campaigns } from '@blastmail/types'
export interface createCampaignInput {
  subject: string
  body_html: string
  scheduled_at?: Date
}
export interface updateCampaignInput {
  subject: string
  body_html?: string
  scheduled_at?: Date
  status?: Campaigns['status']
}
