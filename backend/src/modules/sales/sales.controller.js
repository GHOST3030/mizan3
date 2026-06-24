import * as salesService from './sales.service.js';
import {
  createSaleSchema, updateSaleStatusSchema, searchSaleSchema,
  cancelSaleSchema, reviewCancelSchema,
} from './sales.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

export const getSales = async (req, res, next) => {
  try {
    const query = searchSaleSchema.parse(req.query);
    if (req.user.role === 'cashier') {
      query.user_id = req.user.userId;
    }
    const result = await salesService.getSales(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getSaleById = async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', sale);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createSale = async (req, res, next) => {
  try {
    const data = createSaleSchema.parse({ ...req.body, created_by: req.user.userId });
    const sale = await salesService.createSale({ ...data, user_role: req.user.role });
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', sale);
    res.status(201).json(sanitized);
  } catch (err) { next(err); }
};

export const updateSaleStatus = async (req, res, next) => {
  try {
    const { status } = updateSaleStatusSchema.parse(req.body);
    const sale = await salesService.updateSaleStatus(req.params.id, status, req.user.userId);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', sale);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const deleteSale = async (req, res, next) => {
  try {
    await salesService.deleteSale(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الفاتورة' });
  } catch (err) { next(err); }
};

export const returnSale = async (req, res, next) => {
  try {
    const result = await salesService.returnSale(req.params.id, { ...req.body, user_id: req.user.userId });
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const cancelSale = async (req, res, next) => {
  try {
    const data = cancelSaleSchema.parse({ ...req.body, user_id: req.user.userId });
    const result = await salesService.cancelSale(req.params.id, data);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const reviewCancelSale = async (req, res, next) => {
  try {
    const data = reviewCancelSchema.parse(req.body);
    const result = await salesService.reviewCancelSale(req.params.id, { ...data, reviewer_id: req.user.userId });
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const holdSale = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.userId, user_id: req.user.userId, user_role: req.user.role };
    const sale = await salesService.holdSale(data);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', sale);
    res.status(201).json(sanitized);
  } catch (err) { next(err); }
};

export const getHeldSales = async (req, res, next) => {
  try {
    const sales = await salesService.getHeldSales(req.user.branchId);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', sales);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const resumeSale = async (req, res, next) => {
  try {
    const sale = await salesService.resumeSale(req.params.id, req.user.userId);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', sale);
    res.json(sanitized);
  } catch (err) { next(err); }
};

// ─── Payment Schedules ───────────────────────────────

export const getPaymentSchedules = async (req, res, next) => {
  try {
    const result = await salesService.getPaymentSchedules(req.query);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const paySchedule = async (req, res, next) => {
  try {
    const data = { ...req.body, user_id: req.user.userId };
    const result = await salesService.paySchedule(req.params.id, data);
    const sanitized = await sanitizeResponse(req.user.userId, 'sales', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};
