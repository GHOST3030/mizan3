import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { Button } from '../../components/ui';

export default function SupplierStatementPage() {
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showList, setShowList] = useState(false);

  const { data: suppliersData } = useQuery({
    queryKey: ['supplier-statement-search', supplierSearch],
    queryFn: async () => {
      const res = await client.get('/suppliers', { params: { q: supplierSearch || undefined, limit: 10 } });
      return res.data;
    },
  });

  const { data: purchasesData } = useQuery({
    queryKey: ['supplier-statement-purchases', selectedSupplier?.id],
    queryFn: async () => {
      const res = await client.get('/purchases', { params: { supplier_id: selectedSupplier.id, limit: 100 } });
      return res.data;
    },
    enabled: !!selectedSupplier,
  });

  const totalPurchases = purchasesData?.data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
  const balance = selectedSupplier?.balance || 0;

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">كشف حساب المورد</h1>

      {!selectedSupplier ? (
        <div className="relative max-w-md">
          <input type="text" value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)} placeholder="🔍 بحث باسم المورد..."
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {showList && suppliersData?.data?.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {suppliersData.data.map((s) => (
                <button key={s.id} onClick={() => { setSelectedSupplier(s); setShowList(false); }}
                  className="block w-full text-right px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/40">{s.name}</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">{selectedSupplier.name}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)}>تغيير المورد</Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4">
              <div className="text-gray-400 dark:text-gray-500 text-sm">إجمالي المشتريات</div>
              <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalPurchases.toLocaleString()} ﷼</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{purchasesData?.data?.length || 0} فاتورة</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4">
              <div className="text-gray-400 dark:text-gray-500 text-sm">الرصيد</div>
              <div className={`text-xl font-bold ${balance > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {balance.toLocaleString()} ﷼
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
                <tr>
                  <th className="text-right px-4 py-3">رقم الفاتورة</th>
                  <th className="text-right px-4 py-3">التاريخ</th>
                  <th className="text-right px-4 py-3">الإجمالي</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                </tr>
              </thead>
<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {purchasesData?.data?.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد فواتير</td></tr>
                ) : (
                  purchasesData?.data?.map((p) => (
<tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{p.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('ar')}</td>
                    <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">{p.total?.toLocaleString()} ﷼</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          p.status === 'returned' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                          {p.status === 'completed' ? 'مكتملة' : p.status === 'returned' ? 'مرتجعة' : 'مسودة'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
