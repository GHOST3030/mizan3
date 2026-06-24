import * as safeService from './safe.service.js';
import { createSafeBoxSchema, updateSafeBoxSchema, createSafeMovementSchema } from './safe.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

// ─── Safe Boxes ───────────────────────────────────────

export const getSafeBoxes = async (req, res, next) => {
  try {
    const safes = await safeService.getSafeBoxes(req.query.branch_id);
    const sanitized = await sanitizeResponse(req.user.userId, 'finance', safes);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createSafeBox = async (req, res, next) => {
  try {
    const data = createSafeBoxSchema.parse({ ...req.body, created_by: req.user.userId });
    const safe = await safeService.createSafeBox(data);
    res.status(201).json(safe);
  } catch (err) { next(err); }
};

export const updateSafeBox = async (req, res, next) => {
  try {
    const data = updateSafeBoxSchema.parse({ ...req.body, updated_by: req.user.userId });
    const safe = await safeService.updateSafeBox(req.params.id, data);
    res.json(safe);
  } catch (err) { next(err); }
};

export const deleteSafeBox = async (req, res, next) => {
  try {
    await safeService.deleteSafeBox(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الخزنة' });
  } catch (err) { next(err); }
};

// ─── Safe Movements ───────────────────────────────────

export const getSafeMovements = async (req, res, next) => {
  try {
    const result = await safeService.getSafeMovements(req.query);
    const sanitized = await sanitizeResponse(req.user.userId, 'finance', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createSafeMovement = async (req, res, next) => {
  try {
    const data = createSafeMovementSchema.parse({ ...req.body, created_by: req.user.userId });
    const movement = await safeService.createSafeMovement(data);
    res.status(201).json(movement);
  } catch (err) { next(err); }
};
