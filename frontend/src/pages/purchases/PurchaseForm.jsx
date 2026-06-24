import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Package } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Button, FormModal, Alert } from '../../components/ui';

export default function PurchaseForm({ purchase, userId, onClose, onSuccess }) {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const isEdit = !!purchase;

  const { data: currencyData } = useQuery({
    queryKey: ['purchase-default-currency'],
    queryFn: async () => {
      const res = await client.get('/currencies');
      return res.data?.find((c) => c.is_default) || res.data?.[0] || null;
    },
    enabled: !!branchId,
  });

  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id || '');
  const [supplierSearch, setSupplierSearch] = useState(purchase?.supplier?.name || '');
  const [showSupplierList, setShowSupplierList] = useState(false);
  const [status, setStatus] = useState(purchase?.status || 'completed');
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (purchase) {
      setSupplierId(purchase.supplier_id || '');
      setSupplierSearch(purchase.supplier?.name || '');
      setStatus(purchase.status || 'completed');
      setNotes(purchase.notes || '');
      if (purchase.items) {
        setItems(purchase.items.map((item) => {
          const productUnits = item.product?.product_units || [];
          return {
            product_id: item.product_id,
            name: item.product?.name_ar || item.product?.name || '',
            barcode: item.product?.barcode || '',
            unit_id: item.unit_id || productUnits.find((pu) => pu.is_base)?.unit_id || '',
            unit_price: item.unit_price,
            quantity: item.quantity,
            total: item.total,
            product_units: productUnits,
          };
        }));
      }
    }
  }, [purchase]);

  const { data: productsData } = useQuery({
    queryKey: ['purchase-products', productSearch],
    queryFn: async () => {
      const res = await client.get('/products', { params: { q: productSearch || undefined, limit: 20 } });
      return res.data;
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['purchase-suppliers', supplierSearch],
    queryFn: async () => {
      const res = await client.get('/suppliers', { params: { q: supplierSearch || undefined, limit: 10 } });
      return res.data;
    },
  });

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const total = subtotal;

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        const res = await client.put(`/purchases/${purchase.id}`, data);
        return res.data;
      }
      const res = await client.post('/purchases', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchases']);
      onSuccess();
    },
    onError: (err) => setError(err.response?.data?.message || 'حدث خطأ'),
  });

  const addProduct = (product) => {
    const productUnits = product.product_units || [];
    const baseUnit = productUnits.find((pu) => pu.is_base) || productUnits[0];
    const defaultUnitId = baseUnit?.unit_id || '';

    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price }
            : i
        )
      );
    } else {
      const defaultPurchasePrice = baseUnit?.purchase_price || product.cost_price;
      setItems((prev) => [...prev, {
        product_id: product.id,
        name: product.name_ar || product.name,
        barcode: product.barcode,
        unit_id: defaultUnitId,
        unit_price: defaultPurchasePrice,
        quantity: 1,
        total: defaultPurchasePrice,
        product_units: productUnits,
      }]);
    }
    setShowProductList(false);
    setProductSearch('');
  };

  const updateItem = (productId, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const updated = { ...item, [field]: value };

        if (field === 'unit_id') {
          const selectedUnit = item.product_units?.find((pu) => pu.unit_id === value);
          if (selectedUnit?.purchase_price) {
            updated.unit_price = selectedUnit.purchase_price;
          }
        }

        if (field === 'unit_price' || field === 'quantity') {
          updated.total = updated.quantity * updated.unit_price;
        }
        return updated;
      })
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (items.length === 0) { setError('يجب إضافة صنف واحد على الأقل'); return; }
    if (isEdit) {
      mutation.mutate({ status, supplier_id: supplierId || null, notes: notes || undefined });
      return;
    }
    mutation.mutate({
      branch_id: branchId,
      supplier_id: supplierId || null,
      user_id: userId,
      status,
      subtotal,
      discount_amount: 0,
      currency_id: currencyData?.id,
      exchange_rate: 1,
      notes: notes || null,
      items: items.map((i) => ({
        product_id: i.product_id,
        unit_id: i.unit_id || null,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total,
      })),
    });
  };

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const selectClass = "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <FormModal open onClose={onClose} title={isEdit ? 'تعديل فاتورة المشتريات' : 'فاتورة مشتريات جديدة'} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المورد</label>
            <input type="text" value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierList(true); }}
              onFocus={() => setShowSupplierList(true)} placeholder="اختر المورد..."
              className={inputClass} />
            {showSupplierList && suppliersData?.data?.length > 0 && (
              <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto animate-fade-in">
                {(suppliersData?.data || []).map((s) => (
                  <button key={s.id} type="button" onClick={() => { setSupplierId(s.id); setSupplierSearch(s.name); setShowSupplierList(false); }}
                    className="block w-full text-right px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">{s.name}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="completed">مكتملة (تحديث المخزون)</option>
              <option value="draft">مسودة</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إضافة أصناف</label>
          <input type="text" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowProductList(true); }}
            onFocus={() => setShowProductList(true)} placeholder="بحث عن منتج..."
            className={inputClass} />
          {showProductList && productsData?.data?.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto animate-fade-in">
              {productsData.data.map((p) => (
                <button key={p.id} type="button" onClick={() => addProduct(p)}
                  className="block w-full text-right px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                  {p.name_ar} - {p.cost_price.toLocaleString()} ﷼
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border dark:border-gray-700 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="text-right px-3 py-2">المنتج</th>
                  <th className="text-right px-3 py-2">الوحدة</th>
                  <th className="text-right px-3 py-2">الكمية</th>
                  <th className="text-right px-3 py-2">سعر الوحدة</th>
                  <th className="text-right px-3 py-2">الإجمالي</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                  <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100 text-xs min-w-[120px]">{item.name}</td>
                    <td className="px-3 py-2 w-24">
                      <select value={item.unit_id} onChange={(e) => updateItem(item.product_id, 'unit_id', e.target.value)}
                        className={selectClass}>
                        {(item.product_units?.length > 0 ? item.product_units : []).map((pu) => (
                          <option key={pu.unit_id} value={pu.unit_id}>{pu.unit?.name_ar || ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input type="number" value={item.quantity} min="1" step="any"
                        onChange={(e) => updateItem(item.product_id, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs text-center dark:text-gray-100 transition" />
                    </td>
                    <td className="px-3 py-2 w-28">
                      <input type="number" value={item.unit_price} min="0" step="any"
                        onChange={(e) => updateItem(item.product_id, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs text-center dark:text-gray-100 transition" />
                    </td>
                    <td className="px-3 py-2 text-green-600 dark:text-green-400 font-bold text-xs">
                      {item.total.toLocaleString()} ﷼
                    </td>
                    <td className="px-3 py-2">
                      <Button type="button" variant="ghost-danger" size="sm" onClick={() => removeItem(item.product_id)} iconOnly>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <span className="font-bold text-gray-800 dark:text-gray-100">الإجمالي</span>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">{total.toLocaleString()} ﷼</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
            rows={2} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending} className="flex-1">{isEdit ? 'حفظ التعديلات' : 'حفظ الفاتورة'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
