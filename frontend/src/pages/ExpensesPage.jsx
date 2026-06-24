import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  Button, PageHeader, Table, Badge, PageTransition, FormModal,
  Alert, ConfirmButton, Select, toast, Breadcrumbs,
} from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

const statusMap = {
  pending: { label: 'معلق', color: 'amber' },
  approved: { label: 'معتمد', color: 'green' },
  rejected: { label: 'مرفوض', color: 'red' },
};

const sourceLabels = { safe: 'خزنة', cash_register: 'صندوق', direct: 'مباشر' };

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', from: '', to: '' });
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', branchId, filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries({ branch_id: branchId, limit: '50', ...filters }).filter(([, v]) => v != null && v !== '')
      );
      const res = await client.get(`/finance/expenses?${params}`);
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => { const res = await client.get('/finance/expense-categories'); return res.data; },
  });

  const { data: currencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => { const res = await client.get('/currencies'); return res.data; },
  });

  const { data: safes } = useQuery({
    queryKey: ['safes-simple'],
    queryFn: async () => { const res = await client.get('/safe'); return res.data; },
  });

  const { data: registers } = useQuery({
    queryKey: ['cash-registers-simple'],
    queryFn: async () => { const res = await client.get('/finance/cash-registers'); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/finance/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast('تم حذف المصروف', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => client.put(`/finance/expenses/${id}/approve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast('تم اعتماد المصروف', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => client.put(`/finance/expenses/${id}/reject`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast('تم رفض المصروف', 'info'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isAccountant = user?.role === 'accountant';
  const canEdit = (exp) => exp.status === 'pending' && (isAdmin || isManager || (isAccountant && exp.user_id === user?.id));

  const formatAmount = (amount, currency) => `${amount} ${currency?.symbol || 'ر.ي'}`;

  const columns = [
    { key: 'expense_date', label: 'التاريخ', render: (r) => <span className="text-gray-600 dark:text-gray-400 text-xs">{new Date(r.expense_date).toLocaleDateString('ar')}</span> },
    { key: 'category', label: 'التصنيف', render: (r) => <Badge color="gray">{r.expense_category?.name_ar || r.category}</Badge> },
    { key: 'description', label: 'الوصف', render: (r) => <span className="text-gray-600 dark:text-gray-400 max-w-[150px] block truncate">{r.description || '-'}</span> },
    { key: 'amount', label: 'المبلغ', render: (r) => <span className="font-medium text-red-600 dark:text-red-400">{formatAmount(r.amount, r.currency)}</span> },
    { key: 'payment_source', label: 'مصدر الدفع', render: (r) => <span className="text-xs text-gray-500 dark:text-gray-400">{sourceLabels[r.payment_source] || 'مباشر'}</span> },
    { key: 'status', label: 'الحالة', render: (r) => { const s = statusMap[r.status] || { label: r.status, color: 'gray' }; return <Badge color={s.color} dot>{s.label}</Badge>; } },
    { key: 'user_name', label: 'المستخدم', render: (r) => <span className="text-gray-500 dark:text-gray-400 text-xs">{r.user?.name}</span> },
  ];

  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'المالية' }, { label: 'المصروفات' }]} />
      <PageHeader
        title="المصروفات"
        actions={<Can permission={PERMISSIONS.MANAGE_EXPENSES}><Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> إضافة مصروف</Button></Can>}
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">كل التصنيفات</option>
          {categories?.map((c) => (<option key={c.id} value={c.name}>{c.name_ar}</option>))}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="approved">معتمد</option>
          <option value="rejected">مرفوض</option>
        </Select>
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
      </div>

      <Table
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        emptyMessage="لا يوجد مصروفات"
        emptyIcon="📋"
        renderActions={(row) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {canEdit(row) && <Button variant="ghost" size="sm" onClick={() => setEditExpense(row)}>تعديل</Button>}
            {row.status === 'pending' && (
              <Can permission={PERMISSIONS.MANAGE_EXPENSES}>
                <Button variant="ghost-success" size="sm" onClick={() => approveMutation.mutate(row.id)}>اعتماد</Button>
                <Button variant="ghost-warning" size="sm" onClick={() => { setRejectId(row.id); setRejectReason(''); }}>رفض</Button>
              </Can>
            )}
            <Can permission={PERMISSIONS.MANAGE_EXPENSES}>
              <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(row.id)} message="حذف المصروف؟">حذف</ConfirmButton>
            </Can>
          </div>
        )}
      />

      {data?.meta && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">المجموع: {data.data?.length} من {data.meta.total}</div>
      )}

      {showForm && (
        <ExpenseFormModal
          branchId={branchId} userId={user?.id} currencies={currencies}
          categories={categories} safes={safes} registers={registers}
          onClose={() => setShowForm(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setShowForm(false); toast('تم إضافة المصروف', 'success'); }}
        />
      )}
      {editExpense && (
        <ExpenseFormModal
          expense={editExpense} branchId={branchId} userId={user?.id}
          currencies={currencies} categories={categories} safes={safes} registers={registers}
          onClose={() => setEditExpense(null)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setEditExpense(null); toast('تم تحديث المصروف', 'success'); }}
        />
      )}

      <FormModal open={!!rejectId} onClose={() => setRejectId(null)} title="رفض المصروف" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">سبب الرفض</p>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition" />
          <div className="flex gap-3">
            <Button onClick={() => { rejectMutation.mutate({ id: rejectId, reason: rejectReason || undefined }); setRejectId(null); }} variant="warning">تأكيد الرفض</Button>
            <Button variant="secondary" onClick={() => setRejectId(null)}>إلغاء</Button>
          </div>
        </div>
      </FormModal>
    </PageTransition>
  );
}

function ExpenseFormModal({ expense, branchId, userId, currencies, categories, safes, registers, onClose, onSuccess }) {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    category: expense?.category || '',
    category_id: expense?.category_id || '',
    amount: expense?.amount?.toString() || '',
    currency_id: expense?.currency_id || currencies?.find((c) => c.is_default)?.id || '',
    description: expense?.description || '',
    payment_source: 'direct',
    source_id: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedCategory = categories?.find((c) => c.id === form.category_id);
  const showSourceSelector = !isEdit && form.payment_source !== 'direct';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await client.put(`/finance/expenses/${expense.id}`, {
          category: selectedCategory?.name || form.category,
          category_id: form.category_id || null,
          amount: parseFloat(form.amount),
          description: form.description || null,
        });
      } else {
        await client.post('/finance/expenses', {
          branch_id: branchId, user_id: userId,
          category: selectedCategory?.name || form.category,
          category_id: form.category_id || null,
          amount: parseFloat(form.amount),
          currency_id: form.currency_id,
          description: form.description || null,
          payment_source: form.payment_source,
          source_id: showSourceSelector ? form.source_id : null,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={isEdit ? 'تعديل مصروف' : 'إضافة مصروف'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التصنيف *</label>
          <select value={form.category_id} onChange={(e) => {
            const cat = categories?.find((c) => c.id === e.target.value);
            setForm({ ...form, category_id: e.target.value, category: cat?.name || '' });
          }}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
            <option value="">اختر تصنيف...</option>
            {categories?.map((c) => (<option key={c.id} value={c.id}>{c.name_ar}</option>))}
          </select>
        </div>
        {!form.category_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أو إدخال تصنيف يدوي</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="مثال: إيجار، كهرباء" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ *</label>
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required min="1" />
        </div>
        {!isEdit && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة</label>
              <select value={form.currency_id} onChange={(e) => setForm({ ...form, currency_id: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                {currencies?.map((c) => (<option key={c.id} value={c.id}>{c.code} - {c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مصدر الدفع</label>
              <select value={form.payment_source} onChange={(e) => setForm({ ...form, payment_source: e.target.value, source_id: '' })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="direct">مباشر (بدون خصم)</option>
                <option value="safe">من الخزنة</option>
                <option value="cash_register">من الصندوق</option>
              </select>
            </div>
            {showSourceSelector && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{form.payment_source === 'safe' ? 'الخزنة' : 'الصندوق'} *</label>
                <select value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required>
                  <option value="">اختر...</option>
                  {(form.payment_source === 'safe' ? safes : registers)?.map((item) => (
                    <option key={item.id} value={item.id}>{item.name_ar || item.name} ({item.currency?.code || ''} - الرصيد: {item.balance})</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition" rows={2} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'حفظ التعديلات' : 'إضافة المصروف'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
