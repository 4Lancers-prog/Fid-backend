import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);
router.get('/', settingsController.get); // any authenticated user (to know what's enabled)
router.put('/', authorize('super_admin', 'admin'), settingsController.update);

export default router;
