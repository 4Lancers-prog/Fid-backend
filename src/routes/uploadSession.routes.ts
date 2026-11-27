import { Router } from 'express';
import * as controller from '../controllers/uploadSession.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createDocumentSchema } from '../validators/document.validator';

const router = Router();

// Logged-in user creates a session (the QR encodes a link with this token).
router.post('/', authenticate, controller.create);
// Public (token in URL): the phone page reads session info and uploads.
router.get('/:token', controller.info);
router.post('/:token/documents', validate(createDocumentSchema), controller.upload);
router.delete('/:token/documents', controller.clear);

export default router;
