import { query } from '@blastmail/db'
import { Campaigns } from '@blastmail/types'
import { createCampaignInput, updateCampaignInput } from '../types/campaignTypes'

export class CampaignRepository {
  async findAll(limit = 50, offset = 0): Promise<Campaigns[]> {
    const sql = `SELECT id, subject, body_html, status, scheduled_at, created_at, updated_at
                     FROM campaigns ORDER BY created_at DESC LIMIT $1 OFFSET $2`
    return await query(sql, [limit, offset])
  }

  async findById(id: number): Promise<Campaigns | null> {
    const sql = `SELECT id,subject,body_html,status,scheduled_at,created_at,updated_at FROM campaigns WHERE id = $1`
    const rows = await query<Campaigns>(sql, [id])
    return rows.length > 0 ? rows[0] : null
  }

  async count(): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM campaigns`
    const rows = await query(sql)
    return parseInt(rows[0].count)
  }

  async create(input: createCampaignInput): Promise<Campaigns[]> {
    const status = input.scheduled_at ? 'scheduled' : 'draft'
    const sql = `INSERT INTO campaigns (subject, body_html, status, scheduled_at)
                     VALUES ($1, $2, $3, $4) RETURNING *`

    const values: [string, string, string, Date | null] = [
      input.subject,
      input.body_html,
      status,
      input.scheduled_at || null,
    ]

    const rows = await query<Campaigns[]>(sql, values)
    return rows[0]
  }

  async update(id: number, input: updateCampaignInput): Promise<Campaigns | null> {
    const fields: string[] = []
    const values: (number | string | Date | null)[] = []
    let paramIndex = 1

    if (input.subject !== undefined) {
      fields.push(`subject = $${paramIndex++}`)
      values.push(input.subject)
    }
    if (input.body_html !== undefined) {
      fields.push(`body_html = $${paramIndex++}`)
      values.push(input.body_html)
    }
    if (input.scheduled_at !== undefined) {
      fields.push(`scheduled_at = $${paramIndex++}`)
      values.push(input.scheduled_at)
    }
    if (input.status !== undefined) {
      fields.push(`status = $${paramIndex++}`)
      values.push(input.status)
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const sql = `UPDATE campaigns SET ${fields.join(', ')} 
                     WHERE id = $${paramIndex} RETURNING *`
    const rows = await query<Campaigns>(sql, values)
    return rows.length > 0 ? rows[0] : null
  }

  async deleteById(id: number): Promise<boolean> {
    const sql = `DELETE FROM campaigns WHERE id = $1 RETURNING id`
    const rows = await query(sql, [id])
    return rows.length > 0
  }
  async findScheduledCampaign(): Promise<Campaigns[]> {
    const sql = `SELECT * FROM campaigns WHERE status = 'scheduled'
        AND scheduled_at <= NOW() ORDER BY scheduled_at ASC`

    return await query(sql)
  }
  async getCampaignStats(
    campaign_id: number
  ): Promise<{ totalSubscribers: number; sent: number; failed: number }> {
    const sql = `SELECT COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total FROM campaign_logs
        WHERE campaign_id = $1`

    const rows = await query(sql, [campaign_id])
    if (rows.length == 0) {
      return {
        totalSubscribers: 0,
        sent: 0,
        failed: 0,
      }
    }
    return {
      totalSubscribers: parseInt(rows[0].total),
      sent: parseInt(rows[0].sent),
      failed: parseInt(rows[0].failed),
    }
  }
}
