import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', walletController.getWallet);
router.get('/transactions', walletController.transactions);
router.post('/admin-adjustment', authorize('super_admin', 'admin'), walletController.adminAdjustment);

export default router;
