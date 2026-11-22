import { Router } from 'express';
import { reports } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate, authorize('super_admin', 'admin'));
router.get('/', reports);

export default router;
