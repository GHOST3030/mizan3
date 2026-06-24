import * as productUnitsService from './product-units.service.js';
import {
  createProductUnitSchema, updateProductUnitSchema, bulkSetProductUnitsSchema,
} from './product-units.validation.js';

export const getProductUnits = async (req, res, next) => {
  try {
    const units = await productUnitsService.getProductUnits(req.params.productId);
    res.json(units);
  } catch (err) { next(err); }
};

export const createProductUnit = async (req, res, next) => {
  try {
    const data = createProductUnitSchema.parse(req.body);
    const unit = await productUnitsService.createProductUnit(data);
    res.status(201).json(unit);
  } catch (err) { next(err); }
};

export const updateProductUnit = async (req, res, next) => {
  try {
    const data = updateProductUnitSchema.parse(req.body);
    const unit = await productUnitsService.updateProductUnit(req.params.id, data);
    res.json(unit);
  } catch (err) { next(err); }
};

export const deleteProductUnit = async (req, res, next) => {
  try {
    await productUnitsService.deleteProductUnit(req.params.id);
    res.json({ message: 'تم حذف الوحدة' });
  } catch (err) { next(err); }
};

export const bulkSetProductUnits = async (req, res, next) => {
  try {
    const { product_id, units } = bulkSetProductUnitsSchema.parse(req.body);
    const result = await productUnitsService.bulkSetProductUnits(product_id, units);
    res.json(result);
  } catch (err) { next(err); }
};
