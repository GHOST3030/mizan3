import { log } from '../audit/audit.service.js';
import * as authService from './auth.service.js';
import { loginSchema, createUserSchema, updateUserSchema } from './auth.validation.js';

export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    log({
      action: 'login', entity: 'user', entity_id: result.user.id,
      branch_id: result.user.branch?.id, user_id: result.user.id,
      metadata: { username: data.username, success: true },
    }).catch(() => {});
    res.json(result);
  } catch (err) {
    const username = req.body?.username || 'unknown';
    log({
      action: 'login', entity: 'user', entity_id: null,
      branch_id: null, user_id: null,
      metadata: { username, success: false, error: err.message },
    }).catch(() => {});
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await authService.getUsers({ branchId: req.user.branchId });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const data = createUserSchema.parse({ ...req.body, created_by: req.user.userId });
    const user = await authService.createUser(data);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    if (req.body.role && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'تغيير الصلاحية متاح فقط للمدير العام' });
    }
    const data = updateUserSchema.parse({ ...req.body, updated_by: req.user.userId });
    const user = await authService.updateUser(req.params.id, data, req.body.role);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await authService.deleteUser(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (err) {
    next(err);
  }
};