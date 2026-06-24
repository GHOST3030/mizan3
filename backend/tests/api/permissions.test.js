import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { authHeaders, testAdminUser, testManagerUser, testAccountantUser, testCashierUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  id: '00000000-0000-4000-a000-000000000001',
  branch: '00000000-0000-4000-a000-000000000010',
};

beforeEach(() => {
  resetMocks();
});

describe('Permission: Core Routes (Companies/Branches/Settings)', () => {
  describe('GET /api/core/companies', () => {
    it('should allow authenticated users', async () => {
      const res = await request(app)
        .get('/api/core/companies')
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated', async () => {
      const res = await request(app).get('/api/core/companies');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/core/companies', () => {
    it('should allow admin', async () => {
      const { mockPrisma } = await import('../setup.js');
      mockPrisma.company.create.mockResolvedValue({ id: UUID.id, name: 'Test', name_ar: 'اختبار' });

      const res = await request(app)
        .post('/api/core/companies')
        .set(authHeaders(testAdminUser))
        .send({ name: 'Test', name_ar: 'اختبار' });

      expect(res.status).toBe(201);
    });

    it('should forbid cashier', async () => {
      const res = await request(app)
        .post('/api/core/companies')
        .set(authHeaders(testCashierUser))
        .send({ name: 'Test', name_ar: 'اختبار' });

      expect(res.status).toBe(403);
    });

    it('should forbid accountant', async () => {
      const res = await request(app)
        .post('/api/core/companies')
        .set(authHeaders(testAccountantUser))
        .send({ name: 'Test', name_ar: 'اختبار' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/core/companies/:id', () => {
    it('should allow admin', async () => {
      const { mockPrisma } = await import('../setup.js');
      mockPrisma.company.findFirst.mockResolvedValue({ id: UUID.id, name: 'Test' });
      mockPrisma.company.update.mockResolvedValue({ id: UUID.id, name: 'Test', deleted_at: new Date() });

      const res = await request(app)
        .delete(`/api/core/companies/${UUID.id}`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });

    it('should forbid manager', async () => {
      const res = await request(app)
        .delete(`/api/core/companies/${UUID.id}`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });
  });
});

describe('Permission: Finance Routes', () => {
  describe('POST /api/finance/expense-categories', () => {
    it('should allow admin', async () => {
      const { mockPrisma } = await import('../setup.js');
      mockPrisma.expenseCategory.create.mockResolvedValue({ id: UUID.id, name: 'Rent', name_ar: 'إيجار' });

      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testAdminUser))
        .send({ branch_id: UUID.branch, name: 'Rent', name_ar: 'إيجار' });

      expect(res.status).toBe(201);
    });

    it('should allow manager', async () => {
      const { mockPrisma } = await import('../setup.js');
      mockPrisma.expenseCategory.create.mockResolvedValue({ id: UUID.id, name: 'Rent', name_ar: 'إيجار' });

      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testManagerUser))
        .send({ branch_id: UUID.branch, name: 'Rent', name_ar: 'إيجار' });

      expect(res.status).toBe(201);
    });

    it('should forbid cashier', async () => {
      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testCashierUser))
        .send({ branch_id: UUID.branch, name: 'Rent', name_ar: 'إيجار' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/finance/expenses/:id/approve', () => {
    it('should allow admin', async () => {
      const res = await request(app)
        .put(`/api/finance/expenses/${UUID.id}/approve`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(404);
    });

    it('should allow manager', async () => {
      const res = await request(app)
        .put(`/api/finance/expenses/${UUID.id}/approve`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(404);
    });

    it('should forbid accountant', async () => {
      const res = await request(app)
        .put(`/api/finance/expenses/${UUID.id}/approve`)
        .set(authHeaders(testAccountantUser));

      expect(res.status).toBe(403);
    });

    it('should forbid cashier', async () => {
      const res = await request(app)
        .put(`/api/finance/expenses/${UUID.id}/approve`)
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/finance/expense-categories/:id', () => {
    it('should allow admin', async () => {
      const res = await request(app)
        .delete(`/api/finance/expense-categories/${UUID.id}`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(404);
    });

    it('should forbid manager', async () => {
      const res = await request(app)
        .delete(`/api/finance/expense-categories/${UUID.id}`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(403);
    });
  });
});

describe('Permission: Report Routes', () => {
  describe('GET /api/reports/export', () => {
    it('should allow admin', async () => {
      const res = await request(app)
        .get('/api/reports/export?type=sales_by_product')
        .set(authHeaders(testAdminUser));

      expect(res.status).not.toBe(403);
    });

    it('should allow accountant', async () => {
      const res = await request(app)
        .get('/api/reports/export?type=sales_by_product')
        .set(authHeaders(testAccountantUser));

      expect(res.status).not.toBe(403);
    });

    it('should forbid cashier', async () => {
      const res = await request(app)
        .get('/api/reports/export?type=sales_by_product')
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reports/dashboard', () => {
    it('should allow all authenticated roles', async () => {
      const { mockPrisma } = await import('../setup.js');
      const zeroAgg = { _count: { id: 0 }, _sum: { total: 0, discount_amount: 0, paid_amount: 0, tax_amount: 0 } };
      mockPrisma.sale.aggregate.mockResolvedValue(zeroAgg);
      mockPrisma.saleItem.groupBy.mockResolvedValue([]);
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } });
      mockPrisma.expense.count.mockResolvedValue(0);
      mockPrisma.shift.count.mockResolvedValue(0);
      mockPrisma.customer.count.mockResolvedValue(0);
      mockPrisma.supplier.count.mockResolvedValue(0);
      mockPrisma.safeBox.findMany.mockResolvedValue([]);
      mockPrisma.sale.count.mockResolvedValue(0);
      mockPrisma.salePayment.groupBy.mockResolvedValue([]);

      const roles = [testAdminUser, testManagerUser, testAccountantUser, testCashierUser];
      for (const user of roles) {
        const res = await request(app)
          .get('/api/reports/dashboard')
          .set(authHeaders(user));

        expect(res.status).not.toBe(403);
        expect(res.status).toBe(200);
      }
    });
  });
});

describe('Permission: Unauthenticated Access', () => {
  const protectedRoutes = [
    { method: 'get', path: '/api/finance/expenses' },
    { method: 'post', path: '/api/finance/expenses' },
    { method: 'get', path: '/api/reports/dashboard' },
    { method: 'get', path: '/api/reports/products/slow-moving' },
    { method: 'get', path: '/api/reports/customers/detailed' },
    { method: 'get', path: '/api/reports/suppliers/detailed' },
    { method: 'get', path: '/api/reports/safe/detailed' },
    { method: 'get', path: '/api/reports/expenses/detailed' },
    { method: 'get', path: '/api/safe' },
    { method: 'get', path: '/api/core/companies' },
    { method: 'get', path: '/api/core/branches' },
  ];

  for (const route of protectedRoutes) {
    it(`${route.method.toUpperCase()} ${route.path} should return 401`, async () => {
      const res = await request(app)[route.method](route.path);
      expect(res.status).toBe(401);
    });
  }
});

describe('Permission: Invalid Token', () => {
  it('should return 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/finance/expenses')
      .set({ Authorization: 'Bearer malformed-token' });

    expect(res.status).toBe(401);
  });

  it('should return 401 without Bearer prefix', async () => {
    const res = await request(app)
      .get('/api/finance/expenses')
      .set({ Authorization: 'Token some-value' });

    expect(res.status).toBe(401);
  });
});
