import { Router } from 'express';
import { makeCrudController } from '../controllers/crudController';
import { loanService } from '../services/applications.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { listQuerySchema } from '../validators/common.validator';
import { createLoanSchema, updateLoanSchema } from '../validators/loan.validator';

const c = makeCrudController(loanService);
const router = Router();
router.use(authenticate);

// Loan leads carry sensitive PAN/Aadhaar: access is limited to loan executives and admins.
router.post('/', authorize('admin', 'loan_executive'), validate(createLoanSchema), c.create);
router.get('/', authorize('admin', 'loan_executive', 'viewer'), validate(listQuerySchema, 'query'), c.list);
router.get('/:id', authorize('admin', 'loan_executive', 'viewer'), c.getOne);
router.patch('/:id', authorize('admin', 'loan_executive'), validate(updateLoanSchema), c.update);
router.patch('/:id/status', authorize('admin', 'loan_executive'), c.updateStatus);

export default router;
