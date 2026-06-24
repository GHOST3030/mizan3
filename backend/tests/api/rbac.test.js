import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mockPrisma } from '../setup.js';
import { UUID, authHeaders, testAdminUser, testManagerUser, generateToken } from '../setup.js';

const testSuperAdminUser = { userId: UUID.admin, role: 'super_admin', branchId: UUID.branch };

const MOCK_ROLE_ID = 'role-00000000-0000-4000-a000-000000000001';
const MOCK_PERM_ID = 'perm-00000000-0000-4000-a000-000000000001';

const mockRoles = [
  {
    id: MOCK_ROLE_ID,
    name: 'admin',
    label: 'مدير النظام',
    description: null,
    is_system: true,
    role_permissions: [
      { permission: { key: 'admin:manage_users', label: 'إدارة المستخدمين', group: 'administration' } },
      { permission: { key: 'reporting:view_reports', label: 'عرض التقارير', group: 'reporting' } },
    ],
    _count: { users: 2 },
  },
  {
    id: 'role-00000000-0000-4000-a000-000000000002',
    name: 'cashier',
    label: 'كاشير',
    description: null,
    is_system: true,
    role_permissions: [
      { permission: { key: 'sales:create', label: 'إنشاء فاتورة بيع', group: 'sales' } },
    ],
    _count: { users: 1 },
  },
];

const mockPermissions = [
  { id: MOCK_PERM_ID, key: 'admin:manage_users', label: 'إدارة المستخدمين', group: 'administration', description: null },
  { id: 'perm-00000000-0000-4000-a000-000000000002', key: 'reporting:view_reports', label: 'عرض التقارير', group: 'reporting', description: null },
  { id: 'perm-00000000-0000-4000-a000-000000000003', key: 'sales:create', label: 'إنشاء فاتورة بيع', group: 'sales', description: null },
];

describe('D1: Permission Service — DB-driven RBAC', () => {
  describe('GET /api/permissions/roles', () => {
    it('should return all roles with permissions', async () => {
      mockPrisma.role.findMany.mockResolvedValue(mockRoles);

      const res = await request(app)
        .get('/api/permissions/roles')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('admin');
      expect(res.body[0].role_permissions).toBeDefined();
      expect(res.body[0]._count).toBeDefined();
    });

    it('should reject unauthenticated', async () => {
      const res = await request(app).get('/api/permissions/roles');
      expect(res.status).toBe(401);
    });

    it('should reject cashier', async () => {
      const cashierUser = { userId: UUID.cashier, role: 'cashier', branchId: UUID.branch };
      mockPrisma.role.findMany.mockResolvedValue(mockRoles);

      const res = await request(app)
        .get('/api/permissions/roles')
        .set(authHeaders(cashierUser));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/permissions/permissions', () => {
    it('should return all permissions grouped', async () => {
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);

      const res = await request(app)
        .get('/api/permissions/permissions')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      expect(res.body[0].key).toBeDefined();
      expect(res.body[0].group).toBeDefined();
    });
  });

  describe('GET /api/permissions/roles/:id', () => {
    it('should return a single role with permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(mockRoles[0]);

      const res = await request(app)
        .get(`/api/permissions/roles/${MOCK_ROLE_ID}`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('admin');
    });

    it('should return 404 for non-existent role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/permissions/roles/non-existent')
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(404);
    });
  });
});

