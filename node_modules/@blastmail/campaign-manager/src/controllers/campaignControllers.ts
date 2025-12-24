import { Request, Response } from 'express'
import { CampaignRepository } from '../repository/campaignRepository'
import { SubscriberRepository } from '../repository/subscriberRepository'
import { StatusCodes, getReasonPhrase } from 'http-status-codes'
import { HttpError } from '../utils/HttpError'
import {
  getValidateRequestSchema,
  getValidateResponseSchema,
  getByIdRequestSchema,
  getByIdResponseSchema,
  createRequestSchema,
  createResponseSchema,
  updateRequestParamSchema,
  updateRequestBodySchema,
  updateResponseSchema,
  deleteRequestSchema,
  deleteResponseSchema,
} from '../schema/campaignSchema'

const campaignRepo = new CampaignRepository()
const subscriberRepo = new SubscriberRepository()

export class CampaignController {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = getValidateRequestSchema.safeParse(req.query)
      if (!parsed.success) {
        console.error('Validation Error:', parsed.error.format())
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid query parameters')
      }
      const { limit, offset } = parsed.data
      const campaigns = await campaignRepo.findAll(limit, offset)
      const total = Number(await campaignRepo.count())
      const response = getValidateResponseSchema.safeParse({
        data: campaigns,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: offset + limit < total,
        },
      })
      if (!response.success) {
        console.error('Response validation error:', response.error.format())
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }
      return res.status(StatusCodes.OK).json(response.data)
    } catch (error) {
      console.error('Error fetching campaigns:', error)

      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: true,
          message: error.message,
        })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }
  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = getByIdRequestSchema.safeParse(req.params)
      if (!parsed.success) {
        console.error('Validation Error:', parsed.error.format())
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid campaign ID')
      }

      const campaign = await campaignRepo.findById(parsed.data.id)
      if (!campaign) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Campaign not found')
      }
      const stats = await campaignRepo.getCampaignStats(parsed.data.id)
      const response = getByIdResponseSchema.safeParse({
        data: campaign,
        stats: stats || null,
      })
      if (!response.success) {
        console.error('Response validation error:', response.error.format())
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }
      return res.status(StatusCodes.OK).json(response.data)
    } catch (error) {
      console.error('Error fetching campaign:', error)

      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: true,
          message: error.message,
        })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = createRequestSchema.safeParse(req.body)
      if (!parsed.success) {
        console.error('Validation Error:', parsed.error.format())
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid request body')
      }
      const { subject, body_html, scheduled_at } = parsed.data
      if (!subject || subject.trim().length === 0) {
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Subject is required')
      }
      if (!body_html || body_html.trim().length === 0) {
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Email content is required')
      }
      const subscriberCount = await subscriberRepo.count()
      if (subscriberCount === 0) {
        throw new HttpError(
          StatusCodes.BAD_REQUEST,
          'No subscribers found. Please upload subscribers first.'
        )
      }
      let scheduledDate: Date | undefined = undefined
      if (scheduled_at) {
        scheduledDate = new Date(scheduled_at)
        if (isNaN(scheduledDate.getTime())) {
          throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid scheduled_at date')
        }
        if (scheduledDate < new Date()) {
          throw new HttpError(StatusCodes.BAD_REQUEST, 'Scheduled time must be in the future')
        }
      }
      const campaign = await campaignRepo.create({
        subject: subject.trim(),
        body_html: body_html.trim(),
        scheduled_at: scheduledDate,
      })

      const response = createResponseSchema.safeParse({
        success: true,
        data: campaign,
        message: scheduledDate
          ? `Campaign scheduled for ${scheduledDate.toISOString()}`
          : 'Campaign saved as draft',
      })

      if (!response.success) {
        console.error('Response validation error:', response.error.format())
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }
      return res.status(StatusCodes.CREATED).json(response.data)
    } catch (error) {
      console.error('Error creating campaign:', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: true,
          message: error.message,
        })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }
  async update(req: Request, res: Response): Promise<Response> {
    try {
      const paramsResult = updateRequestParamSchema.safeParse(req.params)
      if (!paramsResult.success) {
        console.error('Validation Error', paramsResult.error.format())
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid request parameters')
      }

      const bodyResult = updateRequestBodySchema.safeParse(req.body)
      if (!bodyResult.success) {
        console.error('Validation Error', bodyResult.error.format())
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid request Body')
      }
      const campaign = await campaignRepo.findById(paramsResult.data.id)
      if (!campaign) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Campaign not found')
      }
      if (campaign.status === 'sent' || campaign.status === 'sending') {
        throw new HttpError(
          StatusCodes.BAD_REQUEST,
          `Cannot edit campaign with status: ${campaign.status}`
        )
      }
      let scheduledDate: Date | undefined
      if (bodyResult.data.scheduled_at) {
        scheduledDate = new Date(bodyResult.data.scheduled_at)
        if (isNaN(scheduledDate.getTime())) {
          throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid scheduled_at date')
        }
      }
      const updatedCampaign = await campaignRepo.update(paramsResult.data.id, {
        subject: bodyResult.data.subject,
        body_html: bodyResult.data.body_html,
        scheduled_at: scheduledDate,
        status: bodyResult.data.status !== 'sending' ? bodyResult.data.status : undefined,
      })

      const validateResponse = updateResponseSchema.safeParse({
        success: true,
        message: 'Campaign updated',
        data: updatedCampaign,
      })

      if (!validateResponse.success) {
        console.error('Response validation error:', validateResponse.error.format())
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }

      return res.status(StatusCodes.OK).json(validateResponse.data)
    } catch (error) {
      console.error('Error updating campaign:', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: true,
          message: error.message,
        })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const paramsResult = deleteRequestSchema.safeParse(req.params)
      console.log('=== DELETE DEBUG ===')
      console.log('Request params:', req.params)
      console.log('Parsed ID:', paramsResult.data?.id)
      if (!paramsResult.success) {
        console.error('Validation Error', paramsResult.error.format())
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid request parameters')
      }
      const campaign = await campaignRepo.findById(paramsResult.data.id)
      if (!campaign) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Campaign not found')
      }

      if (campaign.status === 'sending' || campaign.status === 'sent') {
        throw new HttpError(
          StatusCodes.BAD_REQUEST,
          'Cannot delete a campaign that is sending or sent'
        )
      }
      await campaignRepo.deleteById(paramsResult.data.id)

      const validateResponse = deleteResponseSchema.safeParse({
        success: true,
        message: 'Campaign deleted',
      })
      if (!validateResponse.success) {
        console.error('Response validation error:', validateResponse.error.format())
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }
      return res.status(StatusCodes.OK).json(validateResponse.data)
    } catch (error) {
      console.error('Error updating campaign:', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: true,
          message: error.message,
        })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }
}
