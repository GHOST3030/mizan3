import * as unitsService from './units.service.js';
import { createUnitSchema, updateUnitSchema } from './units.validation.js';

export const getUnits = async (req, res, next) => {
  try {
    res.json(await unitsService.getUnits());
  } catch (err) { next(err); }
};

export const getUnitById = async (req, res, next) => {
  try {
    res.json(await unitsService.getUnitById(req.params.id));
  } catch (err) { next(err); }
};

export const createUnit = async (req, res, next) => {
  try {
    const data = createUnitSchema.parse(req.body);
    res.status(201).json(await unitsService.createUnit({ ...data, user_id: req.user.userId }));
  } catch (err) { next(err); }
};

export const updateUnit = async (req, res, next) => {
  try {
    const data = updateUnitSchema.parse(req.body);
    res.json(await unitsService.updateUnit(req.params.id, { ...data, user_id: req.user.userId }));
  } catch (err) { next(err); }
};

export const deleteUnit = async (req, res, next) => {
  try {
    await unitsService.deleteUnit(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الوحدة' });
  } catch (err) { next(err); }
};