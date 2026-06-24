import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export default function LowStockPage() {
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => { const res = await client.get('/inventory/warehouses'); return res.data; },
  });

  const { data: lowData, isLoading } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: async () => {
      const res = await client.get('/inventory/low-stock');
      return res.data;
    },
  });

  const lowStockProducts = lowData?.data || [];
  const meta = lowData?.meta || { total: 0, low_stock: 0, out_of_stock: 0 };

  const critical = lowStockProducts.filter((b) => b.current_stock === 0);
  const warning = lowStockProducts.filter((b) => b.current_stock > 0 && b.current_stock <= (b.min_stock || 0) / 2);
  const notice = lowStockProducts.filter((b) => !critical.includes(b) && !warning.includes(b));

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">⚠️ تنبيهات المخزون</h1>
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">كل المخازن</option>
          {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name_ar || w.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="text-red-500 dark:text-red-400 text-xs font-medium mb-1">منتهي (0)</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{critical.length}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="text-amber-500 dark:text-amber-400 text-xs font-medium mb-1">منخفض جداً</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warning.length}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
          <div className="text-yellow-500 dark:text-yellow-400 text-xs font-medium mb-1">منخفض</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{notice.length}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : lowStockProducts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-gray-500 dark:text-gray-400">لا توجد منتجات منخفضة المخزون</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
              <tr>
                <th className="text-right px-4 py-3">المنتج</th>
                <th className="text-right px-4 py-3">الباركود</th>
                <th className="text-right px-4 py-3">المخزن</th>
                <th className="text-right px-4 py-3">الرصيد الحالي</th>
                <th className="text-right px-4 py-3">الحد الأدنى</th>
                <th className="text-right px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {lowStockProducts.map((b) => {
                const pct = b.min_stock > 0 ? Math.round((b.current_stock / b.min_stock) * 100) : 0;
                const isCritical = b.current_stock === 0;
                const isWarning = b.current_stock > 0 && b.current_stock <= (b.min_stock || 0) / 2;
                const warehouseName = b.warehouses?.[0]?.name_ar || b.warehouses?.[0]?.name || 'الرئيسي';
                return (
                  <tr key={b.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition ${isCritical ? 'bg-red-50 dark:bg-red-900/20' : isWarning ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{b.name_ar || b.name}</td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{b.barcode || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{warehouseName}</td>
                    <td className="px-4 py-3 font-bold">{b.current_stock}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.min_stock}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div className={`h-2 rounded-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-yellow-500 dark:bg-yellow-600'}`}
                            style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${isCritical ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
