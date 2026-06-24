import { Router } from 'express';
import * as permissionsController from './permissions.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

// Roles
router.get('/roles', authorize('admin', 'super_admin'), permissionsController.getRoles);
router.get('/roles/:id', authorize('admin', 'super_admin'), permissionsController.getRoleById);
router.post('/roles', authorize('super_admin', 'admin'), requirePermission('admin:manage_roles'), permissionsController.createRole);
router.put('/roles/:id', authorize('super_admin', 'admin'), requirePermission('admin:manage_roles'), permissionsController.updateRole);
router.delete('/roles/:id', authorize('super_admin'), requirePermission('admin:manage_permissions'), permissionsController.deleteRole);

// Permissions
router.get('/permissions', authorize('super_admin', 'admin'), permissionsController.getPermissions);

// Role-Permission assignments
router.get('/roles/:id/permissions', authorize('super_admin', 'admin'), permissionsController.getRolePermissions);
router.put('/roles/:id/permissions', authorize('super_admin', 'admin'), requirePermission('admin:manage_permissions'), permissionsController.setRolePermissions);

// User-Permission overrides
router.get('/users/:id/permissions', authorize('super_admin', 'admin'), permissionsController.getUserPermissions);
router.post('/users/:id/permissions', authorize('super_admin', 'admin'), requirePermission('admin:manage_permissions'), permissionsController.setUserPermission);
router.delete('/users/:id/permissions/:permissionId', authorize('super_admin', 'admin'), requirePermission('admin:manage_permissions'), permissionsController.deleteUserPermission);

export default router;
