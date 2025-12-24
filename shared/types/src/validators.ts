import { z } from 'zod'

export const emailValidator = (email: string): boolean => {
  const emailCheck = z.string().email().safeParse(email)
  return emailCheck.success
}

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim()
}
