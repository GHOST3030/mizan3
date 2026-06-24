import { Router } from 'express';
import * as customersController from './customers.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';

const router = Router();

router.use(authenticate, branchScope);

// Customer Groups
router.get('/groups', requirePermission('business:manage_customers'), customersController.getCustomerGroups);
router.post('/groups', authorize('admin', 'manager'), requirePermission('business:manage_customers'), customersController.createCustomerGroup);
router.put('/groups/:id', authorize('admin', 'manager'), requirePermission('business:manage_customers'), customersController.updateCustomerGroup);
router.delete('/groups/:id', authorize('admin'), requirePermission('business:manage_customers'), customersController.deleteCustomerGroup);

// Customers
router.get('/', authorize('admin', 'manager', 'cashier'), customersController.getCustomers);
router.get('/:id', authorize('admin', 'manager', 'cashier'), customersController.getCustomerById);
router.get('/:id/statement', authorize('admin', 'manager', 'cashier'), customersController.getCustomerStatement);
router.put('/:id/opening-balance', authorize('admin', 'manager'), requirePermission('business:manage_customers'), customersController.setCustomerOpeningBalance);
router.post('/', authorize('admin', 'manager'), requirePermission('business:manage_customers'), customersController.createCustomer);
router.put('/:id', authorize('admin', 'manager'), requirePermission('business:manage_customers'), customersController.updateCustomer);
router.delete('/:id', authorize('admin'), requirePermission('business:manage_customers'), customersController.deleteCustomer);

export default router;
