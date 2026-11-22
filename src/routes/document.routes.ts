import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { createDocumentSchema, listDocumentsSchema } from '../validators/document.validator';

const router = Router();
router.use(authenticate);

router.post('/', authorize('admin', 'operator'), validate(createDocumentSchema), documentController.create);
router.get('/', authorize('admin', 'operator', 'viewer', 'loan_executive'), validate(listDocumentsSchema, 'query'), documentController.list);
router.get('/:id', authorize('admin', 'operator', 'viewer', 'loan_executive'), documentController.getOne);
router.delete('/:id', authorize('admin', 'operator'), documentController.remove);

export default router;
