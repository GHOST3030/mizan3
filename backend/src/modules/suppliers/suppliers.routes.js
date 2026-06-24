import { Router } from 'express';
import * as suppliersController from './suppliers.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

// Supplier Categories
router.get('/categories', requirePermission('business:manage_suppliers'), suppliersController.getSupplierCategories);
router.post('/categories', authorize('admin', 'manager'), requirePermission('business:manage_suppliers'), suppliersController.createSupplierCategory);
router.put('/categories/:id', authorize('admin', 'manager'), requirePermission('business:manage_suppliers'), suppliersController.updateSupplierCategory);
router.delete('/categories/:id', authorize('admin'), requirePermission('business:manage_suppliers'), suppliersController.deleteSupplierCategory);

// Suppliers
router.get('/', requirePermission('business:manage_suppliers'), suppliersController.getSuppliers);
router.get('/:id', requirePermission('business:manage_suppliers'), suppliersController.getSupplierById);
router.get('/:id/statement', requirePermission('business:manage_suppliers'), suppliersController.getSupplierStatement);
router.put('/:id/opening-balance', authorize('admin', 'manager'), requirePermission('business:manage_suppliers'), suppliersController.setSupplierOpeningBalance);
router.post('/', authorize('admin', 'manager'), requirePermission('business:manage_suppliers'), suppliersController.createSupplier);
router.put('/:id', authorize('admin', 'manager'), requirePermission('business:manage_suppliers'), suppliersController.updateSupplier);
router.delete('/:id', authorize('admin'), requirePermission('business:manage_suppliers'), suppliersController.deleteSupplier);

export default router;
