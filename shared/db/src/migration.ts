import { query } from './index'

export async function runMigrations() {
  console.log('Running database migrations...')

  try {
    // Create subscribers table
    await query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
    await query(`
            CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email)
        `)

    // Create campaigns table
    await query(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id SERIAL PRIMARY KEY,
                subject VARCHAR(500) NOT NULL,
                body_html TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
                scheduled_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
    await query(`
    CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
    ON campaigns(status, scheduled_at) 
    WHERE status = 'scheduled';
  `)
    await query(`
    CREATE TABLE IF NOT EXISTS campaign_logs (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed')),
      message_id VARCHAR(255),
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
    await query(`
    CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign 
    ON campaign_logs(campaign_id);
  `)

    await query(`
    CREATE INDEX IF NOT EXISTS idx_campaign_logs_subscriber 
    ON campaign_logs(subscriber_id);
  `)

    // Create tracking_events table
    await query(`
    CREATE TABLE IF NOT EXISTS tracking_events (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('opened', 'clicked')),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

    // Create index on tracking_events
    await query(`
    CREATE INDEX IF NOT EXISTS idx_tracking_events_campaign 
    ON tracking_events(campaign_id, event_type);
  `)
    console.log('Database migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
