import { Router } from 'express'
const router = Router()
import { CampaignController } from '../controllers/campaignControllers'
const Campaigncontroller = new CampaignController()
router.get('/', Campaigncontroller.getAll)
router.get('/:id', Campaigncontroller.getById)
router.post('/', Campaigncontroller.create)
router.put('/:id', Campaigncontroller.update)
router.delete('/:id', Campaigncontroller.delete)
export default router
