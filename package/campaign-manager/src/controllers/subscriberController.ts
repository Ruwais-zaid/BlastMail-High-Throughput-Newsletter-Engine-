import { Request, Response } from 'express'
import { SubscriberRepository } from '../repository/subscriberRepository'
import { HttpError } from '../utils/HttpError'
import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import {
  getValidateResponseSchema,
  getValidateRequestSchema,
  getByIdRequestSchema,
  getByIdResponseSchema,
  getByCSVRequestSchema,
  getByCSVResponseSchema,
  getByCSVErrorSchema,
  deleteValidateResponse,
  updateValidateRequestBody,
  updateValidateRequestParam,
  updateValidateResponse,
} from '../schema/subscriberSchema'
import { UploadService } from '../services/uploadServices'

const subscriberRepo = new SubscriberRepository()
const uploadService = new UploadService()

export class SubscriberController {
  async getall(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = getValidateRequestSchema.safeParse(req.query)
      if (!parsed.success || parsed.data == null) {
        console.error('Validation Error:', parsed.error)
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid query params')
      }

      const { limit, offset } = parsed.data
      const subscribers = await subscriberRepo.findAll(limit, offset)
      const total = Number(await subscriberRepo.count())
      const response = getValidateResponseSchema.safeParse({
        data: subscribers,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: offset + limit < total,
        },
      })

      if (!response.success) {
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }

      return res.status(StatusCodes.OK).json(response.data)
    } catch (error) {
      console.log('Error fetching ', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = getByIdRequestSchema.safeParse(req.params)
      if (!parsed.success || parsed.data == null) {
        console.error('Validation Error:', parsed.error)
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid ID')
      }

      const subscriber = await subscriberRepo.findById(parsed.data.id)
      if (!subscriber) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Subscriber not found')
      }

      const response = getByIdResponseSchema.safeParse({ data: subscriber })
      if (!response.success) {
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid response structure')
      }

      return res.status(StatusCodes.OK).json(response.data)
    } catch (error) {
      console.log('Error fetching ', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }

  async uploadCSV(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = getByCSVRequestSchema.safeParse({ file: req.file })
      if (!parsed.success || parsed.data == null) {
        console.error('Validation Error:', parsed.error)
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid CSV file')
      }

      const start = Date.now()
      const result = await uploadService.parseCSV(parsed.data.file.buffer)

      if (result.validEmails.length === 0) {
        const errorResponse = getByCSVErrorSchema.safeParse({
          error: 'No valid emails found',
          details: result,
        })

        return res.status(StatusCodes.BAD_REQUEST).json(errorResponse.data)
      }

      const insertResult = await subscriberRepo.bulkInsert(result.validEmails)
      const duration = Date.now() - start

      const response = getByCSVResponseSchema.safeParse({
        success: true,
        message: `CSV processed in ${duration} ms`,
        stats: {
          totalRows: result.totalRows,
          validEmail: result.validEmails.length,
          duplicateEmail: result.duplicateEmails.length,
          invalidEmail: result.invalidEmails.length,
          inserted: insertResult.inserted,
        },
      })

      return res.status(StatusCodes.OK).json(response.data)
    } catch (error) {
      console.log('Error fetching ', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }

  async deleteSubscriber(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = getByIdRequestSchema.safeParse(req.params)
      if (!parsed.success || parsed.data == null) {
        console.log('Validation Error', parsed.error)
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid Id')
      }
      const deleted = await subscriberRepo.deleteById(parsed.data.id)
      if (!deleted) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Subscriber Not Found')
      }
      const validateResponse = deleteValidateResponse.safeParse({
        success: true,
        message: 'Subscriber deleted',
      })

      return res.status(StatusCodes.OK).json(validateResponse.data)
    } catch (error) {
      console.log('Error deleting ', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }
  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const parsedParams = updateValidateRequestParam.safeParse(req.params)
      if (!parsedParams.success || parsedParams.data == null) {
        console.log('Validation Error', parsedParams.error)
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid request Parameter')
      }
      const parsedBody = updateValidateRequestBody.safeParse(req.body)
      if (!parsedBody.success || parsedBody.data == null) {
        console.log('Validation Error', parsedBody.error)
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid request Body')
      }

      if (
        !parsedBody.data.status ||
        !['subscribed', 'unsubscribed'].includes(parsedBody.data.status)
      ) {
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid Status')
      }
      const updated = await subscriberRepo.updateStatus(
        parsedParams.data.id,
        parsedBody.data.status
      )
      if (!updated) {
        throw new HttpError(StatusCodes.NOT_FOUND, 'Subscriber Not Found')
      }

      const validateResponse = updateValidateResponse.safeParse({
        success: true,
        message: 'Status Updated',
      })
      return res.status(StatusCodes.OK).json(validateResponse.data)
    } catch (error) {
      console.log('Error Updating', error)
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message })
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    }
  }
}
