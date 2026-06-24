import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mockPrisma, authHeaders, testAdminUser, testManagerUser, testCashierUser } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  branch: '00000000-0000-4000-a000-000000000010',
  user: '00000000-0000-4000-a000-000000000002',
  category: '00000000-0000-4000-a000-000000000003',
  currency: '00000000-0000-4000-a000-000000000004',
  safe: '00000000-0000-4000-a000-000000000005',
  expense: '00000000-0000-4000-a000-000000000010',
  expenseCat: '00000000-0000-4000-a000-000000000020',
};

beforeEach(() => {
  resetMocks();
});

describe('Integration: Expense Full Lifecycle', () => {
  it('should create, approve, and verify an expense', async () => {
    mockPrisma.expense.create.mockResolvedValue({
      id: UUID.expense,
      branch_id: UUID.branch,
      user_id: UUID.user,
      category: 'إيجار',
      amount: 50000,
      currency_id: UUID.currency,
      category_id: UUID.category,
      status: 'pending',
      payment_source: 'direct',
      expense_date: new Date().toISOString(),
      created_at: new Date(),
      updated_at: new Date(),
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });

    const createRes = await request(app)
      .post('/api/finance/expenses')
      .set(authHeaders(testAdminUser))
      .send({
        branch_id: UUID.branch,
        user_id: UUID.user,
        category: 'إيجار',
        category_id: UUID.category,
        amount: 50000,
        currency_id: UUID.currency,
        description: 'إيجار المحل',
        payment_source: 'direct',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('pending');

    const expenseId = createRes.body.id;

    mockPrisma.expense.findFirst.mockResolvedValue({
      id: expenseId,
      status: 'pending',
      amount: 50000,
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });

    const getRes = await request(app)
      .get(`/api/finance/expenses/${expenseId}`)
      .set(authHeaders());

    expect(getRes.status).toBe(200);
    expect(getRes.body.amount).toBe(50000);

    mockPrisma.expense.findFirst.mockResolvedValue({
      id: expenseId, status: 'pending', amount: 50000,
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });
    mockPrisma.expense.update.mockResolvedValue({
      id: expenseId, status: 'approved', approved_by: UUID.user, approved_at: new Date(),
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });

    const approveRes = await request(app)
      .put(`/api/finance/expenses/${expenseId}/approve`)
      .set(authHeaders(testManagerUser));

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.expense.status).toBe('approved');
  });

  it('should create, reject, and verify an expense', async () => {
    mockPrisma.expense.create.mockResolvedValue({
      id: UUID.expense, status: 'pending', amount: 30000,
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });

    const createRes = await request(app)
      .post('/api/finance/expenses')
      .set(authHeaders(testAdminUser))
      .send({
        branch_id: UUID.branch, user_id: UUID.user, category: 'إيجار',
        amount: 30000, currency_id: UUID.currency, payment_source: 'direct',
      });

    expect(createRes.status).toBe(201);

    mockPrisma.expense.findFirst.mockResolvedValue({
      id: UUID.expense, status: 'pending', amount: 30000,
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });
    mockPrisma.expense.update.mockResolvedValue({
      id: UUID.expense, status: 'rejected', rejection_reason: 'مكرر',
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: { id: UUID.category, name: 'Rent', name_ar: 'إيجار' },
    });

    const rejectRes = await request(app)
      .put(`/api/finance/expenses/${UUID.expense}/reject`)
      .set(authHeaders(testManagerUser))
      .send({ reason: 'مكرر' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.expense.status).toBe('rejected');
    expect(rejectRes.body.expense.rejection_reason).toBe('مكرر');
  });

  it('should prevent cashier from completing expense lifecycle', async () => {
    const res = await request(app)
      .post('/api/finance/expenses')
      .set(authHeaders(testCashierUser))
      .send({
        branch_id: UUID.branch, user_id: UUID.user, category: 'إيجار',
        amount: 50000, currency_id: UUID.currency, payment_source: 'direct',
      });

    expect(res.status).toBe(403);
  });

  it('should handle expense category lifecycle', async () => {
    const catData = { branch_id: UUID.branch, name: 'Rent', name_ar: 'إيجار', is_active: true };

    mockPrisma.expenseCategory.create.mockResolvedValue({ id: UUID.expenseCat, ...catData });
    mockPrisma.expenseCategory.findMany.mockResolvedValue([{ id: UUID.expenseCat, ...catData }]);
    mockPrisma.expenseCategory.findFirst.mockResolvedValue({ id: UUID.expenseCat, ...catData });
    mockPrisma.expenseCategory.update.mockResolvedValue({ id: UUID.expenseCat, ...catData, name_ar: 'إيجار محدث' });

    const createRes = await request(app)
      .post('/api/finance/expense-categories')
      .set(authHeaders(testAdminUser))
      .send(catData);

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/finance/expense-categories')
      .set(authHeaders());

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/finance/expense-categories/${UUID.expenseCat}`)
      .set(authHeaders())
      .send({ name_ar: 'إيجار محدث' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name_ar).toBe('إيجار محدث');
  });
});

describe('Integration: Authorization Flows', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/finance/expenses');
    expect(res.status).toBe(401);
  });

  it('should return 403 for unauthorized role on approve', async () => {
    const res = await request(app)
      .put('/api/finance/expenses/some-id/approve')
      .set(authHeaders(testCashierUser));

    expect(res.status).toBe(403);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/finance/expenses')
      .set({ Authorization: 'Bearer invalid-token' });

    expect(res.status).toBe(401);
  });
});

describe('Integration: Expense with Safe Deduction', () => {
  it('should deduct from safe and create expense', async () => {
    mockPrisma.safeBox.findFirst.mockResolvedValue({ id: UUID.safe, balance: 100000 });

    mockPrisma.expense.create.mockResolvedValue({
      id: UUID.expense, status: 'pending', amount: 30000, payment_source: 'safe',
      user: { id: UUID.user, name: 'أحمد' },
      currency: { id: UUID.currency, code: 'YER', symbol: '﷼' },
      expense_category: null,
    });

    mockPrisma.$transaction.mockImplementation((fn) => fn({
      safeBox: { update: vi.fn() },
      safeMovement: { create: vi.fn() },
    }));

    const res = await request(app)
      .post('/api/finance/expenses')
      .set(authHeaders(testAdminUser))
      .send({
        branch_id: UUID.branch,
        user_id: UUID.user,
        category: 'إيجار',
        amount: 30000,
        currency_id: UUID.currency,
        payment_source: 'safe',
        source_id: UUID.safe,
      });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(30000);
  });
});
