import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mockPrisma, authHeaders, testAdminUser, testManagerUser, testAccountantUser, testCashierUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  branch: '00000000-0000-4000-a000-000000000010',
  user: '00000000-0000-4000-a000-000000000002',
  category: '00000000-0000-4000-a000-000000000003',
  currency: '00000000-0000-4000-a000-000000000004',
  safe: '00000000-0000-4000-a000-000000000005',
};

beforeEach(() => {
  resetMocks();
});

describe('Finance - Expense Categories', () => {
  const categoryData = {
    branch_id: UUID.branch,
    name: 'Rent',
    name_ar: 'إيجار',
    description: 'Monthly rent',
    is_active: true,
  };

  const mockCategory = { id: UUID.category, ...categoryData, created_at: new Date(), updated_at: new Date() };

  describe('GET /api/finance/expense-categories', () => {
    it('should return a list of expense categories', async () => {
      mockPrisma.expenseCategory.findMany.mockResolvedValue([mockCategory]);

      const res = await request(app)
        .get('/api/finance/expense-categories')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name_ar).toBe('إيجار');
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/finance/expense-categories');
      expect(res.status).toBe(401);
    });

    it('should filter by branch_id', async () => {
      mockPrisma.expenseCategory.findMany.mockResolvedValue([mockCategory]);

      const res = await request(app)
        .get(`/api/finance/expense-categories?branch_id=${UUID.branch}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/finance/expense-categories', () => {
    it('should create an expense category (admin)', async () => {
      mockPrisma.expenseCategory.create.mockResolvedValue(mockCategory);

      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testAdminUser))
        .send(categoryData);

      expect(res.status).toBe(201);
      expect(res.body.name_ar).toBe('إيجار');
    });

    it('should create an expense category (manager)', async () => {
      mockPrisma.expenseCategory.create.mockResolvedValue(mockCategory);

      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testManagerUser))
        .send(categoryData);

      expect(res.status).toBe(201);
    });

    it('should forbid cashier from creating categories', async () => {
      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders(testCashierUser))
        .send(categoryData);

      expect(res.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/finance/expense-categories')
        .set(authHeaders())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/finance/expense-categories/:id', () => {
    it('should update an expense category', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.expenseCategory.update.mockResolvedValue({ ...mockCategory, name_ar: 'إيجار محدث' });

      const res = await request(app)
        .put(`/api/finance/expense-categories/${UUID.category}`)
        .set(authHeaders())
        .send({ name_ar: 'إيجار محدث' });

      expect(res.status).toBe(200);
      expect(res.body.name_ar).toBe('إيجار محدث');
    });

    it('should return 404 for non-existent category', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/finance/expense-categories/00000000-0000-4000-a000-000000009999')
        .set(authHeaders())
        .send({ name_ar: 'محدث' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/finance/expense-categories/:id', () => {
    it('should soft-delete an expense category (admin)', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.expenseCategory.update.mockResolvedValue({ ...mockCategory, deleted_at: new Date() });

      const res = await request(app)
        .delete(`/api/finance/expense-categories/${UUID.category}`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });
  });
});

describe('Finance - Expenses', () => {
  const expenseData = {
    branch_id: UUID.branch,
    user_id: UUID.user,
    category: 'إيجار',
    category_id: UUID.category,
    amount: 50000,
    currency_id: UUID.currency,
    description: 'إيجار المحل',
    payment_source: 'direct',
  };

  const mockExpense = {
    id: '00000000-0000-4000-a000-000000000010',
    ...expenseData,
    status: 'pending',
    expense_date: new Date().toISOString(),
    created_at: new Date(),
    updated_at: new Date(),
    user: { id: UUID.user, name: 'أحمد' },
    currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
    expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
  };

  describe('GET /api/finance/expenses', () => {
    it('should return paginated expenses', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([mockExpense]);
      mockPrisma.expense.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/finance/expenses')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([mockExpense]);
      mockPrisma.expense.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/finance/expenses?status=pending')
        .set(authHeaders());

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/finance/expenses/:id', () => {
    it('should return expense by id', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);

      const res = await request(app)
        .get(`/api/finance/expenses/${mockExpense.id}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(50000);
    });

    it('should return 404 for non-existent expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/finance/expenses/00000000-0000-4000-a000-000000009999')
        .set(authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/finance/expenses', () => {
    it('should create an expense (admin)', async () => {
      mockPrisma.expense.create.mockResolvedValue(mockExpense);

      const res = await request(app)
        .post('/api/finance/expenses')
        .set(authHeaders(testAdminUser))
        .send(expenseData);

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(50000);
    });

    it('should create an expense (accountant)', async () => {
      mockPrisma.expense.create.mockResolvedValue(mockExpense);

      const res = await request(app)
        .post('/api/finance/expenses')
        .set(authHeaders(testAccountantUser))
        .send(expenseData);

      expect(res.status).toBe(201);
    });

    it('should forbid cashier from creating expenses', async () => {
      const res = await request(app)
        .post('/api/finance/expenses')
        .set(authHeaders(testCashierUser))
        .send(expenseData);

      expect(res.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/finance/expenses')
        .set(authHeaders())
        .send({});

      expect(res.status).toBe(400);
    });

    it('should deduct from safe when payment_source is safe', async () => {
      mockPrisma.safeBox.findFirst.mockResolvedValue({ id: UUID.safe, balance: 100000 });
      mockPrisma.expense.create.mockResolvedValue(mockExpense);
      mockPrisma.$transaction.mockImplementation((fn) => fn({
        safeBox: { update: vi.fn() },
        safeMovement: { create: vi.fn() },
      }));

      const res = await request(app)
        .post('/api/finance/expenses')
        .set(authHeaders())
        .send({ ...expenseData, payment_source: 'safe', source_id: UUID.safe });

      expect(res.status).toBe(201);
    });

    it('should reject if safe balance insufficient', async () => {
      mockPrisma.safeBox.findFirst.mockResolvedValue({ id: UUID.safe, balance: 10000 });

      const res = await request(app)
        .post('/api/finance/expenses')
        .set(authHeaders())
        .send({ ...expenseData, payment_source: 'safe', source_id: UUID.safe, amount: 50000 });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/finance/expenses/:id/approve', () => {
    it('should approve a pending expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.update.mockResolvedValue({ ...mockExpense, status: 'approved' });

      const res = await request(app)
        .put(`/api/finance/expenses/${mockExpense.id}/approve`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(200);
    });

    it('should forbid cashier from approving', async () => {
      const res = await request(app)
        .put(`/api/finance/expenses/${mockExpense.id}/approve`)
        .set(authHeaders(testCashierUser));

      expect(res.status).toBe(403);
    });

    it('should reject approving already-approved expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({ ...mockExpense, status: 'approved' });

      const res = await request(app)
        .put(`/api/finance/expenses/${mockExpense.id}/approve`)
        .set(authHeaders(testManagerUser));

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/finance/expenses/:id/reject', () => {
    it('should reject a pending expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.update.mockResolvedValue({ ...mockExpense, status: 'rejected', rejection_reason: 'غير ضروري' });

      const res = await request(app)
        .put(`/api/finance/expenses/${mockExpense.id}/reject`)
        .set(authHeaders(testManagerUser))
        .send({ reason: 'غير ضروري' });

      expect(res.status).toBe(200);
    });

    it('should reject with empty reason', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.update.mockResolvedValue({ ...mockExpense, status: 'rejected' });

      const res = await request(app)
        .put(`/api/finance/expenses/${mockExpense.id}/reject`)
        .set(authHeaders(testManagerUser))
        .send({});

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/finance/expenses/:id', () => {
    it('should soft-delete an expense (admin)', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.update.mockResolvedValue({ ...mockExpense, deleted_at: new Date() });

      const res = await request(app)
        .delete(`/api/finance/expenses/${mockExpense.id}`)
        .set(authHeaders(testAdminUser));

      expect(res.status).toBe(200);
    });
  });
});
