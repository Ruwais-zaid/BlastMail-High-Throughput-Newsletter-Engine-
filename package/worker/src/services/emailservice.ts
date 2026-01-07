import nodemailer, { Transporter } from 'nodemailer'
import { EmailQueueMessage } from '@blastmail/types'
import dotenv from 'dotenv'

dotenv.config()
export class EmailService {
  private transport!: Transporter
  private trackUrlBase: string
  private isMockMode: boolean

  constructor() {
    this.trackUrlBase = process.env.TRACKER_URL || 'http://localhost:3002/track'
    this.isMockMode = process.env.SMTP_MOCK === 'true'
    if(this.isMockMode){
      console.log("Mocking mode is enabled Email will be simulated not sent")

    } else{
      this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log(' SMTP transporter initialized')
    }
  }

  private injectTrackingPixel(html: string, campaignId: number, subscriberId: number): string {
    const trackingURL = `${this.trackUrlBase}?campaignId=${campaignId}&subscriberId=${subscriberId}`
    const trackingPixel = `<img src="${trackingURL}" width="1" height="1" style="display:none;" alt=""/>`

    if (html.toLowerCase().includes('</body>')) {
      return html.replace(/<\/body>/i, `${trackingPixel}$&`)
    }

    return html + trackingPixel
  }
  async sendEmail(
    message: EmailQueueMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const htmlWithTracking = this.injectTrackingPixel(
        message.bodyHtml,
        message.campaignId,
        message.subscriberId
      )
      const info = await this.transport.sendMail({
        from: process.env.FROM_EMAIL,
        to: message.email,
        subject: message.subject,
        html: htmlWithTracking,
      })

      console.log(` Email sent to ${message.email}, Message ID: ${info.messageId}`)
      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      error = error instanceof Error ? error : new Error('Unknown error')
      console.error(`Failed to send email to ${message.email}:`, error)
      return {
        success: false,
        messageId: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transport.verify()
      console.log(`SMTP connection verified`)
      return true
    } catch (error) {
      console.error('FAILED to connect SMTP', error)
      return false
    }
  }
}
