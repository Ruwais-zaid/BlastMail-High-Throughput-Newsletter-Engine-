import { Response, Request, NextFunction } from 'express'
import { HttpError } from '../utils/HttpError'
import { getReasonPhrase, StatusCodes } from 'http-status-codes'

export const errorHandler = (
  error: Error | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(`[Error] ${req.method} ${req.originalUrl}`, error)

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    })
  }

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
  })
}
