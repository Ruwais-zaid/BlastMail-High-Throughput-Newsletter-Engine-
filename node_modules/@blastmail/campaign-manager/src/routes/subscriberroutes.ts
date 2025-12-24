import { Router } from 'express'
import { SubscriberController } from '../controllers/subscriberController'
import { uploadFile } from '../utils/uploadFile'
const router = Router()
const Subscribercontroller = new SubscriberController()
router.get('/', Subscribercontroller.getall)
router.get('/:id', Subscribercontroller.getById)
router.post('/upload', uploadFile.single('file'), Subscribercontroller.uploadCSV)
router.delete('/:id', Subscribercontroller.deleteSubscriber)
router.patch('/:id/status', Subscribercontroller.updateStatus)
export default router
