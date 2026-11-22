import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate, authorize('super_admin', 'admin'));
router.get('/', auditController.list);

export default router;
