import { z } from 'zod'

export const status = ['subscribed', 'unsubscribed'] as const

export const getValidateRequestSchema = z.object({
  limit: z.coerce.number().int().positive(),
  offset: z.coerce.number().int().nonnegative(),
})
export const getByIdRequestSchema = z.object({
  id: z.coerce.number().int().positive(),
})
export const csvFileSchema = z.object({
  mimetype: z.literal('text/csv'),
  size: z.number().max(5 * 1024 * 1024), // 5 MB
  originalname: z.string().endsWith('.csv'),
  buffer: z.instanceof(Buffer),
})
export const getByCSVRequestSchema = z.object({
  file: csvFileSchema,
})
export const getByIdResponseSchema = z.object({
  data: z.object({
    id: z.number().int().positive(),
    email: z.string().email(),
    status: z.enum(status),
    createdAt: z.date(),
  }),
})
export const getByCSVResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  stats: z.object({
    totalRows: z.number().int().nonnegative(),
    validEmail: z.number().int().nonnegative(),
    duplicateEmail: z.number().int().nonnegative(),
    invalidEmail: z.number().int().nonnegative(),
    inserted: z.number().int().nonnegative(),
  }),
})
export const getByCSVErrorSchema = z.object({
  error: z.string(),
  details: z.object({
    validEmails: z.array(z.string()),
    invalidEmails: z.array(z.string()),
    totalRows: z.number().int().nonnegative(),
  }),
})
export const getValidateResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int().positive(),
      email: z.string().email(),
      status: z.enum(status),
      createdAt: z.date(),
    })
  ),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
  }),
})
export const deleteValidateResponse = z.object({
  success: z.boolean(),
  message: z.string(),
})
export const updateValidateRequestParam = z.object({
  id: z.coerce.number().int().positive(),
})
export const updateValidateResponse = deleteValidateResponse
export const updateValidateRequestBody = z.object({
  status: z.enum(status),
})
