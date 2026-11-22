import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { authLimiter } from '../middleware/rateLimiter';
import { csrfGuard } from '../middleware/csrf';
import { loginSchema, registerSchema, publicRegisterSchema } from '../validators/auth.validator';

const router = Router();

// Registration is restricted to administrators (self-signup is disabled).
router.post('/register', authenticate, authorize('super_admin', 'admin'), validate(registerSchema), authController.register);
// Public self-registration (rate-limited). Creates a PENDING account that cannot
// sign in until an administrator approves it.
router.get('/registration-qr', authController.registrationQr); // public: shown on the signup page
router.post('/register-request', authLimiter, validate(publicRegisterSchema), authController.registerRequest);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', csrfGuard, authController.refresh);
router.post('/logout', csrfGuard, authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
