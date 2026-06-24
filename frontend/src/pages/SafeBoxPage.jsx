import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, PageHeader } from '../components/ui';
import { Can } from '../components/Can';
import { CanViewField } from '../components/CanViewField';
import { PERMISSIONS } from '../utils/permissions';

export default function SafeBoxPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSafe, setEditSafe] = useState(null);
  const [movementSafe, setMovementSafe] = useState(null);
  const [movementTab, setMovementTab] = useState('in');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data: safes, isLoading } = useQuery({
    queryKey: ['safe-boxes', branchId],
    queryFn: async () => {
      const res = await client.get(`/safe?branch_id=${branchId}`);
      return res.data;
    },
  });

  const { data: currencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => { const res = await client.get('/currencies'); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/safe/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['safe-boxes']),
  });

  const movementMutation = useMutation({
    mutationFn: (data) => client.post('/safe/movements', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['safe-boxes']);
      queryClient.invalidateQueries(['safe-movements']);
      setMovementSafe(null);
      setAmount('');
      setNotes('');
    },
  });

  const { data: movements } = useQuery({
    queryKey: ['safe-movements', movementSafe?.id],
    queryFn: async () => {
      const res = await client.get(`/safe/movements?safe_id=${movementSafe.id}`);
      return res.data;
    },
    enabled: !!movementSafe,
  });

  const formatBalance = (amount, currency) => {
    const sym = currency?.symbol || 'ر.ي';
    return `${amount} ${sym}`;
  };

  const totalBalance = safes?.reduce((sum, s) => sum + s.balance, 0) || 0;
  const defaultCurrency = currencies?.find((c) => c.is_default);

  const typeLabels = {
    cash_in: 'إيداع',
    cash_out: 'سحب',
    transfer_from_register: 'تحويل من صندوق',
    transfer_to_register: 'تحويل إلى صندوق',
  };

  return (
    <div className="p-6" dir="rtl">
      <PageHeader title="الخزنة" actions={<Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button onClick={() => { setEditSafe(null); setShowForm(true); }}>+ إضافة خزنة</Button></Can>} />

      {safes?.length > 0 && (
        <CanViewField fieldPermission="field:view_safe_balance">
          <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 mb-6 shadow">
            <span className="text-emerald-100 text-sm">الرصيد الإجمالي في الخزنة</span>
            <div className="text-2xl font-bold mt-1">{formatBalance(totalBalance, defaultCurrency)}</div>
          </div>
        </CanViewField>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : safes?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">لا توجد خزنة. أضف خزنة جديدة.</div>
        ) : (
          safes?.map((safe) => (
            <div key={safe.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{safe.name_ar}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${safe.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {safe.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <CanViewField fieldPermission="field:view_safe_balance">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {formatBalance(safe.balance, safe.currency)}
                </div>
              </CanViewField>
              <div className="flex gap-2 flex-wrap">
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost-success" size="sm" onClick={() => { setMovementSafe(safe); setMovementTab('in'); }}>💰 إيداع</Button></Can>
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost-danger" size="sm" onClick={() => { setMovementSafe(safe); setMovementTab('out'); }}>💸 سحب</Button></Can>
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost" size="sm" onClick={() => { setEditSafe(safe); setShowForm(true); }}>تعديل</Button></Can>
                <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button variant="ghost-danger" size="sm" onClick={() => { if (confirm('حذف الخزنة؟')) deleteMutation.mutate(safe.id); }}>حذف</Button></Can>
              </div>
            </div>
          ))
        )}
      </div>

      {movementSafe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMovementSafe(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{movementSafe.name_ar}</h2>
              <button type="button" onClick={() => setMovementSafe(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl cursor-pointer">✕</button>
            </div>
            <div className="flex gap-2 mb-4">
              <Button type="button" variant={movementTab === 'in' ? 'success' : 'secondary'} onClick={() => setMovementTab('in')} className="flex-1">💰 إيداع</Button>
              <Button type="button" variant={movementTab === 'out' ? 'danger' : 'secondary'} onClick={() => setMovementTab('out')} className="flex-1">💸 سحب</Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ ({movementSafe.currency?.code})</label>
                <input type="number" value={amount} min="1"
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="أدخل المبلغ" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" rows="2" placeholder="اختياري" />
              </div>
              <Can permission={PERMISSIONS.MANAGE_INVENTORY}><Button onClick={() => movementMutation.mutate({
                safe_id: movementSafe.id,
                type: movementTab === 'in' ? 'cash_in' : 'cash_out',
                amount: parseInt(amount),
                currency_id: movementSafe.currency_id,
                notes: notes || undefined,
              })}
                disabled={!amount || parseInt(amount) <= 0 || movementMutation.isPending}
                loading={movementMutation.isPending}
                variant={movementTab === 'in' ? 'success' : 'danger'}
                className="w-full">
                {`تأكيد ${movementTab === 'in' ? 'الإيداع' : 'السحب'}`}
              </Button></Can>
            </div>

            {movements && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">آخر الحركات</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {movements.data?.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">لا توجد حركات</p>
                  ) : (
                    movements.data?.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-800">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">{typeLabels[m.type] || m.type}</span>
                          {m.notes && <span className="text-gray-400 dark:text-gray-500 mr-1">— {m.notes}</span>}
                        </div>
                        <span className={`font-medium ${m.type === 'cash_in' || m.type === 'transfer_from_register' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {m.type === 'cash_in' || m.type === 'transfer_from_register' ? '+' : '-'}{m.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <SafeBoxForm
          editSafe={editSafe}
          currencies={currencies}
          branchId={branchId}
          onClose={() => { setShowForm(false); setEditSafe(null); }}
          onSaved={() => { queryClient.invalidateQueries(['safe-boxes']); setShowForm(false); setEditSafe(null); }}
        />
      )}
    </div>
  );
}

function SafeBoxForm({ editSafe, currencies, branchId, onClose, onSaved }) {
  const [name, setName] = useState(editSafe?.name || '');
  const [nameAr, setNameAr] = useState(editSafe?.name_ar || '');
  const [currencyId, setCurrencyId] = useState(editSafe?.currency_id || currencies?.[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editSafe) {
        await client.put(`/safe/${editSafe.id}`, { name, name_ar: nameAr, currency_id: currencyId });
      } else {
        await client.post('/safe', { branch_id: branchId, name, name_ar: nameAr, currency_id: currencyId });
      }
      onSaved();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{editSafe ? 'تعديل خزنة' : 'إضافة خزنة جديدة'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (إنجليزي)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (عربي)</label>
            <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة</label>
            <select value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              {currencies?.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={loading} className="flex-1">{editSafe ? 'حفظ التعديلات' : 'إضافة'}</Button>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
