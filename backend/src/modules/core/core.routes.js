import { Router } from 'express';
import * as controller from './core.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import { validate } from '../../middleware/validate.js';
import {
  createCompanySchema,
  updateCompanySchema,
  createBranchSchema,
  updateBranchSchema,
  createSettingSchema,
  updateSettingSchema,
} from './core.validation.js';

const router = Router();

// Health (public — no auth)
router.get('/health', (req, res) => res.json({ success: true, module: 'core' }));

// Protected routes
router.use(authenticate, branchScope);

// Companies
router.get('/companies', requirePermission('admin:manage_permissions'), controller.getCompanies);
router.get('/companies/:id', requirePermission('admin:manage_permissions'), controller.getCompanyById);
router.post('/companies', authorize('admin'), requirePermission('admin:manage_users'), validate(createCompanySchema), controller.createCompany);
router.put('/companies/:id', authorize('admin'), requirePermission('admin:manage_users'), validate(updateCompanySchema), controller.updateCompany);
router.delete('/companies/:id', authorize('admin'), requirePermission('admin:manage_users'), controller.deleteCompany);

// Branches
router.get('/branches', requirePermission('admin:manage_permissions'), controller.getBranches);
router.get('/branches/:id', requirePermission('admin:manage_permissions'), controller.getBranchById);
router.post('/branches', authorize('admin'), requirePermission('admin:manage_users'), validate(createBranchSchema), controller.createBranch);
router.put('/branches/:id', authorize('admin'), requirePermission('admin:manage_users'), validate(updateBranchSchema), controller.updateBranch);
router.delete('/branches/:id', authorize('admin'), requirePermission('admin:manage_users'), controller.deleteBranch);

// Settings
router.get('/settings', requirePermission('admin:manage_permissions'), controller.getSettings);
router.get('/settings/:id', requirePermission('admin:manage_permissions'), controller.getSettingById);
router.post('/settings', authorize('admin'), requirePermission('admin:manage_users'), validate(createSettingSchema), controller.createSetting);
router.put('/settings/:id', authorize('admin'), requirePermission('admin:manage_users'), validate(updateSettingSchema), controller.updateSetting);
router.delete('/settings/:id', authorize('admin'), requirePermission('admin:manage_users'), controller.deleteSetting);

export default router;
