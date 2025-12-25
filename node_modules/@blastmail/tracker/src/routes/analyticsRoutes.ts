import { Router } from 'express'
import { AnalyticsController } from '../controller/AnalyticsConroller'

const router: Router = Router()

const controller = new AnalyticsController()

router.get('/', controller.getAllCampaignAnalytics)
router.get('/campaign/:id', controller.getCampaignAnalytics)

export default router