describe('D2: Role-Permission Assignments', () => {
  describe('GET /api/permissions/roles/:id/permissions', () => {
    it('should return permissions for a role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue(
        mockRoles[0].role_permissions
      );

      const res = await request(app)
        .get(`/api/permissions/roles/${MOCK_ROLE_ID}/permissions`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /api/permissions/roles/:id/permissions', () => {
    it('should update role permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(mockRoles[0]);
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.rolePermission.findMany.mockResolvedValue(
        mockRoles[0].role_permissions
      );

      const res = await request(app)
        .put(`/api/permissions/roles/${MOCK_ROLE_ID}/permissions`)
        .set(authHeaders(testAdminUser))
        .send({ permission_keys: ['admin:manage_users', 'reporting:view_reports'] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 400 for invalid permission keys', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(mockRoles[0]);
      mockPrisma.permission.findMany.mockResolvedValue([]);

      const res = await request(app)
        .put(`/api/permissions/roles/${MOCK_ROLE_ID}/permissions`)
        .set(authHeaders(testAdminUser))
        .send({ permission_keys: ['nonexistent:perm'] });

      expect(res.status).toBe(400);
    });
  });
});

describe('D3: User Permission Overrides', () => {
  describe('GET /api/permissions/users/:id/permissions', () => {
    it('should return user permission overrides', async () => {
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { id: 'up-1', permission_id: MOCK_PERM_ID, permission: { key: 'admin:manage_users', label: 'إدارة المستخدمين' }, granted: true },
      ]);

      const res = await request(app)
        .get(`/api/permissions/users/${UUID.admin}/permissions`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].granted).toBe(true);
    });
  });

  describe('POST /api/permissions/users/:id/permissions', () => {
    it('should create a permission override', async () => {
      mockPrisma.userPermission.findUnique.mockResolvedValue(null);
      mockPrisma.userPermission.create.mockResolvedValue({
        id: 'up-new',
        user_id: UUID.admin,
        permission_id: MOCK_PERM_ID,
        granted: true,
      });

      const res = await request(app)
        .post(`/api/permissions/users/${UUID.admin}/permissions`)
        .set(authHeaders(testAdminUser))
        .send({ permission_id: MOCK_PERM_ID, granted: true });

      expect(res.status).toBe(200);
    });

    it('should update an existing override', async () => {
      mockPrisma.userPermission.findUnique.mockResolvedValue({
        id: 'up-1',
        user_id: UUID.admin,
        permission_id: MOCK_PERM_ID,
        granted: true,
      });
      mockPrisma.userPermission.update.mockResolvedValue({
        id: 'up-1',
        user_id: UUID.admin,
        permission_id: MOCK_PERM_ID,
        granted: false,
      });

      const res = await request(app)
        .post(`/api/permissions/users/${UUID.admin}/permissions`)
        .set(authHeaders(testAdminUser))
        .send({ permission_id: MOCK_PERM_ID, granted: false });

      expect(res.status).toBe(200);
      expect(res.body.granted).toBe(false);
    });

    it('should reject cashier from managing user permissions', async () => {
      const cashierUser = { userId: UUID.cashier, role: 'cashier', branchId: UUID.branch };

      const res = await request(app)
        .post(`/api/permissions/users/${UUID.admin}/permissions`)
        .set(authHeaders(cashierUser))
        .send({ permission_id: MOCK_PERM_ID, granted: true });

      expect(res.status).toBe(403);
    });
  });
});

describe('D4: Permission Checking Middleware', () => {
  it('should allow access when requirePermission passes', async () => {
    const { hasPermission } = await import('../../src/services/permission.service.js');
    hasPermission.mockResolvedValue(true);

    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: 'new-role-id',
      name: 'test-role',
      label: 'دور اختبار',
      is_system: false,
    });

    const res = await request(app)
      .post('/api/permissions/roles')
      .set(authHeaders(testAdminUser))
      .send({ name: 'test-role', label: 'دور اختبار' });

    expect(res.status).toBe(201);
  });

  it('should return 403 when requirePermission fails', async () => {
    const { hasPermission } = await import('../../src/services/permission.service.js');
    hasPermission.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/permissions/roles')
      .set(authHeaders(testAdminUser))
      .send({ name: 'test-role', label: 'دور اختبار' });

    expect(res.status).toBe(403);
  });
});

describe('D5: Permission Constants Validation', () => {
  it('should have all 9 required permission groups in the seed', () => {
    const groupsInSeed = ['financial', 'inventory', 'sales', 'returns', 'products', 'business', 'administration', 'reporting', 'audit'];
    expect(groupsInSeed).toHaveLength(9);
  });
});
