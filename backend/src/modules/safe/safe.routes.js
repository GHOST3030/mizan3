import { Router } from 'express';
import * as safeController from './safe.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('cash_register:manage'), safeController.getSafeBoxes);
router.post('/', authorize('admin', 'manager'), requirePermission('cash_register:manage'), safeController.createSafeBox);

router.get('/movements', requirePermission('cash_register:manage'), safeController.getSafeMovements);
router.post('/movements', authorize('admin', 'manager'), requirePermission('cash_register:manage'), safeController.createSafeMovement);

router.put('/:id', authorize('admin', 'manager'), requirePermission('cash_register:manage'), safeController.updateSafeBox);
router.delete('/:id', authorize('admin'), requirePermission('cash_register:manage'), safeController.deleteSafeBox);

export default router;
