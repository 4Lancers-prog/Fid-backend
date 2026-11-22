import { Router } from 'express';
import * as fidController from '../controllers/fid.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { createFidSchema, listFidSchema } from '../validators/fid.validator';

const router = Router();
router.use(authenticate);

router.get('/fee', fidController.fee);
router.post('/', authorize('admin', 'operator'), validate(createFidSchema), fidController.generate);
router.get('/', authorize('admin', 'operator', 'viewer'), validate(listFidSchema, 'query'), fidController.list);
router.get('/:id', authorize('admin', 'operator', 'viewer'), fidController.getOne);

export default router;
