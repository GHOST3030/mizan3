import * as categoriesService from './categories.service.js';
import { createCategorySchema, updateCategorySchema } from './categories.validation.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await categoriesService.getCategories();
    res.json(categories);
  } catch (err) { next(err); }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoriesService.getCategoryById(req.params.id);
    res.json(category);
  } catch (err) { next(err); }
};

export const createCategory = async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await categoriesService.createCategory({ ...data, user_id: req.user.userId });
    res.status(201).json(category);
  } catch (err) { next(err); }
};

export const updateCategory = async (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await categoriesService.updateCategory(req.params.id, { ...data, user_id: req.user.userId });
    res.json(category);
  } catch (err) { next(err); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await categoriesService.deleteCategory(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف التصنيف' });
  } catch (err) { next(err); }
};