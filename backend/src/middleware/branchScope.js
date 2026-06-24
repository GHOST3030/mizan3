// Branch isolation middleware
// Forces req.user.branchId for non-admin users
// Only affects endpoints that use branch_id in query/body

export const branchScope = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'super_admin') return next();

  const userBranchId = req.user?.branchId;
  if (!userBranchId) {
    return res.status(403).json({ message: 'حسابك غير مرتبط بأي فرع' });
  }

  // GET — inject branch_id into query if missing, validate if present
  if (req.method === 'GET') {
    if (req.query.branch_id && req.query.branch_id !== userBranchId) {
      return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى بيانات هذا الفرع' });
    }
    if (!req.query.branch_id) {
      req.query.branch_id = userBranchId;
    }
    return next();
  }

  // POST / PUT / PATCH / DELETE — validate branch_id in body
  if (req.body && typeof req.body === 'object') {
    if (req.body.branch_id && req.body.branch_id !== userBranchId) {
      return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى بيانات هذا الفرع' });
    }
  }

  next();
};

// For endpoints with from_branch_id / to_branch_id (stock transfers)
export const branchScopeTransfer = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'super_admin') return next();

  const userBranchId = req.user?.branchId;
  if (!userBranchId) {
    return res.status(403).json({ message: 'حسابك غير مرتبط بأي فرع' });
  }

  if (req.query.from_branch_id && req.query.from_branch_id !== userBranchId) {
    return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى بيانات هذا الفرع' });
  }
  if (req.query.to_branch_id && req.query.to_branch_id !== userBranchId) {
    return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى بيانات هذا الفرع' });
  }
  if (req.body?.from_branch_id && req.body.from_branch_id !== userBranchId) {
    return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى بيانات هذا الفرع' });
  }

  next();
};
