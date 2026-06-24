import * as tplService from './print-template.service.js';

export const getPrintTemplates = async (req, res, next) => {
  try {
    const result = await tplService.getPrintTemplates(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

export const getPrintTemplateById = async (req, res, next) => {
  try {
    const result = await tplService.getPrintTemplateById(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
};

export const createPrintTemplate = async (req, res, next) => {
  try {
    const result = await tplService.createPrintTemplate(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

export const updatePrintTemplate = async (req, res, next) => {
  try {
    const result = await tplService.updatePrintTemplate(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
};

export const deletePrintTemplate = async (req, res, next) => {
  try {
    await tplService.deletePrintTemplate(req.params.id);
    res.json({ message: 'تم حذف القالب' });
  } catch (err) { next(err); }
};

export const getDefaultTemplate = async (req, res, next) => {
  try {
    const { type } = req.query;
    const result = await tplService.getDefaultTemplate(type, req.user?.branchId);
    res.json(result);
  } catch (err) { next(err); }
};
