import { query, getClient } from '@blastmail/db'
import { Subscribers } from '@blastmail/types'

export class SubscriberRepository {
  async findAll(limit = 100, offset = 0): Promise<Subscribers[]> {
    const sql = `
      SELECT id, email, status, created_at as "createdAt"
      FROM subscribers 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `
    return await query(sql, [limit, offset])
  }

  async findById(id: number): Promise<Subscribers | null> {
    const sql = `SELECT id, email, status, created_at as "createdAt" FROM subscribers WHERE id = $1`
    const rows = await query<Subscribers>(sql, [id])
    return rows.length > 0 ? rows[0] : null
  }

  async findByEmail(email: string): Promise<Subscribers | null> {
    const sql = `SELECT id, email, status, created_at as "createdAt" FROM subscribers WHERE email = $1`
    const rows = await query<Subscribers>(sql, [email])
    return rows.length > 0 ? rows[0] : null
  }

  async count(): Promise<Number> {
    const sql = 'SELECT COUNT(*) as count FROM subscribers'
    const rows = await query(sql)
    return parseInt(rows[0].count)
  }

  async bulkInsert(emails: string[]): Promise<{ inserted: number; duplicates: number }> {
    if (emails.length === 0) {
      return { inserted: 0, duplicates: 0 }
    }

    const client = await getClient()
    let inserted = 0
    let duplicates = 0

    try {
      await client.query('BEGIN')

      // Create temporary table for batch processing
      await client.query(`
        CREATE TEMP TABLE temp_subscribers (email VARCHAR(255)) ON COMMIT DROP
      `)

      // Batch insert into temp table (1000 at a time)
      const batchSize = 1000
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize)
        const values = batch.map((_, idx) => `($${idx + 1})`).join(',')
        const sql = `INSERT INTO temp_subscribers (email) VALUES ${values}`
        await client.query(sql, batch)
      }

      // Insert from temp to main table (ignore duplicates)
      const result = await client.query(`
        INSERT INTO subscribers (email, status)
        SELECT DISTINCT LOWER(TRIM(email)), 'subscribed'
        FROM temp_subscribers
        WHERE email IS NOT NULL 
          AND email != ''
          AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `)

      inserted = result.rowCount || 0
      duplicates = emails.length - inserted

      await client.query('COMMIT')

      console.log(`✅ Bulk insert completed: ${inserted} inserted, ${duplicates} duplicates`)

      return { inserted, duplicates }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Bulk insert failed:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async deleteById(id: number): Promise<boolean> {
    const sql = 'DELETE FROM subscribers WHERE id = $1 RETURNING id'
    const result = await query(sql, [id])
    return result.length > 0
  }

  async updateStatus(id: number, status: 'subscribed' | 'unsubscribed'): Promise<boolean> {
    const sql = 'UPDATE subscribers SET status = $1 WHERE id = $2 RETURNING id'
    const rows = await query(sql, [status, id])
    return rows.length > 0
  }
}
