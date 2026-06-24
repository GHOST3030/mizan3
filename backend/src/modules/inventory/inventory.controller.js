import * as inventoryService from './inventory.service.js';
import {
  createWarehouseSchema, updateWarehouseSchema,
  searchBalanceSchema, searchMovementSchema, createMovementSchema,
  searchStockCountSchema, createStockCountSchema,
  createStockTransferSchema, searchStockTransferSchema,
  createWastageSchema, searchWastageSchema,
} from './inventory.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

// ─── Warehouses ──────────────────────────────────────

export const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await inventoryService.getWarehouses(req.query.branch_id);
    res.json(warehouses);
  } catch (err) { next(err); }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const data = createWarehouseSchema.parse({ ...req.body, created_by: req.user.userId });
    const wh = await inventoryService.createWarehouse(data);
    res.status(201).json(wh);
  } catch (err) { next(err); }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const data = updateWarehouseSchema.parse({ ...req.body, updated_by: req.user.userId });
    const wh = await inventoryService.updateWarehouse(req.params.id, data);
    res.json(wh);
  } catch (err) { next(err); }
};

export const deleteWarehouse = async (req, res, next) => {
  try {
    await inventoryService.deleteWarehouse(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف المستودع' });
  } catch (err) { next(err); }
};

// ─── Inventory Balance ───────────────────────────────

export const getInventoryBalance = async (req, res, next) => {
  try {
    const query = searchBalanceSchema.parse(req.query);
    const result = await inventoryService.getInventoryBalance(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'inventory', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getProductStock = async (req, res, next) => {
  try {
    const result = await inventoryService.getProductStock(req.params.product_id, req.query.branch_id);
    const sanitized = await sanitizeResponse(req.user.userId, 'inventory', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

// ─── Stock Movements ─────────────────────────────────

export const getStockMovements = async (req, res, next) => {
  try {
    const query = searchMovementSchema.parse(req.query);
    const result = await inventoryService.getStockMovements(query);
    res.json(result);
  } catch (err) { next(err); }
};

export const createStockMovement = async (req, res, next) => {
  try {
    const data = createMovementSchema.parse({ ...req.body, created_by: req.user.userId });
    const movement = await inventoryService.createStockMovement(data);
    res.status(201).json(movement);
  } catch (err) { next(err); }
};

export const deleteStockMovement = async (req, res, next) => {
  try {
    await inventoryService.deleteStockMovement(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الحركة' });
  } catch (err) { next(err); }
};

// ─── Stock Counts ────────────────────────────────────

export const getStockCounts = async (req, res, next) => {
  try {
    const query = searchStockCountSchema.parse(req.query);
    const result = await inventoryService.getStockCounts(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'inventory', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createStockCount = async (req, res, next) => {
  try {
    const data = createStockCountSchema.parse(req.body);
    const count = await inventoryService.createStockCount(data);
    res.status(201).json(count);
  } catch (err) { next(err); }
};

export const approveStockCount = async (req, res, next) => {
  try {
    const result = await inventoryService.approveStockCount(req.params.id, req.user.userId);
    res.json({ message: 'تم اعتماد الجرد', result });
  } catch (err) { next(err); }
};

// ─── Stock Transfers ────────────────────────────────

export const getStockTransfers = async (req, res, next) => {
  try {
    const query = searchStockTransferSchema.parse(req.query);
    const result = await inventoryService.getStockTransfers(query);
    res.json(result);
  } catch (err) { next(err); }
};

export const getStockTransferById = async (req, res, next) => {
  try {
    const result = await inventoryService.getStockTransferById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'التحويل غير موجود' });
    res.json(result);
  } catch (err) { next(err); }
};

export const createStockTransfer = async (req, res, next) => {
  try {
    const data = createStockTransferSchema.parse({ ...req.body, created_by: req.user.userId });
    const transfer = await inventoryService.createStockTransfer(data);
    res.status(201).json(transfer);
  } catch (err) { next(err); }
};

export const approveStockTransfer = async (req, res, next) => {
  try {
    const result = await inventoryService.approveStockTransfer(req.params.id, req.user.userId);
    res.json({ message: 'تم اعتماد تحويل المخزون', result });
  } catch (err) { next(err); }
};

export const cancelStockTransfer = async (req, res, next) => {
  try {
    const result = await inventoryService.cancelStockTransfer(req.params.id, req.user.userId);
    res.json({ message: 'تم إلغاء التحويل', result });
  } catch (err) { next(err); }
};

// ─── Wastage / Missing ────────────────────────────────

export const getWastageMovements = async (req, res, next) => {
  try {
    const query = searchWastageSchema.parse(req.query);
    const result = await inventoryService.getWastageMovements(query);
    res.json(result);
  } catch (err) { next(err); }
};

export const createWastage = async (req, res, next) => {
  try {
    const data = createWastageSchema.parse({ ...req.body, created_by: req.user.userId });
    const movement = await inventoryService.createWastage(data);
    res.status(201).json({ message: 'تم تسجيل التالف/المفقود', movement });
  } catch (err) { next(err); }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    const result = await inventoryService.getLowStockProducts(req.branchId);
    const sanitized = await sanitizeResponse(req.user.userId, 'inventory', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};
