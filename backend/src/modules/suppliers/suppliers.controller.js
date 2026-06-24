import * as suppliersService from './suppliers.service.js';
import {
  createSupplierCategorySchema, updateSupplierCategorySchema,
  createSupplierSchema, updateSupplierSchema, searchSupplierSchema,
  setOpeningBalanceSchema,
} from './suppliers.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

// ─── Supplier Categories ─────────────────────────────

export const getSupplierCategories = async (req, res, next) => {
  try {
    const cats = await suppliersService.getSupplierCategories();
    res.json(cats);
  } catch (err) { next(err); }
};

export const createSupplierCategory = async (req, res, next) => {
  try {
    const data = createSupplierCategorySchema.parse(req.body);
    const cat = await suppliersService.createSupplierCategory({ ...data, user_id: req.user.userId });
    res.status(201).json(cat);
  } catch (err) { next(err); }
};

export const updateSupplierCategory = async (req, res, next) => {
  try {
    const data = updateSupplierCategorySchema.parse(req.body);
    const cat = await suppliersService.updateSupplierCategory(req.params.id, { ...data, user_id: req.user.userId });
    res.json(cat);
  } catch (err) { next(err); }
};

export const deleteSupplierCategory = async (req, res, next) => {
  try {
    await suppliersService.deleteSupplierCategory(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف التصنيف' });
  } catch (err) { next(err); }
};

// ─── Suppliers ───────────────────────────────────────

export const getSuppliers = async (req, res, next) => {
  try {
    const query = searchSupplierSchema.parse(req.query);
    const result = await suppliersService.getSuppliers(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'suppliers', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await suppliersService.getSupplierById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    const sanitized = await sanitizeResponse(req.user.userId, 'suppliers', supplier);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createSupplier = async (req, res, next) => {
  try {
    const data = createSupplierSchema.parse(req.body);
    const supplier = await suppliersService.createSupplier({ ...data, user_id: req.user.userId });
    res.status(201).json(supplier);
  } catch (err) { next(err); }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const data = updateSupplierSchema.parse(req.body);
    const supplier = await suppliersService.updateSupplier(req.params.id, { ...data, user_id: req.user.userId });
    res.json(supplier);
  } catch (err) { next(err); }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    await suppliersService.deleteSupplier(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف المورد' });
  } catch (err) { next(err); }
};

// ─── Opening Balance ───────────────────────────────────

export const setSupplierOpeningBalance = async (req, res, next) => {
  try {
    const data = setOpeningBalanceSchema.parse(req.body);
    const supplier = await suppliersService.setSupplierOpeningBalance(req.params.id, { ...data, user_id: req.user.userId });
    res.json(supplier);
  } catch (err) { next(err); }
};

// ─── Supplier Statement ───────────────────────────────

export const getSupplierStatement = async (req, res, next) => {
  try {
    const result = await suppliersService.getSupplierStatement(req.params.id, req.query);
    res.json(result);
  } catch (err) { next(err); }
};
