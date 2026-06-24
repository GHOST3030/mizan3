import { Router } from 'express';
import * as unitsController from './units.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('products:manage_categories'), unitsController.getUnits);
router.get('/:id', requirePermission('products:manage_categories'), unitsController.getUnitById);
router.post('/', authorize('admin', 'manager'), requirePermission('products:manage'), unitsController.createUnit);
router.put('/:id', authorize('admin', 'manager'), requirePermission('products:manage'), unitsController.updateUnit);
router.delete('/:id', authorize('admin'), requirePermission('products:manage'), unitsController.deleteUnit);

export default router;
