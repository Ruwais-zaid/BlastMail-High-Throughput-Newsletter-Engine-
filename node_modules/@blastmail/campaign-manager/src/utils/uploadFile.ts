import multer from 'multer'
import { Request } from 'express'
import { HttpError } from '../utils/HttpError'
import { StatusCodes } from 'http-status-codes'

export const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter(req: Request, file: Express.Multer.File, cb) {
    const isCSV =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')

    if (isCSV) {
      cb(null, true)
    } else {
      cb(new HttpError(StatusCodes.BAD_REQUEST, 'Only CSV files are allowed'))
    }
  },
})
