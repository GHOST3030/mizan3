import { Router } from 'express';
import * as categoriesController from './categories.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('products:manage_categories'), categoriesController.getCategories);
router.get('/:id', requirePermission('products:manage_categories'), categoriesController.getCategoryById);
router.post('/', authorize('admin', 'manager'), requirePermission('products:manage_categories'), categoriesController.createCategory);
router.put('/:id', authorize('admin', 'manager'), requirePermission('products:manage_categories'), categoriesController.updateCategory);
router.delete('/:id', authorize('admin'), requirePermission('products:manage_categories'), categoriesController.deleteCategory);

export default router;
