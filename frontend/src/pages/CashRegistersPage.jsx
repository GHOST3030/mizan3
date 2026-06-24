import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Plus } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  Button, PageHeader, PageTransition, FormModal, Alert,
  ConfirmButton, Card, Skeleton, toast, Breadcrumbs,
} from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function CashRegistersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editReg, setEditReg] = useState(null);
  const [adjustId, setAdjustId] = useState(null);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data: registers, isLoading } = useQuery({
    queryKey: ['cash-registers', branchId],
    queryFn: async () => { const res = await client.get(`/finance/cash-registers?branch_id=${branchId}`); return res.data; },
  });

  const { data: currencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => { const res = await client.get('/currencies'); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/finance/cash-registers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['cash-registers']); toast('تم حذف الصندوق', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, adjustment }) => client.put(`/finance/cash-registers/${id}`, { adjustment }),
    onSuccess: () => { queryClient.invalidateQueries(['cash-registers']); setAdjustId(null); toast('تم تعديل الرصيد', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const formatBalance = (amount, currency) => `${amount} ${currency?.symbol || 'ر.ي'}`;
  const totalBalance = registers?.reduce((sum, r) => sum + r.balance, 0) || 0;
  const totalCurrency = currencies?.find((c) => c.is_default);

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'المالية' }, { label: 'الصناديق', to: '/cash-registers' }]} />
      <PageHeader
        title="الصناديق"
        actions={<Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button onClick={() => { setEditReg(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة صندوق</Button></Can>}
      />

      {registers?.length > 0 && (
        <div className="bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-2xl p-5 mb-6 shadow-lg animate-slide-down">
          <span className="text-blue-100 text-sm">الرصيد الإجمالي</span>
          <div className="text-2xl font-bold mt-1">{formatBalance(totalBalance, totalCurrency)}</div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : registers?.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">لا توجد صناديق. أضف صندوقاً جديداً.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {registers?.map((reg) => (
            <Card key={reg.id} hover>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{reg.name}</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">{reg.currency?.code}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {formatBalance(reg.balance, reg.currency)}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost" size="sm" onClick={() => setAdjustId(adjustId === reg.id ? null : reg.id)}>تعديل الرصيد</Button></Can>
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost" size="sm" onClick={() => { setEditReg(reg); setShowForm(true); }}>تعديل</Button></Can>
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
                  <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(reg.id)} message={`حذف الصندوق ${reg.name}؟`}>حذف</ConfirmButton>
                </Can>
              </div>

              {adjustId === reg.id && (
                <AdjustBalanceForm
                  register={reg}
                  onSubmit={(adjustment) => adjustMutation.mutate({ id: reg.id, adjustment })}
                  onCancel={() => setAdjustId(null)}
                  loading={adjustMutation.isPending}
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <RegisterFormModal
          register={editReg} branchId={branchId} currencies={currencies}
          onClose={() => { setShowForm(false); setEditReg(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['cash-registers']); setShowForm(false); setEditReg(null); toast(editReg ? 'تم تحديث الصندوق' : 'تم إضافة الصندوق', 'success'); }}
        />
      )}
    </PageTransition>
  );
}

function AdjustBalanceForm({ register, onSubmit, onCancel, loading }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('add');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const delta = parseFloat(amount || '0');
    if (delta <= 0) { setError('المبلغ يجب أن يكون أكبر من صفر'); return; }
    if (type === 'sub' && delta > register.balance) { setError('الرصيد لا يمكن أن يكون أقل من صفر'); return; }
    const adjustment = type === 'add' ? delta : -delta;
    onSubmit({ adjustment });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t dark:border-gray-700 space-y-3 animate-slide-up">
      {error && <Alert type="error" className="text-xs">{error}</Alert>}
      <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
        <div className="flex gap-2">
          <Button type="button" variant={type === 'add' ? 'success' : 'secondary'} size="sm" onClick={() => setType('add')} className="flex-1">إيداع</Button>
          <Button type="button" variant={type === 'sub' ? 'danger' : 'secondary'} size="sm" onClick={() => setType('sub')} className="flex-1">سحب</Button>
        </div>
        <div className="flex gap-2">
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="المبلغ"
            className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            required min="0.01" />
          <Button type="submit" loading={loading} size="sm">تأكيد</Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>إلغاء</Button>
        </div>
      </Can>
    </form>
  );
}

function RegisterFormModal({ register, branchId, currencies, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: register?.name || '',
    balance: register ? (register.balance).toString() : '0',
    currency_id: register?.currency_id || currencies?.find((c) => c.is_default)?.id || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { branch_id: branchId, name: form.name, balance: parseFloat(form.balance || '0'), currency_id: form.currency_id };
      if (register) {
        await client.put(`/finance/cash-registers/${register.id}`, payload);
      } else {
        await client.post('/finance/cash-registers', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={register ? 'تعديل الصندوق' : 'إضافة صندوق جديد'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="مثال: الصندوق الرئيسي" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرصيد الافتتاحي</label>
          <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة *</label>
          <select value={form.currency_id} onChange={(e) => setForm({ ...form, currency_id: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
            {currencies?.map((c) => (<option key={c.id} value={c.id}>{c.code} - {c.name}</option>))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{register ? 'حفظ التعديلات' : 'إضافة الصندوق'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
