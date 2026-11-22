import { Router } from 'express';
import { makeCrudController } from '../controllers/crudController';
import { trailerService } from '../services/applications.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { listQuerySchema } from '../validators/common.validator';
import { createTrailerSchema, updateTrailerSchema } from '../validators/trailer.validator';

const c = makeCrudController(trailerService);
const router = Router();
router.use(authenticate);

router.post('/', authorize('admin', 'operator'), validate(createTrailerSchema), c.create);
router.get('/', authorize('admin', 'operator', 'viewer'), validate(listQuerySchema, 'query'), c.list);
router.get('/:id', authorize('admin', 'operator', 'viewer'), c.getOne);
router.patch('/:id', authorize('admin', 'operator'), validate(updateTrailerSchema), c.update);
router.patch('/:id/status', authorize('admin', 'operator'), c.updateStatus);

export default router;
