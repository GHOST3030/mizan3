import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mockPrisma } from '../setup.js';
import { UUID, authHeaders, testAdminUser, testManagerUser, testCashierUser } from '../setup.js';

const { hasPermission } = await import('../../src/services/permission.service.js');

const SUPER = { userId: UUID.superAdmin, role: 'super_admin', branchId: UUID.branch };

beforeEach(() => {
  hasPermission.mockReset();
  hasPermission.mockResolvedValue(true);
});

describe('D6: requirePermission — Permission Denial (403)', () => {
  it('should deny sale creation without sales:create', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'sales:create');
    const res = await request(app)
      .post('/api/sales')
      .set(authHeaders(testCashierUser))
      .send({ items: [], payments: [] });
    expect(res.status).toBe(403);
  });

  it('should deny expense creation without expense:create', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'expense:create');
    const res = await request(app)
      .post('/api/finance/expenses')
      .set(authHeaders(testCashierUser))
      .send({ branch_id: UUID.branch, amount: 100, category_id: 'cat-1' });
    expect(res.status).toBe(403);
  });

  it('should deny user creation without admin:manage_users', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'admin:manage_users');
    const res = await request(app)
      .post('/api/auth/users')
      .send({ name: 'test', username: 'test', password: 'test', role: 'cashier', branch_id: 'b1' })
      .set(authHeaders(testManagerUser));
    expect(res.status).toBe(403);
  });

  it('should deny product deletion without products:manage', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'products:manage');
    const res = await request(app)
      .delete('/api/products/some-id')
      .set(authHeaders(testManagerUser));
    expect(res.status).toBe(403);
  });

  it('should deny supplier management without business:manage_suppliers', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'business:manage_suppliers');
    const res = await request(app)
      .post('/api/suppliers')
      .set(authHeaders(testManagerUser))
      .send({ name: 'Test', name_ar: 'اختبار', branch_id: UUID.branch });
    expect(res.status).toBe(403);
  });

  it('should deny customer management without business:manage_customers', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'business:manage_customers');
    const res = await request(app)
      .post('/api/customers')
      .set(authHeaders(testManagerUser))
      .send({ name: 'Test', name_ar: 'اختبار', branch_id: UUID.branch });
    expect(res.status).toBe(403);
  });

  it('should deny purchase creation without business:manage_purchases', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'business:manage_purchases');
    const res = await request(app)
      .post('/api/purchases')
      .set(authHeaders(testManagerUser))
      .send({ branch_id: UUID.branch, supplier_id: 's-1', items: [] });
    expect(res.status).toBe(403);
  });

  it('should deny audit log view without audit:view_logs', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'audit:view_logs');
    const res = await request(app)
      .get('/api/audit')
      .set(authHeaders(testManagerUser));
    expect(res.status).toBe(403);
  });

  it('should deny report export without reporting:export_reports', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'reporting:export_reports');
    const res = await request(app)
      .get('/api/reports/export')
      .set(authHeaders(testManagerUser));
    expect(res.status).toBe(403);
  });

  it('should deny role management without admin:manage_roles', async () => {
    hasPermission.mockImplementation(async (_uid, perm) => perm !== 'admin:manage_roles');
    const res = await request(app)
      .post('/api/permissions/roles')
      .set(authHeaders(testAdminUser))
      .send({ name: 'test', label: 'اختبار' });
    expect(res.status).toBe(403);
  });
});

