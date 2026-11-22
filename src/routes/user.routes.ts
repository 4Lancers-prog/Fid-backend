import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { adminCreateUserSchema, updateUserSchema, resetPasswordSchema, listUsersSchema, approveUserSchema } from '../validators/user.validator';

const router = Router();
router.use(authenticate, authorize('super_admin', 'admin'));

router.get('/', validate(listUsersSchema, 'query'), userController.list);
router.get('/:id', userController.getOne);
router.post('/', validate(adminCreateUserSchema), userController.create);
router.patch('/:id', validate(updateUserSchema), userController.update);
router.patch('/:id/approve', validate(approveUserSchema), userController.approve);
router.patch('/:id/reject', userController.reject);
router.patch('/:id/password', validate(resetPasswordSchema), userController.resetPassword);

export default router;
