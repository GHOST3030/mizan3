import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Button, Input, Card, Alert, EmptyState, toast } from '../../components/ui';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

export default function ReturnSalePage() {
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnedItems, setReturnedItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: salesData } = useQuery({
    queryKey: ['return-sales-search', invoiceSearch],
    queryFn: async () => {
      const res = await client.get('/sales', { params: { q: invoiceSearch || undefined, status: 'completed', limit: 20 } });
      return res.data;
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const res = await client.post(`/sales/${selectedSale.id}/return`, {
        returned_items: returnedItems.length > 0 ? returnedItems : undefined,
        notes: notes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      queryClient.invalidateQueries(['return-sales-search']);
      setSelectedSale(null);
      setReturnedItems([]);
      setNotes('');
      setInvoiceSearch('');
      toast('تم إرجاع الفاتورة بنجاح');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الإرجاع');
    },
  });

  const toggleItem = (itemId) => {
    setReturnedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    if (selectedSale?.items) {
      setReturnedItems(returnedItems.length === selectedSale.items.length ? [] : selectedSale.items.map((i) => i.id));
    }
  };

  const resetForm = () => {
    setSelectedSale(null);
    setReturnedItems([]);
    setNotes('');
    setError('');
  };

  return (
    <div className="p-6" dir="rtl">
      {error && <Alert type="error" onClose={() => setError('')} className="mb-4">{error}</Alert>}

      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>← العودة للمبيعات</Button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">مرتجعات البيع</h1>
      </div>

      {!selectedSale ? (
        <div>
          <div className="mb-4">
            <Input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="🔍 بحث برقم الفاتورة أو اسم العميل..." className="max-w-md" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
                  <tr>
                    <th className="text-right px-4 py-3 whitespace-nowrap">رقم الفاتورة</th>
                    <th className="text-right px-4 py-3 whitespace-nowrap">العميل</th>
                    <th className="text-right px-4 py-3 whitespace-nowrap">الإجمالي</th>
                    <th className="text-right px-4 py-3 whitespace-nowrap">التاريخ</th>
                    <th className="text-right px-4 py-3 whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {salesData?.data?.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState icon="🧾" title="لا توجد فواتير مكتملة" message="لم يتم العثور على فواتير مكتملة للإرجاع" /></td></tr>
                  ) : (
                    salesData?.data?.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{sale.invoice_number}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{sale.customer?.name || 'نقدي'}</td>
                        <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400 whitespace-nowrap">{sale.total?.toLocaleString()} ﷼</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{new Date(sale.created_at).toLocaleDateString('ar')}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                        <Can permission={PERMISSIONS.CREATE_RETURNS}>
                          <Button variant="warning" size="sm" onClick={() => setSelectedSale(sale)}>
                            إرجاع
                          </Button>
                        </Can>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        <Card className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">
              إرجاع الفاتورة: {selectedSale.invoice_number}
            </h2>
            <Button variant="ghost" size="sm" onClick={resetForm}>رجوع</Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div><span className="text-gray-500 dark:text-gray-400">العميل: </span>{selectedSale.customer?.name || 'نقدي'}</div>
            <div><span className="text-gray-500 dark:text-gray-400">التاريخ: </span>{new Date(selectedSale.created_at).toLocaleDateString('ar')}</div>
            <div><span className="text-gray-500 dark:text-gray-400">قيمة الفاتورة: </span><span className="font-bold text-green-600 dark:text-green-400">{selectedSale.total?.toLocaleString()} ﷼</span></div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={returnedItems.length === selectedSale.items?.length}
                onChange={selectAllItems} className="w-4 h-4" />
              تحديد الكل
            </label>
          </div>

          <table className="w-full text-sm mb-4">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
              <tr>
                <th className="text-right px-3 py-2 w-10"></th>
                <th className="text-right px-3 py-2">المنتج</th>
                <th className="text-right px-3 py-2">الكمية</th>
                <th className="text-right px-3 py-2">السعر</th>
                <th className="text-right px-3 py-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {selectedSale.items?.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition ${returnedItems.includes(item.id) ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={returnedItems.includes(item.id)}
                      onChange={() => toggleItem(item.id)} className="w-4 h-4" />
                  </td>
                  <td className="px-3 py-2 font-medium">{item.product?.name_ar || item.product?.name || 'منتج'}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{item.unit_price?.toLocaleString()} ﷼</td>
                  <td className="px-3 py-2 font-medium">{item.total?.toLocaleString()} ﷼</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-4">
            <Input label="سبب الإرجاع (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب سبب الإرجاع..." as="textarea" rows={2} />
          </div>

          <div className="flex gap-3">
            <Can permission={PERMISSIONS.CREATE_RETURNS}>
              <Button onClick={() => returnMutation.mutate()} disabled={returnedItems.length === 0 || returnMutation.isPending}
                loading={returnMutation.isPending} variant="warning">
                تأكيد إرجاع {returnedItems.length} صنف
              </Button>
            </Can>
            <Button variant="secondary" onClick={resetForm}>إلغاء</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
