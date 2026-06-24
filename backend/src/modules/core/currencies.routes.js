import { Router } from 'express';
import * as currenciesController from './currencies.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

router.get('/', requirePermission('cash_register:manage'), currenciesController.getCurrencies);
router.get('/:id', requirePermission('cash_register:manage'), currenciesController.getCurrencyById);

router.post('/', authorize('admin', 'manager'), requirePermission('currency:exchange'), currenciesController.createCurrency);
router.put('/:id', authorize('admin', 'manager'), requirePermission('currency:exchange'), currenciesController.updateCurrency);
router.delete('/:id', authorize('admin'), requirePermission('currency:exchange'), currenciesController.deleteCurrency);
router.patch('/:id/default', authorize('admin', 'manager'), requirePermission('currency:exchange'), currenciesController.setDefaultCurrency);

export default router;
