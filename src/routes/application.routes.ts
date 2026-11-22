import { Router } from 'express';
import * as controller from '../controllers/applicationManagement.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate, authorize('super_admin', 'admin'));

router.get('/', controller.list);
router.patch('/:serviceType/:id/status', controller.updateStatus);

export default router;
