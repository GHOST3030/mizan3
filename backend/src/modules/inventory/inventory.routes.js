import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope, branchScopeTransfer } from '../../middleware/branchScope.js';
import { PERMISSIONS } from '../../middleware/permissions.js';

const P = PERMISSIONS;
const router = Router();

router.use(authenticate, branchScope);

// Warehouses
router.get('/warehouses', requirePermission('inventory:manage'), inventoryController.getWarehouses);
router.post('/warehouses', authorize('admin', 'manager'), requirePermission('inventory:manage'), inventoryController.createWarehouse);
router.put('/warehouses/:id', authorize('admin', 'manager'), requirePermission('inventory:manage'), inventoryController.updateWarehouse);
router.delete('/warehouses/:id', authorize('admin'), requirePermission('inventory:manage'), inventoryController.deleteWarehouse);

// Inventory Balance
router.get('/low-stock', requirePermission('inventory:manage'), inventoryController.getLowStockProducts);
router.get('/balance', requirePermission('inventory:manage'), inventoryController.getInventoryBalance);
router.get('/balance/:product_id', requirePermission('inventory:manage'), inventoryController.getProductStock);

// Stock Movements
router.get('/movements', requirePermission(P.INVENTORY_MOVEMENT_VIEW), inventoryController.getStockMovements);
router.post('/movements', authorize('admin', 'manager'), requirePermission(P.INVENTORY_TRANSFER), inventoryController.createStockMovement);
router.delete('/movements/:id', authorize('admin'), requirePermission('inventory:adjustment'), inventoryController.deleteStockMovement);

// Stock Counts
router.get('/stock-counts', requirePermission(P.INVENTORY_COUNT), inventoryController.getStockCounts);
router.post('/stock-counts', authorize('admin', 'manager'), requirePermission(P.INVENTORY_COUNT), inventoryController.createStockCount);
router.post('/stock-counts/:id/approve', authorize('admin', 'manager'), requirePermission('inventory:count'), inventoryController.approveStockCount);

// Stock Transfers (need branchScopeTransfer for from_branch_id / to_branch_id)
router.get('/stock-transfers', branchScopeTransfer, requirePermission(P.INVENTORY_TRANSFER), inventoryController.getStockTransfers);
router.get('/stock-transfers/:id', branchScopeTransfer, requirePermission(P.INVENTORY_TRANSFER), inventoryController.getStockTransferById);
router.post('/stock-transfers', branchScopeTransfer, authorize('admin', 'manager'), requirePermission(P.INVENTORY_TRANSFER), inventoryController.createStockTransfer);
router.post('/stock-transfers/:id/approve', branchScopeTransfer, authorize('admin', 'manager'), requirePermission('inventory:transfer'), inventoryController.approveStockTransfer);
router.post('/stock-transfers/:id/cancel', branchScopeTransfer, authorize('admin', 'manager'), requirePermission('inventory:transfer'), inventoryController.cancelStockTransfer);

// Wastage / Missing
router.get('/wastage', requirePermission(P.INVENTORY_WASTAGE), inventoryController.getWastageMovements);
router.post('/wastage', authorize('admin', 'manager'), requirePermission(P.INVENTORY_WASTAGE), inventoryController.createWastage);

export default router;
