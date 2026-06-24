import { Router } from 'express';
import * as productUnitsController from './product-units.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/product/:productId', authorize('admin', 'manager', 'cashier', 'inventory_manager'), productUnitsController.getProductUnits);
router.post('/', authorize('admin', 'manager'), requirePermission('products:manage'), productUnitsController.createProductUnit);
router.put('/bulk', authorize('admin', 'manager'), requirePermission('products:manage'), productUnitsController.bulkSetProductUnits);
router.put('/:id', authorize('admin', 'manager'), requirePermission('products:manage'), productUnitsController.updateProductUnit);
router.delete('/:id', authorize('admin'), requirePermission('products:manage'), productUnitsController.deleteProductUnit);

export default router;
