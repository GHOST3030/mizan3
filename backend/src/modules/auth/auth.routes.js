import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';

const router = Router();

// عام — لا يحتاج token
router.post('/login', authController.login);

// محمي — يحتاج تسجيل دخول
router.get('/users', authenticate, authorize('admin', 'manager'), authController.getUsers);
router.post('/users', authenticate, authorize('admin'), requirePermission('admin:manage_users'), authController.createUser);
router.put('/users/:id', authenticate, authorize('admin', 'manager'), requirePermission('admin:manage_users'), authController.updateUser);
router.delete('/users/:id', authenticate, authorize('admin'), requirePermission('admin:manage_users'), authController.deleteUser);

export default router;