import { Router } from 'express';
import * as farmerController from '../controllers/farmer.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { createFarmerSchema, updateFarmerSchema, listFarmersSchema, lookupAadhaarSchema } from '../validators/farmer.validator';

const router = Router();
router.use(authenticate);

const readRoles = ['admin', 'operator', 'viewer', 'loan_executive'] as const;

// Assisted FRUITS/K-Kisan workflow: check if a verified Aadhaar already has a profile.
router.post('/lookup', authorize('admin', 'operator'), validate(lookupAadhaarSchema), farmerController.lookup);

router.post('/', authorize('admin', 'operator'), validate(createFarmerSchema), farmerController.create);
router.get('/', authorize(...readRoles), validate(listFarmersSchema, 'query'), farmerController.list);
router.get('/:id', authorize(...readRoles), farmerController.getOne);
router.get('/:id/history', authorize(...readRoles), farmerController.history);
router.patch('/:id', authorize('admin', 'operator'), validate(updateFarmerSchema), farmerController.update);
router.delete('/:id', authorize('admin'), farmerController.remove);

export default router;
