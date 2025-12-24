import { StatusCodes, getReasonPhrase } from 'http-status-codes'

export class HttpError extends Error {
  public status: number

  constructor(status: number = StatusCodes.INTERNAL_SERVER_ERROR, message?: string) {
    super(message)

    this.name = 'HttpError'
    this.status = status

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError)
    }
    this.message = message || getReasonPhrase(status)
  }
}
