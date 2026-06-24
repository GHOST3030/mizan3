import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Package } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Button, FormModal, Alert } from '../../components/ui';

function QuickAddModal({ label, fields, onSubmit, onClose }) {
  const [vals, setVals] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!fields.every((f) => vals[f.name]?.trim())) {
      setErr('جميع الحقول مطلوبة');
      return;
    }
    setLoading(true);
    try {
      const payload = {};
      fields.forEach((f) => { payload[f.name] = vals[f.name]; });
      const res = await client.post(fields[0].endpoint, payload);
      onSubmit(res.data);
      onClose();
    } catch (err) {
      setErr(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 w-80 mx-2 animate-scale-in">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">{label}</h3>
        {err && <Alert type="error" className="mb-2">{err}</Alert>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
              <input value={vals[f.name] || ''} onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" autoFocus />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={loading} className="flex-1">إضافة</Button>
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductForm({ product, onClose, onSuccess }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    branch_id: user?.branch?.id || '',
    name: '', name_ar: '', barcode: '', sku: '',
    cost_price: '', selling_price: '', min_stock: 0,
    unit_id: '', category_id: '', brand_id: '', is_active: true,
  });
  const [productUnits, setProductUnits] = useState([]);
  const [showAdd, setShowAdd] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: units } = useQuery({ queryKey: ['units'], queryFn: async () => (await client.get('/units')).data });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => (await client.get('/categories')).data });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: async () => (await client.get('/brands')).data });

  useEffect(() => {
    if (product) {
      setForm({
        branch_id: product.branch_id, name: product.name, name_ar: product.name_ar,
        barcode: product.barcode || '', sku: product.sku || '',
        cost_price: product.cost_price, selling_price: product.selling_price,
        min_stock: product.min_stock, unit_id: product.unit_id,
        category_id: product.category_id || '', brand_id: product.brand_id || '',
        is_active: product.is_active,
      });
      if (product.product_units?.length > 0) {
        setProductUnits(product.product_units.map((pu) => ({
          id: pu.id,
          unit_id: pu.unit_id,
          unit_name: pu.unit?.name_ar || '',
          conversion_factor: pu.conversion_factor,
          purchase_price: pu.purchase_price ?? '',
          selling_price: pu.selling_price ?? '',
          is_base: pu.is_base,
        })));
      }
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const addProductUnit = () => {
    setProductUnits((prev) => [...prev, {
      id: null, unit_id: '', conversion_factor: 1,
      purchase_price: '', selling_price: '', is_base: prev.length === 0,
    }]);
  };

  const updateProductUnit = (index, field, value) => {
    setProductUnits((prev) => prev.map((pu, i) => i === index ? { ...pu, [field]: value } : pu));
  };

  const removeProductUnit = (index) => {
    setProductUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        cost_price: parseFloat(form.cost_price),
        selling_price: parseFloat(form.selling_price),
        min_stock: parseInt(form.min_stock, 10),
        barcode: form.barcode || null,
        sku: form.sku || null,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
      };
      if (product) {
        await client.put(`/products/${product.id}`, payload);
      } else {
        await client.post('/products', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddSuccess = useCallback((type) => (newItem) => {
    queryClient.invalidateQueries({ queryKey: [type] });
    setForm((f) => ({ ...f, [type === 'units' ? 'unit_id' : type === 'categories' ? 'category_id' : 'brand_id']: newItem.id }));
  }, [queryClient]);

  return (
    <FormModal open onClose={onClose} title={product ? 'تعديل المنتج' : 'إضافة منتج جديد'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالعربي *</label>
            <input name="name_ar" value={form.name_ar} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالإنجليزي *</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الباركود</label>
            <input name="barcode" value={form.barcode} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="اختياري" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
            <input name="sku" value={form.sku} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="اختياري" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر التكلفة (هللة) *</label>
            <input name="cost_price" type="number" value={form.cost_price} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر البيع (هللة) *</label>
            <input name="selling_price" type="number" value={form.selling_price} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required min="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة الأساسية *</label>
            <div className="flex gap-2">
              <select name="unit_id" value={form.unit_id} onChange={handleChange}
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required>
                <option value="">اختر الوحدة</option>
                {units?.map((u) => (<option key={u.id} value={u.id}>{u.name_ar}</option>))}
              </select>
              <Button type="button" variant="ghost" onClick={() => setShowAdd('unit')}>+ إضافة</Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التصنيف</label>
            <div className="flex gap-2">
              <select name="category_id" value={form.category_id} onChange={handleChange}
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="">بدون تصنيف</option>
                {categories?.map((c) => (<option key={c.id} value={c.id}>{c.name_ar}</option>))}
              </select>
              <Button type="button" variant="ghost" onClick={() => setShowAdd('category')}>+ إضافة</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العلامة التجارية</label>
            <div className="flex gap-2">
              <select name="brand_id" value={form.brand_id} onChange={handleChange}
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="">بدون علامة</option>
                {brands?.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
              <Button type="button" variant="ghost" onClick={() => setShowAdd('brand')}>+ إضافة</Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى</label>
            <input name="min_stock" type="number" value={form.min_stock} onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" min="0" />
          </div>
        </div>

        {/* Multi-unit section */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Package className="w-4 h-4" /> وحدات متعددة
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={addProductUnit}>
              <Plus className="w-3.5 h-3.5" /> إضافة وحدة
            </Button>
          </div>
          {productUnits.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">أضف وحدات إضافية لهذا المنتج (مثلاً: كرتون، صندوق)</p>
          )}
          {productUnits.map((pu, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">الوحدة</label>
                <select value={pu.unit_id} onChange={(e) => updateProductUnit(i, 'unit_id', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1.5 text-xs">
                  <option value="">اختر</option>
                  {units?.filter((u) => u.id === productUnits[i].unit_id || !productUnits.some((p) => p.unit_id === u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">معامل التحويل</label>
                <input type="number" min="1" value={pu.conversion_factor}
                  onChange={(e) => updateProductUnit(i, 'conversion_factor', parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">سعر الشراء</label>
                <input type="number" min="0" value={pu.purchase_price}
                  onChange={(e) => updateProductUnit(i, 'purchase_price', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1.5 text-xs" placeholder="اختياري" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">سعر البيع</label>
                <input type="number" min="0" value={pu.selling_price}
                  onChange={(e) => updateProductUnit(i, 'selling_price', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1.5 text-xs" placeholder="اختياري" />
              </div>
              <div className="flex gap-1 pb-0.5">
                <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={pu.is_base}
                    onChange={(e) => { setProductUnits((prev) => prev.map((p, idx) => ({ ...p, is_base: idx === i ? e.target.checked : false }))); }}
                    className="w-3 h-3" />
                  أساسي
                </label>
                {!pu.is_base && (
                  <button type="button" onClick={() => removeProductUnit(i)}
                    className="text-red-400 hover:text-red-600 transition p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="is_active" id="is_active"
            checked={form.is_active} onChange={handleChange} className="w-4 h-4" />
          <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">منتج نشط</label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{product ? 'حفظ التعديلات' : 'إضافة المنتج'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>

      {showAdd === 'unit' && (
        <QuickAddModal label="إضافة وحدة جديدة"
          fields={[{ name: 'name', label: 'الاسم بالإنجليزي', endpoint: '/units' }, { name: 'name_ar', label: 'الاسم بالعربي' }]}
          onSubmit={handleQuickAddSuccess('units')} onClose={() => setShowAdd(null)} />
      )}
      {showAdd === 'category' && (
        <QuickAddModal label="إضافة تصنيف جديد"
          fields={[{ name: 'name', label: 'الاسم بالإنجليزي', endpoint: '/categories' }, { name: 'name_ar', label: 'الاسم بالعربي' }]}
          onSubmit={handleQuickAddSuccess('categories')} onClose={() => setShowAdd(null)} />
      )}
      {showAdd === 'brand' && (
        <QuickAddModal label="إضافة علامة تجارية جديدة"
          fields={[{ name: 'name', label: 'الاسم', endpoint: '/brands' }]}
          onSubmit={handleQuickAddSuccess('brands')} onClose={() => setShowAdd(null)} />
      )}
    </FormModal>
  );
}
