import csv from 'csv-parser'
import { Readable } from 'stream'
import { emailValidator, sanitizeEmail } from '@blastmail/types'
import { ParseResult } from './servesTypes'

export class UploadService {
  async parseCSV(fileBuffer: Buffer): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const validEmails: string[] = []
      const invalidEmails: Array<{ email: string; reason: string }> = []
      const emailSet = new Set<string>()
      const duplicateEmails: string[] = []
      let totalRows = 0

      const stream = Readable.from(fileBuffer)

      stream
        .pipe(csv())
        .on('data', row => {
          totalRows++

          let email = ''
          if (typeof row === 'object' && row !== null) {
            const possibleKeys = ['email', 'Email', 'EMAIL', 'mail', 'Mail', 'MAIL']
            for (const key of possibleKeys) {
              if (row[key] && typeof row[key] === 'string') {
                email = row[key].trim()
                break
              }
            }

            if (!email) {
              const firstValue = Object.values(row)[0]
              if (typeof firstValue === 'string') {
                email = firstValue.trim()
              }
            }
          }

          if (!email) {
            invalidEmails.push({ email: JSON.stringify(row), reason: 'Empty or no email column' })
            return
          }

          const sanitized = sanitizeEmail(email)

          if (emailValidator(sanitized)) {
            if (emailSet.has(sanitized)) {
              duplicateEmails.push(sanitized)
            } else {
              emailSet.add(sanitized)
              validEmails.push(sanitized)
            }
          } else {
            invalidEmails.push({ email: email, reason: 'Invalid email format' })
          }
        })
        .on('end', () => {
          resolve({
            validEmails,
            invalidEmails: invalidEmails.map(item => item.email),
            duplicateEmails,
            totalRows,
            stats: {
              uniqueValid: validEmails.length,
              duplicateValid: duplicateEmails.length,
              invalid: invalidEmails.length,
            },
          })
        })
        .on('error', error => {
          reject(error)
        })
    })
  }
}
