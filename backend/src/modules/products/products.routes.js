import { Router } from 'express';
import * as productsController from './products.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', authorize('admin', 'manager', 'cashier', 'inventory_manager'), productsController.getProducts);
router.get('/barcode/:barcode', authorize('admin', 'manager', 'cashier', 'inventory_manager'), productsController.getProductByBarcode);
router.get('/:id', authorize('admin', 'manager', 'cashier', 'inventory_manager'), productsController.getProductById);
router.post('/', authorize('admin', 'manager'), requirePermission('products:manage'), productsController.createProduct);
router.put('/:id', authorize('admin', 'manager'), requirePermission('products:manage'), productsController.updateProduct);
router.delete('/:id', authorize('admin'), requirePermission('products:manage'), productsController.deleteProduct);

export default router;