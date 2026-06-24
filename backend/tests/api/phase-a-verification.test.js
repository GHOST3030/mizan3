import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { mockPrisma, authHeaders, testAdminUser, testManagerUser, testCashierUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  branchA: '00000000-0000-4000-a000-000000000010',
  branchB: '00000000-0000-4000-a000-000000000099',
  sale: '00000000-0000-4000-a000-000000000050',
  product: '00000000-0000-4000-a000-000000000060',
};

// User from a DIFFERENT branch
const otherBranchManager = { userId: '00000000-0000-4000-a000-000000000777', role: 'manager', branchId: UUID.branchB };
const otherBranchCashier = { userId: '00000000-0000-4000-a000-000000000888', role: 'cashier', branchId: UUID.branchB };

const authHeadersOther = (user = otherBranchManager) => ({
  Authorization: `Bearer ${jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })}`,
});

beforeEach(() => {
  resetMocks();
});

// ═══════════════════════════════════════════════
// 1. Branch Isolation — Manager cannot access another branch
// ═══════════════════════════════════════════════
describe('A1: Branch Isolation (branchScope)', () => {
  describe('GET — branch_id in query does not match user branch', () => {
    it('should return 403 when manager requests another branch via query param', async () => {
      const res = await request(app)
        .get('/api/finance/expenses')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });

    it('should return 403 when manager requests a sale from another branch', async () => {
      const res = await request(app)
        .get('/api/sales')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });

    it('should return 403 when cashier requests another branch products', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ branch_id: UUID.branchB })
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });

    it('should allow manager own branch access (no branch_id in query — auto-inject)', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/finance/expenses')
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });
  });

  describe('POST — branch_id in body does not match user branch', () => {
    it('should return 403 when manager creates expense category with wrong branch', async () => {
      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testManagerUser))
        .send({ branch_id: UUID.branchB, name: 'Rent', name_ar: 'إيجار' });

      expect(res.status).toBe(403);
    });

    it('should return 403 when manager creates product under wrong branch', async () => {
      const res = await request(app)
        .post('/api/products')
        .set(authHeaders(testManagerUser))
        .send({ branch_id: UUID.branchB, name: 'Test', name_ar: 'اختبار' });

      expect(res.status).toBe(403);
    });

    it('should allow manager to create in own branch', async () => {
      mockPrisma.expenseCategory.create.mockResolvedValue({ id: 'x', name: 'Rent', name_ar: 'إيجار' });
      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testManagerUser))
        .send({ branch_id: UUID.branchA, name: 'Rent', name_ar: 'إيجار' });

      expect(res.status).toBe(201);
    });
  });

  describe('PUT — branch_id in body does not match user branch', () => {
    it('should return 403 when updating expense with wrong branch', async () => {
      const res = await request(app)
        .put('/api/finance/expenses/some-id')
        .set(authHeaders(testManagerUser))
        .send({ branch_id: UUID.branchB, amount: 1000 });

      expect(res.status).toBe(403);
    });
  });
});

// ═══════════════════════════════════════════════
// 2. Admin bypasses branch isolation
// ═══════════════════════════════════════════════
describe('A1: Admin bypasses branchScope', () => {
  it('should allow admin to access any branch via GET', async () => {
    mockPrisma.sale.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/sales')
      .query({ branch_id: UUID.branchB })
      .set(authHeaders(testAdminUser));

    expect(res.status).toBe(200);
  });

  it('should allow admin to POST with any branch_id', async () => {
    mockPrisma.expenseCategory.create.mockResolvedValue({ id: 'x', name: 'Rent', name_ar: 'إيجار' });
    const res = await request(app)
      .post('/api/finance/expense-categories')
      .set(authHeaders(testAdminUser))
      .send({ branch_id: UUID.branchB, name: 'Rent', name_ar: 'إيجار' });

    expect(res.status).toBe(201);
  });
});

// ═══════════════════════════════════════════════
// 3. Role escalation fix
// ═══════════════════════════════════════════════
describe('A2: Role Escalation Protection', () => {
  it('should return 403 when manager tries to change a user role to admin', async () => {
    const res = await request(app)
      .put('/api/auth/users/some-id')
      .set(authHeaders(testManagerUser))
      .send({ role: 'admin', name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('should return 403 when manager tries to change a user role to manager', async () => {
    const res = await request(app)
      .put('/api/auth/users/some-id')
      .set(authHeaders(testManagerUser))
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
  });

  it('should allow admin to change user role', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'some-id', branch_id: UUID.branchA, role: 'cashier' });
    mockPrisma.user.update.mockResolvedValue({ id: 'some-id', name: 'Test', username: 'test', role: 'manager', is_active: true });
    const res = await request(app)
      .put('/api/auth/users/some-id')
      .set(authHeaders(testAdminUser))
      .send({ role: 'manager', name: 'Test' });

    expect(res.status).toBe(200);
  });

  it('should allow manager to update user name without role', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'some-id', branch_id: UUID.branchA, role: 'cashier' });
    mockPrisma.user.update.mockResolvedValue({ id: 'some-id', name: 'Updated', username: 'test', role: 'cashier', is_active: true });
    const res = await request(app)
      .put('/api/auth/users/some-id')
      .set(authHeaders(testManagerUser))
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════
// 4. JWT secret change — old secrets rejected
// ═══════════════════════════════════════════════
describe('A3: JWT Secret Change', () => {
  it('should return 401 for token signed with old/wrong secret', async () => {
    const wrongToken = jwt.sign(
      { userId: 'test', role: 'admin', branchId: UUID.branchA },
      'old_mizan_super_secret_2026',
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/finance/expenses')
      .set({ Authorization: `Bearer ${wrongToken}` });

    expect(res.status).toBe(401);
  });

  it('should return 401 for token signed with random secret', async () => {
    const wrongToken = jwt.sign(
      { userId: 'test', role: 'admin', branchId: UUID.branchA },
      'some_random_other_secret',
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/finance/expenses')
      .set({ Authorization: `Bearer ${wrongToken}` });

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════
// 5. Existing workflows still work
// ═══════════════════════════════════════════════
describe('A4: Existing Workflows Still Work', () => {
  it('should allow unauthenticated access to health endpoint', async () => {
    const res = await request(app).get('/api/core/health');
    expect(res.status).toBe(200);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/finance/expenses');
    expect(res.status).toBe(401);
  });

  it('should reject malformed tokens', async () => {
    const res = await request(app)
      .get('/api/finance/expenses')
      .set({ Authorization: 'Bearer malformed' });
    expect(res.status).toBe(401);
  });

  it('should allow authenticated user to read their own branch data', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: UUID.product, name: 'Test', name_ar: 'اختبار' }]);
    const res = await request(app)
      .get('/api/products')
      .set(authHeaders(testManagerUser));
    expect(res.status).toBe(200);
  });

  it('should enforce role-based authorization alongside branchScope', async () => {
    const res = await request(app)
      .delete('/api/finance/expense-categories/some-id')
      .set(authHeaders(testManagerUser));
    expect(res.status).toBe(403);
  });

  it('should allow admin to delete (highest permission)', async () => {
    const res = await request(app)
      .delete('/api/finance/expense-categories/some-id')
      .set(authHeaders(testAdminUser));
    expect(res.status).not.toBe(403);
  });
});