describe('D7: requirePermission — Permission Granted (200)', () => {
  it('should allow user listing with admin:manage_users', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set(authHeaders(testAdminUser));
    expect(res.status).toBe(200);
  });

  it('should allow role viewing for admin', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/permissions/roles')
      .set(authHeaders(testAdminUser));
    expect(res.status).toBe(200);
  });

  it('should allow audit log view for authorized admin', async () => {
    mockPrisma.activityLog.findMany.mockResolvedValue([]);
    mockPrisma.activityLog.count.mockResolvedValue(0);
    const res = await request(app)
      .get('/api/audit')
      .set(authHeaders(testAdminUser));
    expect(res.status).toBe(200);
  });

  it('should allow expense category creation with expense:category:manage', async () => {
    mockPrisma.expenseCategory.findFirst.mockResolvedValue(null);
    mockPrisma.expenseCategory.create.mockResolvedValue({ id: 'ec-1', name: 'Rent', name_ar: 'إيجار' });
    const res = await request(app)
      .post('/api/finance/expense-categories')
      .set(authHeaders(testManagerUser))
      .send({ branch_id: UUID.branch, name: 'Rent', name_ar: 'إيجار' });
    expect(res.status).toBe(201);
  });

  it('should allow warehouse creation with inventory:manage', async () => {
    mockPrisma.warehouse.create.mockResolvedValue({ id: 'wh-1', name: 'WH', name_ar: 'مستودع' });
    const res = await request(app)
      .post('/api/inventory/warehouses')
      .set(authHeaders(testManagerUser))
      .send({ branch_id: UUID.branch, name: 'WH', name_ar: 'مستودع' });
    expect(res.status).toBe(201);
  });
});

describe('D8: Super Admin Bypass', () => {
  it('should allow super_admin to access any route even without explicit permission', async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(app)
      .get('/api/auth/users')
      .set(authHeaders(SUPER));
    expect(res.status).toBe(200);
  });

  it('should allow super_admin to manage roles', async () => {
    hasPermission.mockResolvedValue(false);
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({ id: 'r-1', name: 'test', label: 'اختبار', is_system: false });

    const res = await request(app)
      .post('/api/permissions/roles')
      .set(authHeaders(SUPER))
      .send({ name: 'test-role', label: 'دور اختبار' });
    expect(res.status).toBe(201);
  });
});

describe('D9: Permission Service — Cache & Overrides', () => {
  it('should clear cache when user permission is updated', async () => {
    const { clearCache } = await import('../../src/services/permission.service.js');

    mockPrisma.userPermission.findUnique.mockResolvedValue(null);
    mockPrisma.userPermission.create.mockResolvedValue({
      id: 'up-1', user_id: UUID.admin, permission_id: 'perm-1', granted: false,
    });

    const res = await request(app)
      .post(`/api/permissions/users/${UUID.admin}/permissions`)
      .set(authHeaders(SUPER))
      .send({ permission_id: 'perm-1', granted: false });

    expect(res.status).toBe(200);
    expect(clearCache).toHaveBeenCalledWith(UUID.admin);
  });

  it('should create a user permission grant override', async () => {
    mockPrisma.userPermission.findUnique.mockResolvedValue(null);
    mockPrisma.userPermission.create.mockResolvedValue({
      id: 'up-2', user_id: UUID.admin, permission_id: 'perm-2', granted: true,
    });

    const res = await request(app)
      .post(`/api/permissions/users/${UUID.admin}/permissions`)
      .set(authHeaders(SUPER))
      .send({ permission_id: 'perm-2', granted: true });

    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(true);
  });

  it('should delete a user permission override', async () => {
    mockPrisma.userPermission.findUnique.mockResolvedValue({
      id: 'up-3', user_id: UUID.admin, permission_id: 'perm-3', granted: false,
    });
    mockPrisma.userPermission.delete.mockResolvedValue({ id: 'up-3' });

    const res = await request(app)
      .delete(`/api/permissions/users/${UUID.admin}/permissions/perm-3`)
      .set(authHeaders(SUPER));

    expect(res.status).toBe(200);
  });
});

describe('D10: Route Protection — Unauthenticated Access', () => {
  const protectedRoutes = [
    ['get', '/api/finance/expenses'],
    ['get', '/api/sales'],
    ['post', '/api/sales'],
    ['get', '/api/products'],
    ['post', '/api/products'],
    ['get', '/api/purchases'],
    ['post', '/api/purchases'],
    ['get', '/api/auth/users'],
    ['post', '/api/auth/users'],
    ['get', '/api/permissions/roles'],
    ['get', '/api/permissions/permissions'],
    ['get', '/api/audit'],
    ['get', '/api/reports/export'],
    ['get', '/api/inventory/warehouses'],
    ['post', '/api/inventory/warehouses'],
    ['get', '/api/suppliers'],
    ['post', '/api/suppliers'],
    ['get', '/api/customers'],
    ['post', '/api/customers'],
  ];

  it.each(protectedRoutes)('%s %s should return 401 without auth', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});
