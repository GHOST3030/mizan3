import * as auditService from './audit.service.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getLogs(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
