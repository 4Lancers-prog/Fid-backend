import { Router } from 'express';
import * as controller from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', controller.list);
router.patch('/read-all', controller.readAll);
router.patch('/:id/read', controller.read);

export default router;
