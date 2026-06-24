import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Button, PageHeader, Table, Input, Select, Alert,
  PageTransition, FormModal, SearchInput, ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import OpeningBalanceModal from '../../components/OpeningBalanceModal';
import { Can } from '../../components/Can';
import { CanViewField } from '../../components/CanViewField';
import { PERMISSIONS } from '../../utils/permissions';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [formSupplier, setFormSupplier] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [balanceTarget, setBalanceTarget] = useState(null);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      const res = await client.get('/suppliers', { params: { q: search, limit: 50 } });
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => { const res = await client.get('/suppliers/categories'); return res.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['suppliers']); toast('تم حذف المورد', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const openingBalanceMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/suppliers/${id}/opening-balance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      setBalanceTarget(null);
      toast('تم حفظ الرصيد الافتتاحي', 'success');
    },
    onError: (err) => setError(err.response?.data?.message || 'حدث خطأ'),
  });

  const columns = [
    { key: 'name', label: 'الاسم', render: (s) => <span className="font-medium text-gray-800 dark:text-gray-100">{s.name}</span> },
    { key: 'phone', label: 'رقم الهاتف', render: (s) => s.phone || '—' },
    { key: 'email', label: 'البريد', render: (s) => s.email || '—' },
    { key: 'balance', label: 'الرصيد', render: (s) => <CanViewField fieldPermission="field:view_supplier_balance"><span className="font-medium">{(s.balance ?? 0).toLocaleString()} ﷼</span></CanViewField> },
    { key: 'category', label: 'التصنيف', render: (s) => s.category?.name || '—' },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'الموردين', to: '/suppliers' }, { label: 'جميع الموردين' }]} />
      <PageHeader
        title="الموردين"
        actions={
          <div className="flex gap-2">
            <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}><Button variant="secondary" onClick={() => navigate('/suppliers/categories')}>التصنيفات</Button></Can>
            <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}><Button variant="secondary" onClick={() => navigate('/suppliers/statement')}>كشف حساب</Button></Can>
            <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}><Button onClick={() => { setFormSupplier(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة مورد</Button></Can>
          </div>
        }
      />

      {error && <Alert type="error" onClose={() => setError('')} className="mb-4">{error}</Alert>}

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو رقم الهاتف..." />
      </div>

      <Table
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        emptyMessage="لا يوجد موردين"
        emptyIcon="🚚"
        renderActions={(s) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}><Button variant="ghost" size="sm" onClick={() => setBalanceTarget(s)}>رصيد افتتاحي</Button></Can>
            <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}><Button variant="ghost" size="sm" onClick={() => { setFormSupplier(s); setShowForm(true); }}>تعديل</Button></Can>
            <Can permission={PERMISSIONS.MANAGE_SUPPLIERS}>
              <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(s.id)} message={`حذف المورد ${s.name}؟`}>حذف</ConfirmButton>
            </Can>
          </div>
        )}
      />

      {showForm && (
        <SupplierFormModal
          supplier={formSupplier} categories={categories} userBranchId={user?.branch?.id}
          onClose={() => { setShowForm(false); setFormSupplier(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['suppliers']); setShowForm(false); setFormSupplier(null); toast(formSupplier ? 'تم تحديث المورد' : 'تم إضافة المورد', 'success'); }}
        />
      )}

      {balanceTarget && (
        <OpeningBalanceModal
          entity={balanceTarget} type="supplier"
          loading={openingBalanceMutation.isPending}
          onSave={(data) => openingBalanceMutation.mutate({ id: balanceTarget.id, data })}
          onClose={() => setBalanceTarget(null)}
        />
      )}
    </PageTransition>
  );
}

function SupplierFormModal({ supplier, categories, userBranchId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: supplier?.name || '', name_ar: supplier?.name_ar || '',
    phone: supplier?.phone || '', email: supplier?.email || '',
    address: supplier?.address || '', notes: supplier?.notes || '',
    supplier_category_id: supplier?.supplier_category_id || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, branch_id: userBranchId, supplier_category_id: form.supplier_category_id || null };
      if (supplier) {
        await client.put(`/suppliers/${supplier.id}`, payload);
      } else {
        await client.post('/suppliers', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error?.[0]?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={supplier ? 'تعديل المورد' : 'إضافة مورد'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <Input label="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="الاسم بالعربي" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التصنيف</label>
            <Select value={form.supplier_category_id} onChange={(e) => setForm({ ...form, supplier_category_id: e.target.value })}>
              <option value="">— بدون تصنيف —</option>
              {(categories || []).map((c) => (<option key={c.id} value={c.id}>{c.name_ar || c.name}</option>))}
            </Select>
          </div>
        </div>
        <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} as="textarea" rows={2} />
        <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} as="textarea" rows={2} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{supplier ? 'حفظ التعديلات' : 'إضافة المورد'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
