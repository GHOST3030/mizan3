import { Router } from 'express';
import * as purchasesController from './purchases.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import { ownership } from '../../middleware/ownership.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('business:manage_purchases'), purchasesController.getPurchases);
router.get('/:id', ownership('purchase'), requirePermission('business:manage_purchases'), purchasesController.getPurchaseById);
router.post('/', authorize('admin', 'manager'), requirePermission('business:manage_purchases'), purchasesController.createPurchase);
router.put('/:id', authorize('admin', 'manager'), requirePermission('business:manage_purchases'), purchasesController.updatePurchase);
router.put('/:id/status', authorize('admin', 'manager'), requirePermission('business:manage_purchases'), purchasesController.updatePurchaseStatus);
router.delete('/:id', authorize('admin'), requirePermission('business:manage_purchases'), purchasesController.deletePurchase);
router.post('/:id/return', authorize('admin', 'manager'), requirePermission('returns:create'), purchasesController.returnPurchase);
router.post('/:id/cancel', authorize('admin', 'manager'), requirePermission('business:manage_purchases'), purchasesController.cancelPurchase);

export default router;
