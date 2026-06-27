import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, PageHeader } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function StockTransfersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', branchId],
    queryFn: async () => {
      const res = await client.get('/inventory/stock-transfers', { params: { from_branch_id: branchId, limit: 50 } });
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => client.post(`/inventory/stock-transfers/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['stock-transfers']),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => client.post(`/inventory/stock-transfers/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries(['stock-transfers']),
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => { const res = await client.get('/core/branches'); return res.data; },
  });

  return (
    <div className="p-6" dir="rtl">
      <PageHeader title="تحويل المخزون" actions={<Can permission={PERMISSIONS.INVENTORY_TRANSFER}><Button onClick={() => setShowCreate(true)}>+ تحويل جديد</Button></Can>} />

      {showCreate && (
        <CreateStockTransfer
          branches={branches}
          branchId={branchId}
          onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries(['stock-transfers']); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
              <tr>
                <th className="text-right px-4 py-3">من فرع</th>
                <th className="text-right px-4 py-3">إلى فرع</th>
                <th className="text-right px-4 py-3">عدد الأصناف</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data?.data?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد تحويلات</td></tr>
              ) : (
                data?.data?.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3 font-medium">{t.from_branch?.name_ar || t.from_branch?.name}</td>
                    <td className="px-4 py-3">{t.to_branch?.name_ar || t.to_branch?.name}</td>
                    <td className="px-4 py-3 text-center">{t.items?.length}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(t.created_at).toLocaleString('ar')}</td>
                    <td className="px-4 py-3">
                      {t.status === 'completed' ? (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs">مكتمل</span>
                      ) : t.status === 'cancelled' ? (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded text-xs">ملغي</span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-xs">معلق</span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {t.status === 'pending' && (
                        <>
                          <Can permission={PERMISSIONS.INVENTORY_TRANSFER}><Button size="sm" variant="success" onClick={() => { if (confirm('اعتماد تحويل المخزون؟')) approveMutation.mutate(t.id); }}
                            loading={approveMutation.isPending} disabled={approveMutation.isPending}>اعتماد</Button></Can>
                          <Can permission={PERMISSIONS.INVENTORY_TRANSFER}><Button size="sm" variant="danger" onClick={() => { if (confirm('إلغاء التحويل؟')) cancelMutation.mutate(t.id); }}
                            loading={cancelMutation.isPending} disabled={cancelMutation.isPending}>إلغاء</Button></Can>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}>{selectedId === t.id ? 'إخفاء' : 'تفاصيل'}</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && <StockTransferDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function CreateStockTransfer({ branches, branchId, onSuccess, onCancel }) {
  const [toBranchId, setToBranchId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products', branchId],
    queryFn: async () => { const res = await client.get('/products', { params: { branch_id: branchId } }); return res.data; },
  });

  const addItem = () => setItems([...items, { product_id: '', quantity: 1 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i][field] = field === 'quantity' ? parseInt(value) || 1 : value;
    setItems(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toBranchId || items.some((i) => !i.product_id)) return;
    setSubmitting(true);
    try {
      await client.post('/inventory/stock-transfers', {
        from_branch_id: branchId,
        to_branch_id: toBranchId,
        notes: notes || null,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      onSuccess();
    } catch (err) {
      alert(err?.response?.data?.error || 'فشل إنشاء التحويل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 mb-6 border border-blue-200 dark:border-blue-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى فرع</label>
          <select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" required>
            <option value="">اختر الفرع الهدف</option>
            {branches?.filter((b) => b.id !== branchId).map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar || b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الأصناف</label>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" required>
                <option value="">اختر صنف</option>
                {products?.data?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>
                ))}
              </select>
              <input type="number" value={item.quantity} min="1" onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-center dark:bg-gray-800 dark:text-gray-100" required />
              {items.length > 1 && (
                <Button type="button" variant="ghost-danger" size="sm" onClick={() => removeItem(idx)}>✕</Button>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addItem} className="mt-1">+ إضافة صنف</Button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" />
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={submitting}>إنشاء التحويل</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        </div>
      </form>
    </div>
  );
}

function StockTransferDetail({ id, onClose }) {
  const { data: transfer, isLoading } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: async () => { const res = await client.get(`/inventory/stock-transfers/${id}`); return res.data; },
  });

  if (isLoading) return <div className="mt-6 p-4 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>;
  if (!transfer) return null;

  return (
    <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">تفاصيل التحويل</h2>
        <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div><span className="text-gray-500 dark:text-gray-400">من فرع:</span><div className="font-medium">{transfer.from_branch?.name_ar}</div></div>
        <div><span className="text-gray-500 dark:text-gray-400">إلى فرع:</span><div className="font-medium">{transfer.to_branch?.name_ar}</div></div>
        <div><span className="text-gray-500 dark:text-gray-400">التاريخ:</span><div className="font-medium">{new Date(transfer.created_at).toLocaleString('ar')}</div></div>
        <div><span className="text-gray-500 dark:text-gray-400">الحالة:</span>
          <div className="font-medium">
            {transfer.status === 'completed' ? '✅ مكتمل' : transfer.status === 'cancelled' ? '❌ ملغي' : '⏳ معلق'}
          </div>
        </div>
      </div>

      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">الأصناف ({transfer.items?.length})</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
          <tr>
            <th className="text-right px-3 py-2">المنتج</th>
            <th className="text-right px-3 py-2">الكمية</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {transfer.items?.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2">{item.product?.name_ar || item.product?.name}</td>
              <td className="px-3 py-2 font-medium">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
