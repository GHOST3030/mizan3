import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, PageHeader } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function StockCountPage() {
  const [showForm, setShowForm] = useState(false);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['stock-counts', branchId],
    queryFn: async () => { const res = await client.get(`/inventory/stock-counts?branch_id=${branchId}&limit=30`); return res.data; },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => client.post(`/inventory/stock-counts/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['stock-counts']),
  });

  return (
    <div className="p-6" dir="rtl">
      <PageHeader title="جرد المخزون" actions={<Can permission={PERMISSIONS.INVENTORY_COUNT}><Button onClick={() => setShowForm(true)}>+ جرد جديد</Button></Can>} />

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
              <tr>
                <th className="text-right px-4 py-3">المخزن</th>
                <th className="text-right px-4 py-3">المنفذ</th>
                <th className="text-right px-4 py-3">الأصناف</th>
                <th className="text-right px-4 py-3">الفروقات</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-center px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data?.data?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد جرديات</td></tr>
              ) : (
                data?.data?.map((sc) => {
                  const diffs = sc.items?.filter((i) => i.difference !== 0) || [];
                  return (
                    <tr key={sc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-3 font-medium">{sc.warehouse?.name_ar || sc.warehouse?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sc.user?.name}</td>
                      <td className="px-4 py-3">{sc.items?.length || 0}</td>
                      <td className="px-4 py-3">
                        {diffs.length > 0
                          ? <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-xs">{diffs.length} صنف</span>
                          : <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs">مطابق</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(sc.counted_at || sc.created_at).toLocaleDateString('ar')}</td>
                      <td className="px-4 py-3 text-center">
                        {sc.notes?.includes('✅') ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">✅ معتمد</span>
                        ) : (
                          <Can permission={PERMISSIONS.INVENTORY_COUNT}><Button size="sm" variant="success" onClick={() => approveMutation.mutate(sc.id)}
                            loading={approveMutation.isPending} disabled={approveMutation.isPending}>اعتماد</Button></Can>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <StockCountForm
          branchId={branchId}
          userId={user?.id}
          onClose={() => setShowForm(false)}
          onSuccess={() => { queryClient.invalidateQueries(['stock-counts']); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function StockCountForm({ branchId, userId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    warehouse_id: '',
    notes: '',
  });
  const [items, setItems] = useState([{ product_id: '', expected_qty: 0, actual_qty: 0 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['pos-products', ''],
    queryFn: async () => { const res = await client.get('/products', { params: { limit: 500, is_active: 'true' } }); return res.data; },
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', branchId],
    queryFn: async () => { const res = await client.get(`/inventory/warehouses?branch_id=${branchId}`); return res.data; },
  });

  const addRow = () => setItems([...items, { product_id: '', expected_qty: 0, actual_qty: 0 }]);
  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i][field] = field === 'product_id' ? value : parseInt(value) || 0;
    setItems(copy);
  };
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.warehouse_id) { setError('اختر المخزن'); return; }
    const validItems = items.filter((it) => it.product_id);
    if (validItems.length === 0) { setError('أضف صنف واحد على الأقل'); return; }
    setLoading(true);
    try {
      await client.post('/inventory/stock-counts', {
        branch_id: branchId,
        warehouse_id: form.warehouse_id,
        user_id: userId,
        notes: form.notes || null,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          expected_qty: it.expected_qty,
          actual_qty: it.actual_qty,
        })),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">جرد جديد</h2>
          <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المخزن *</label>
              <select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" required>
                <option value="">اختر المخزن</option>
                {warehouses?.filter((w) => w.is_active).map((w) => (
                  <option key={w.id} value={w.id}>{w.name_ar || w.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الأصناف</label>
              <Button type="button" variant="ghost" size="sm" onClick={addRow}>+ إضافة صنف</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100">
                    <option value="">اختر المنتج</option>
                    {products?.data?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="متوقع" value={item.expected_qty}
                    onChange={(e) => updateItem(i, 'expected_qty', e.target.value)}
                    className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
                  <input type="number" placeholder="فعلي" value={item.actual_qty}
                    onChange={(e) => updateItem(i, 'actual_qty', e.target.value)}
                    className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
                  {item.product_id && (
                    <span className={`text-xs self-center font-medium w-12 text-center ${item.expected_qty !== item.actual_qty ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {item.actual_qty - item.expected_qty === 0 ? '✓' : `${(item.actual_qty - item.expected_qty) > 0 ? '+' : ''}${item.actual_qty - item.expected_qty}`}
                    </span>
                  )}
                  <Button type="button" variant="ghost-danger" size="sm" onClick={() => removeItem(i)}>✕</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">حفظ الجرد</Button>
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
