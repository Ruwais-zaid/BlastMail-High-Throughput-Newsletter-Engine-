import express, { Request, Response, Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import responseTime from 'response-time'
import compression from 'compression'
import { runMigrations } from '@blastmail/db/dist/migration'
import subscriberroutes from './routes/subscriberroutes'
import campaignroutes from './routes/campaignroutes'
import { errorHandler } from './middleware/errorHandler'
import { CORS_CONFIG } from './utils/config'
import helmet from 'helmet'
import timeout from 'connect-timeout'
import { getReasonPhrase, StatusCodes } from 'http-status-codes'

dotenv.config()

export const app: Express = express()
const PORT = process.env.PORT || 3001

app.use(responseTime())
app.use(cors(CORS_CONFIG))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(helmet())
app.use(timeout('20s'))

//compress all response
app.use(compression())

app.get('/health', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: getReasonPhrase(StatusCodes.OK),
  })
})

app.use('/api/v1/subscribers', subscriberroutes)
app.use('/api/v1/campaign', campaignroutes)
app.use(errorHandler)
const startServer = async () => {
  try {
    await runMigrations()
    app.listen(PORT, () => {
      console.log(`campaign-manager service running on port http://localhost:${PORT}`)
      console.log(`Heath check endpoint http://localhost:${PORT}/health`)
      console.log(`Subscriber API: http://localhost:${PORT}/api/v1/subscribers`)
      console.log(`Campaign API: http://localhost:${PORT}/api/v1/campaign`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
startServer()
