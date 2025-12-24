export interface ParseResult {
  validEmails: string[]
  invalidEmails: string[]
  duplicateEmails: string[]
  totalRows: number
  stats?: {
    uniqueValid: number
    duplicateValid: number
    invalid: number
  }
}
