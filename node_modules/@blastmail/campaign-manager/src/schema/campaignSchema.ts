import { z } from 'zod'

const status = ['draft', 'sending', 'scheduled', 'sent', 'failed'] as const

const campaignSchema = z.object({
  id: z.number().int().positive(),
  subject: z.string(),
  body_html: z.string(),
  status: z.enum(status),
  scheduled_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
})

// GET / (list campaigns)
export const getValidateRequestSchema = z.object({
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export const getValidateResponseSchema = z.object({
  data: z.array(campaignSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
  }),
})

// GET /:id (get single campaign)
export const getByIdRequestSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const getByIdResponseSchema = z.object({
  data: campaignSchema,
  stats: z
    .object({
      totalSubscribers: z.number().int().nonnegative(),
      sent: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    })
    .nullable(),
})

// POST / (create campaign)
export const createRequestSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body_html: z.string().min(1, 'Email content is required'),
  scheduled_at: z.string().datetime(),
})

export const createResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: campaignSchema,
})

// PUT /:id (update campaign)
export const updateRequestParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const updateRequestBodySchema = z.object({
  subject: z.string(),
  body_html: z.string(),
  scheduled_at: z.string().datetime(),
  status: z.enum(status),
})

export const updateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: campaignSchema,
})

export const deleteRequestSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const deleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
