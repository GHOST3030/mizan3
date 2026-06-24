import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../setup.js';
import { resetMocks } from '../helpers.js';

const UUID = {
  branch: '00000000-0000-4000-a000-000000000001',
  user: '00000000-0000-4000-a000-000000000002',
  category: '00000000-0000-4000-a000-000000000003',
  currency: '00000000-0000-4000-a000-000000000004',
  safe: '00000000-0000-4000-a000-000000000005',
  cashReg: '00000000-0000-4000-a000-000000000006',
  expense: '00000000-0000-4000-a000-000000000010',
};

beforeEach(() => {
  resetMocks();
});

describe('Finance Service - Expense Categories', () => {
  it('getExpenseCategories should return categories', async () => {
    const { getExpenseCategories } = await import('../../src/modules/finance/finance.service.js');
    const mockCategories = [{ id: UUID.category, name_ar: 'إيجار' }];
    mockPrisma.expenseCategory.findMany.mockResolvedValue(mockCategories);

    const result = await getExpenseCategories(UUID.branch);

    expect(result).toEqual(mockCategories);
    expect(mockPrisma.expenseCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deleted_at: null }) })
    );
  });

  it('createExpenseCategory should create a category', async () => {
    const { createExpenseCategory } = await import('../../src/modules/finance/finance.service.js');
    const data = { branch_id: UUID.branch, name: 'Rent', name_ar: 'إيجار', created_by: UUID.user };
    const mockCreated = { id: UUID.category, ...data };
    mockPrisma.expenseCategory.create.mockResolvedValue(mockCreated);

    const result = await createExpenseCategory(data);

    expect(result.id).toBe(UUID.category);
  });

  it('updateExpenseCategory should throw 404 if not found', async () => {
    const { updateExpenseCategory } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expenseCategory.findFirst.mockResolvedValue(null);

    await expect(updateExpenseCategory(UUID.category, { name_ar: 'محدث' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteExpenseCategory should soft-delete', async () => {
    const { deleteExpenseCategory } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expenseCategory.findFirst.mockResolvedValue({ id: UUID.category, branch_id: UUID.branch });
    mockPrisma.expenseCategory.update.mockResolvedValue({});

    await deleteExpenseCategory(UUID.category, UUID.user);

    expect(mockPrisma.expenseCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) })
    );
  });
});

describe('Finance Service - Expenses', () => {
  const expenseData = {
    branch_id: UUID.branch,
    user_id: UUID.user,
    category: 'إيجار',
    category_id: UUID.category,
    amount: 50000,
    currency_id: UUID.currency,
    payment_source: 'direct',
  };

  it('createExpense should create with direct payment source', async () => {
    const { createExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.create.mockResolvedValue({ id: UUID.expense, ...expenseData });

    await createExpense(expenseData);

    expect(mockPrisma.expense.create).toHaveBeenCalled();
  });

  it('createExpense should deduct from safe when payment_source is safe', async () => {
    const { createExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.safeBox.findFirst.mockResolvedValue({ id: UUID.safe, balance: 100000 });
    mockPrisma.expense.create.mockResolvedValue({ id: UUID.expense, ...expenseData });
    mockPrisma.$transaction.mockImplementation((fn) => fn({
      safeBox: { update: vi.fn() },
      safeMovement: { create: vi.fn() },
    }));

    const result = await createExpense({ ...expenseData, payment_source: 'safe', source_id: UUID.safe });

    expect(result.id).toBe(UUID.expense);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('createExpense should throw if safe balance insufficient', async () => {
    const { createExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.safeBox.findFirst.mockResolvedValue({ id: UUID.safe, balance: 10000 });

    await expect(createExpense({ ...expenseData, payment_source: 'safe', source_id: UUID.safe, amount: 50000 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('createExpense should deduct from cash_register', async () => {
    const { createExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.cashRegister.findFirst.mockResolvedValue({ id: UUID.cashReg, balance: 100000 });
    mockPrisma.expense.create.mockResolvedValue({ id: UUID.expense, ...expenseData });
    mockPrisma.cashRegister.update.mockResolvedValue({});

    const result = await createExpense({ ...expenseData, payment_source: 'cash_register', source_id: UUID.cashReg });

    expect(result.id).toBe(UUID.expense);
    expect(mockPrisma.cashRegister.update).toHaveBeenCalled();
  });

  it('getExpenseById should return expense', async () => {
    const { getExpenseById } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.findFirst.mockResolvedValue({ id: UUID.expense, amount: 50000 });

    const result = await getExpenseById(UUID.expense);

    expect(result.amount).toBe(50000);
  });

  it('getExpenseById should throw 404 if not found', async () => {
    const { getExpenseById } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.findFirst.mockResolvedValue(null);

    await expect(getExpenseById(UUID.expense)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('approveExpense should approve pending expense', async () => {
    const { approveExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.findFirst.mockResolvedValue({ id: UUID.expense, status: 'pending', amount: 50000 });
    mockPrisma.expense.update.mockResolvedValue({ id: UUID.expense, status: 'approved' });

    const result = await approveExpense(UUID.expense, UUID.user);

    expect(result.status).toBe('approved');
  });

  it('approveExpense should throw if already approved', async () => {
    const { approveExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.findFirst.mockResolvedValue({ id: UUID.expense, status: 'approved' });

    await expect(approveExpense(UUID.expense, UUID.user)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejectExpense should reject pending expense', async () => {
    const { rejectExpense } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.findFirst.mockResolvedValue({ id: UUID.expense, status: 'pending', amount: 50000 });
    mockPrisma.expense.update.mockResolvedValue({ id: UUID.expense, status: 'rejected', rejection_reason: 'مكرر' });

    const result = await rejectExpense(UUID.expense, UUID.user, 'مكرر');

    expect(result.status).toBe('rejected');
    expect(result.rejection_reason).toBe('مكرر');
  });

  it('getExpenses should return paginated results', async () => {
    const { getExpenses } = await import('../../src/modules/finance/finance.service.js');
    mockPrisma.expense.findMany.mockResolvedValue([{ id: UUID.expense }]);
    mockPrisma.expense.count.mockResolvedValue(1);

    const result = await getExpenses({ page: '1', limit: '20' });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });
});
