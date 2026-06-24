import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function WastagePage() {
  const [wastageType, setWastageType] = useState('wastage');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => { const res = await client.get('/products', { params: { limit: 500 } }); return res.data; },
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', branchId],
    queryFn: async () => { const res = await client.get(`/inventory/warehouses?branch_id=${branchId}`); return res.data; },
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ['wastage', branchId],
    queryFn: async () => { const res = await client.get('/inventory/wastage', { params: { branch_id: branchId, limit: 50 } }); return res.data; },
  });

  const wastageMutation = useMutation({
    mutationFn: (data) => client.post('/inventory/wastage', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wastage']);
      setProductId('');
      setQuantity('');
      setNotes('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productId || !quantity) return;
    wastageMutation.mutate({
      branch_id: branchId,
      product_id: productId,
      warehouse_id: warehouseId || undefined,
      quantity: parseInt(quantity),
      wastage_type: wastageType,
      notes: notes || undefined,
    });
  };

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">تالف ومفقود</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-4">تسجيل جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={wastageType === 'wastage' ? 'danger' : 'secondary'} onClick={() => setWastageType('wastage')} className="flex-1">🔴 تالف</Button>
              <Button type="button" variant={wastageType === 'missing' ? 'warning' : 'secondary'} onClick={() => setWastageType('missing')} className="flex-1">🟡 مفقود</Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنتج</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" required>
                <option value="">اختر المنتج</option>
                {products?.data?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name_ar || p.name} - {p.selling_price}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكمية</label>
                <input type="number" value={quantity} min="1" onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المخزن</label>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100">
                  <option value="">عام</option>
                  {warehouses?.map((w) => (
                    <option key={w.id} value={w.id}>{w.name_ar || w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السبب / ملاحظات</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" placeholder={wastageType === 'wastage' ? 'سبب التلف...' : 'سبب الفقدان...'} />
            </div>

            <Can permission={PERMISSIONS.INVENTORY_WASTAGE}>
              <Button type="submit" disabled={!productId || !quantity || wastageMutation.isPending}
                variant={wastageType === 'wastage' ? 'danger' : 'warning'}
                loading={wastageMutation.isPending}
                className="w-full">
                {`تسجيل ${wastageType === 'wastage' ? 'التالف' : 'المفقود'}`}
              </Button>
            </Can>

            {wastageMutation.isSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm text-center">
                ✅ تم التسجيل بنجاح
              </div>
            )}
          </form>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
          <h2 className="font-bold text-gray-700 dark:text-gray-300 p-4 border-b dark:border-gray-800">السجل</h2>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
                <tr>
                  <th className="text-right px-3 py-2">المنتج</th>
                  <th className="text-right px-3 py-2">النوع</th>
                  <th className="text-right px-3 py-2">الكمية</th>
                  <th className="text-right px-3 py-2">التاريخ</th>
                  <th className="text-right px-3 py-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {movements?.data?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد سجلات</td></tr>
                ) : (
                  movements?.data?.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-3 py-2 font-medium">{m.product?.name_ar || m.product?.name}</td>
                      <td className="px-3 py-2">
                        {m.reference_type === 'wastage'
                          ? <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-xs">تالف</span>
                          : <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs">مفقود</span>}
                      </td>
                      <td className="px-3 py-2 font-medium text-red-600 dark:text-red-400">{Math.abs(m.quantity)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{new Date(m.created_at).toLocaleString('ar')}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{m.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
