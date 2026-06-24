import * as permissionsService from './permissions.service.js';

export const getRoles = async (req, res, next) => {
  try {
    const roles = await permissionsService.getRoles();
    res.json(roles);
  } catch (err) { next(err); }
};

export const getRoleById = async (req, res, next) => {
  try {
    const role = await permissionsService.getRoleById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'الدور غير موجود' });
    res.json(role);
  } catch (err) { next(err); }
};

export const createRole = async (req, res, next) => {
  try {
    const role = await permissionsService.createRole({ ...req.body, created_by: req.user.userId });
    res.status(201).json(role);
  } catch (err) { next(err); }
};

export const updateRole = async (req, res, next) => {
  try {
    const role = await permissionsService.updateRole(req.params.id, { ...req.body, updated_by: req.user.userId });
    res.json(role);
  } catch (err) { next(err); }
};

export const deleteRole = async (req, res, next) => {
  try {
    await permissionsService.deleteRole(req.params.id, req.user.userId);
    res.json({ message: 'تم حذف الدور' });
  } catch (err) { next(err); }
};

export const getPermissions = async (req, res, next) => {
  try {
    const perms = await permissionsService.getPermissions();
    res.json(perms);
  } catch (err) { next(err); }
};

export const getRolePermissions = async (req, res, next) => {
  try {
    const perms = await permissionsService.getRolePermissions(req.params.id);
    res.json(perms);
  } catch (err) { next(err); }
};

export const setRolePermissions = async (req, res, next) => {
  try {
    const { permission_keys } = req.body;
    const perms = await permissionsService.setRolePermissions(req.params.id, permission_keys, req.user.userId);
    res.json(perms);
  } catch (err) { next(err); }
};

export const getUserPermissions = async (req, res, next) => {
  try {
    const perms = await permissionsService.getUserPermissions(req.params.id);
    res.json(perms);
  } catch (err) { next(err); }
};

export const setUserPermission = async (req, res, next) => {
  try {
    const { permission_id, granted } = req.body;
    const result = await permissionsService.setUserPermission(req.params.id, permission_id, granted, req.user.userId);
    res.json(result);
  } catch (err) { next(err); }
};

export const deleteUserPermission = async (req, res, next) => {
  try {
    await permissionsService.deleteUserPermission(req.params.id, req.params.permissionId, req.user.userId);
    res.json({ message: 'تم إزالة الصلاحية' });
  } catch (err) { next(err); }
};
