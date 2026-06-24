import { auditStorage } from '../modules/audit/audit.service.js';

export const auditMeta = (req, res, next) => {
  auditStorage.run({
    ip_address: req.ip || req.connection?.remoteAddress || 'unknown',
    user_agent: req.headers['user-agent'] || 'unknown',
  }, next);
};
