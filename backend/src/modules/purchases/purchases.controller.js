import * as purchasesService from './purchases.service.js';
import {
  createPurchaseSchema, updatePurchaseStatusSchema, updatePurchaseSchema, searchPurchaseSchema,
} from './purchases.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

export const getPurchases = async (req, res, next) => {
  try {
    const query = searchPurchaseSchema.parse(req.query);
    const result = await purchasesService.getPurchases(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await purchasesService.getPurchaseById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'المشتريات غير موجودة' });
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', purchase);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createPurchase = async (req, res, next) => {
  try {
    const data = createPurchaseSchema.parse({ ...req.body, created_by: req.user.userId });
    const purchase = await purchasesService.createPurchase({ ...data, user_role: req.user.role });
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', purchase);
    res.status(201).json(sanitized);
  } catch (err) { next(err); }
};

export const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { status } = updatePurchaseStatusSchema.parse(req.body);
    const purchase = await purchasesService.updatePurchaseStatus(req.params.id, status, req.user.userId);
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', purchase);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const updatePurchase = async (req, res, next) => {
  try {
    const data = updatePurchaseSchema.parse({ ...req.body, user_id: req.user.userId });
    const purchase = await purchasesService.updatePurchase(req.params.id, data);
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', purchase);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const deletePurchase = async (req, res, next) => {
  try {
    await purchasesService.deletePurchase(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الفاتورة' });
  } catch (err) { next(err); }
};

export const returnPurchase = async (req, res, next) => {
  try {
    const result = await purchasesService.returnPurchase(req.params.id, { ...req.body, user_id: req.user.userId });
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const cancelPurchase = async (req, res, next) => {
  try {
    const result = await purchasesService.cancelPurchase(req.params.id, { reason: req.body.reason, user_id: req.user.userId });
    const sanitized = await sanitizeResponse(req.user.userId, 'purchases', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};
