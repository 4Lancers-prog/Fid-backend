import { Router } from 'express';
import { makeCrudController } from '../controllers/crudController';
import { cropService } from '../services/applications.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { listQuerySchema } from '../validators/common.validator';
import { createCropSchema, updateCropSchema } from '../validators/crop.validator';

const c = makeCrudController(cropService);
const router = Router();
router.use(authenticate);

router.post('/', authorize('admin', 'operator'), validate(createCropSchema), c.create);
router.get('/', authorize('admin', 'operator', 'viewer'), validate(listQuerySchema, 'query'), c.list);
router.get('/:id', authorize('admin', 'operator', 'viewer'), c.getOne);
router.patch('/:id', authorize('admin', 'operator'), validate(updateCropSchema), c.update);
router.patch('/:id/status', authorize('admin', 'operator'), c.updateStatus);

export default router;
