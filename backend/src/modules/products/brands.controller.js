import * as brandsService from './brands.service.js';
import { createBrandSchema, updateBrandSchema } from './brands.validation.js';

export const getBrands = async (req, res, next) => {
  try {
    res.json(await brandsService.getBrands());
  } catch (err) { next(err); }
};

export const getBrandById = async (req, res, next) => {
  try {
    res.json(await brandsService.getBrandById(req.params.id));
  } catch (err) { next(err); }
};

export const createBrand = async (req, res, next) => {
  try {
    const data = createBrandSchema.parse(req.body);
    res.status(201).json(await brandsService.createBrand({ ...data, user_id: req.user.userId }));
  } catch (err) { next(err); }
};

export const updateBrand = async (req, res, next) => {
  try {
    const data = updateBrandSchema.parse(req.body);
    res.json(await brandsService.updateBrand(req.params.id, { ...data, user_id: req.user.userId }));
  } catch (err) { next(err); }
};

export const deleteBrand = async (req, res, next) => {
  try {
    await brandsService.deleteBrand(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف العلامة التجارية' });
  } catch (err) { next(err); }
};