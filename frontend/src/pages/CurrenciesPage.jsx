import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  Button, PageHeader, PageTransition, FormModal, Alert, Card,
  Badge, ConfirmButton, CardSkeleton, toast, Breadcrumbs,
} from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function CurrenciesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editCur, setEditCur] = useState(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: currencies, isLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => { const res = await client.get('/currencies'); return res.data; },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id) => client.patch(`/currencies/${id}/default`),
    onSuccess: () => { queryClient.invalidateQueries(['currencies']); toast('تم تعيين العملة الافتراضية', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/currencies/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['currencies']); toast('تم حذف العملة', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'الإدارة' }, { label: 'العملات', to: '/currencies' }]} />
      <PageHeader
        title="العملات"
        actions={canManage && (
          <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
            <Button onClick={() => { setEditCur(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة عملة</Button>
          </Can>
        )}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {currencies?.map((c) => (
            <Card key={c.id} className={c.is_default ? 'ring-2 ring-blue-500' : ''} hover>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{c.code}</h3>
                {c.is_default && <Badge color="blue">افتراضي</Badge>}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{c.name} ({c.symbol})</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">سعر الصرف: {c.exchange_rate.toLocaleString()}</p>
              <div className="flex gap-2 flex-wrap">
                {!c.is_default && canManage && (
                  <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
                    <Button variant="ghost" size="sm" onClick={() => setDefaultMutation.mutate(c.id)}>تعيين كافتراضي</Button>
                  </Can>
                )}
                {canManage && (
                  <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
                    <Button variant="ghost" size="sm" onClick={() => { setEditCur(c); setShowForm(true); }}>تعديل</Button>
                  </Can>
                )}
                {isAdmin && !c.is_default && (
                  <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
                    <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(c.id)} message={`حذف العملة ${c.code}؟`}>حذف</ConfirmButton>
                  </Can>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <CurrencyFormModal
          currency={editCur}
          onClose={() => { setShowForm(false); setEditCur(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['currencies']); setShowForm(false); setEditCur(null); toast(editCur ? 'تم تحديث العملة' : 'تم إضافة العملة', 'success'); }}
        />
      )}
    </PageTransition>
  );
}

function CurrencyFormModal({ currency, onClose, onSuccess }) {
  const [form, setForm] = useState({
    code: currency?.code || '', name: currency?.name || '',
    symbol: currency?.symbol || '', exchange_rate: currency?.exchange_rate?.toString() || '1',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, exchange_rate: parseFloat(form.exchange_rate) || 1 };
      if (currency) {
        await client.put(`/currencies/${currency.id}`, payload);
      } else {
        await client.post('/currencies', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={currency ? 'تعديل العملة' : 'إضافة عملة'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكود *</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="USD" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرمز *</label>
            <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="$" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="دولار أمريكي" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر الصرف (مقابل الريال اليمني) *</label>
          <input type="number" value={form.exchange_rate} min="1" onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{currency ? 'حفظ التعديلات' : 'إضافة العملة'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
