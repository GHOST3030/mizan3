import * as productsService from './products.service.js';
import { createProductSchema, updateProductSchema, searchProductSchema } from './products.validation.js';
import { sanitizeResponse } from '../../services/fieldSecurity.service.js';

export const getProducts = async (req, res, next) => {
  try {
    const query = searchProductSchema.parse(req.query);
    const result = await productsService.getProducts(query);
    const sanitized = await sanitizeResponse(req.user.userId, 'products', result);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productsService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    const sanitized = await sanitizeResponse(req.user.userId, 'products', product);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await productsService.getProductByBarcode(req.params.barcode);
    if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    const sanitized = await sanitizeResponse(req.user.userId, 'products', product);
    res.json(sanitized);
  } catch (err) { next(err); }
};

export const createProduct = async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await productsService.createProduct({ ...data, user_id: req.user.userId });
    res.status(201).json(product);
  } catch (err) { next(err); }
};

export const updateProduct = async (req, res, next) => {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await productsService.updateProduct(req.params.id, { ...data, user_id: req.user.userId });
    res.json(product);
  } catch (err) { next(err); }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await productsService.deleteProduct(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف المنتج' });
  } catch (err) { next(err); }
};