import { Router } from 'express';
import * as brandsController from './brands.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('products:manage_categories'), brandsController.getBrands);
router.get('/:id', requirePermission('products:manage_categories'), brandsController.getBrandById);
router.post('/', authorize('admin', 'manager'), requirePermission('products:manage'), brandsController.createBrand);
router.put('/:id', authorize('admin', 'manager'), requirePermission('products:manage'), brandsController.updateBrand);
router.delete('/:id', authorize('admin'), requirePermission('products:manage'), brandsController.deleteBrand);

export default router;
