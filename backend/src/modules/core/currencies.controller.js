import * as currenciesService from './currencies.service.js';
import { createCurrencySchema, updateCurrencySchema } from './currencies.validation.js';

export const getCurrencies = async (req, res, next) => {
  try {
    const currencies = await currenciesService.getCurrencies();
    res.json(currencies);
  } catch (err) { next(err); }
};

export const getCurrencyById = async (req, res, next) => {
  try {
    const currency = await currenciesService.getCurrencyById(req.params.id);
    res.json(currency);
  } catch (err) { next(err); }
};

export const createCurrency = async (req, res, next) => {
  try {
    const data = createCurrencySchema.parse(req.body);
    const currency = await currenciesService.createCurrency(data);
    res.status(201).json(currency);
  } catch (err) { next(err); }
};

export const updateCurrency = async (req, res, next) => {
  try {
    const data = updateCurrencySchema.parse(req.body);
    const currency = await currenciesService.updateCurrency(req.params.id, data);
    res.json(currency);
  } catch (err) { next(err); }
};

export const deleteCurrency = async (req, res, next) => {
  try {
    await currenciesService.deleteCurrency(req.params.id);
    res.json({ message: 'تم حذف العملة' });
  } catch (err) { next(err); }
};

export const setDefaultCurrency = async (req, res, next) => {
  try {
    const currency = await currenciesService.setDefaultCurrency(req.params.id);
    res.json(currency);
  } catch (err) { next(err); }
};