import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { createManualPaymentSchema, listPaymentsSchema, rejectSchema } from '../validators/payment.validator';

const router = Router();
router.use(authenticate);

// Any authenticated user submits a recharge request; the wallet is credited only on admin approval.
router.post('/', validate(createManualPaymentSchema), paymentController.create);
router.get('/mine', paymentController.mine);
router.get('/', authorize('super_admin', 'admin'), validate(listPaymentsSchema, 'query'), paymentController.list);
router.patch('/:id/approve', authorize('super_admin', 'admin'), paymentController.approve);
router.patch('/:id/reject', authorize('super_admin', 'admin'), validate(rejectSchema), paymentController.reject);

export default router;
