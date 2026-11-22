import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { updateSettingsSchema } from '../validators/payment.validator';

const router = Router();
router.use(authenticate);

// Active QR shown on the recharge screen (all authenticated users).
router.get('/qr', paymentController.getActiveQr);
// Full settings + update (admins only).
router.get('/', authorize('super_admin', 'admin'), paymentController.getSettings);
router.put('/qr', authorize('super_admin', 'admin'), validate(updateSettingsSchema), paymentController.updateSettings);

export default router;
