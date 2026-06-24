import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Button, PageHeader, Table, Input, Select, Alert,
  PageTransition, FormModal, SearchInput, ConfirmButton, toast, Breadcrumbs,
} from '../../components/ui';
import { Can } from '../../components/Can';
import { CanViewField } from '../../components/CanViewField';
import { PERMISSIONS } from '../../utils/permissions';
import OpeningBalanceModal from '../../components/OpeningBalanceModal';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [formCustomer, setFormCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [balanceCustomer, setBalanceCustomer] = useState(null);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await client.get('/customers', { params: { q: search, limit: 50 } });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/customers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['customers']); toast('تم حذف العميل', 'success'); },
    onError: (err) => toast(err.response?.data?.message || 'حدث خطأ', 'error'),
  });

  const openingBalanceMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/customers/${id}/opening-balance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setBalanceCustomer(null);
      toast('تم حفظ الرصيد الافتتاحي', 'success');
    },
    onError: (err) => setError(err.response?.data?.message || 'حدث خطأ'),
  });

  const columns = [
    {
      key: 'name', label: 'الاسم',
      render: (c) => (
        <button onClick={() => navigate(`/customers/statement?customer_id=${c.id}&customer_name=${encodeURIComponent(c.name)}`)}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400">{c.name}</button>
      ),
    },
    { key: 'phone', label: 'رقم الهاتف', render: (c) => c.phone || '—' },
    {
      key: 'balance', label: 'الرصيد',
      render: (c) => (
        <CanViewField fieldPermission="field:view_customer_balance">
          <span className={`font-medium ${(c.balance ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {(c.balance ?? 0).toLocaleString()} ﷼
          </span>
        </CanViewField>
      ),
    },
    { key: 'group', label: 'المجموعة', render: (c) => c.group?.name || '—' },
  ];

  return (
    <PageTransition>
      <Breadcrumbs items={[{ label: 'العملاء', to: '/customers' }, { label: 'جميع العملاء' }]} />
      <PageHeader
        title="العملاء"
        actions={
          <div className="flex gap-2">
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <Button variant="secondary" onClick={() => navigate('/customers/groups')}>المجموعات</Button>
            </Can>
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <Button onClick={() => { setFormCustomer(null); setShowForm(true); }}><Plus className="w-4 h-4" /> إضافة عميل</Button>
            </Can>
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
        emptyMessage="لا يوجد عملاء"
        emptyIcon="👤"
        renderActions={(c) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <Button variant="ghost" size="sm" onClick={() => setBalanceCustomer(c)}>الرصيد الافتتاحي</Button>
            </Can>
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <Button variant="ghost" size="sm" onClick={() => { setFormCustomer(c); setShowForm(true); }}>تعديل</Button>
            </Can>
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <ConfirmButton variant="ghost-danger" size="sm" onConfirm={() => deleteMutation.mutate(c.id)} message={`حذف العميل ${c.name}؟`}>حذف</ConfirmButton>
            </Can>
          </div>
        )}
      />

      {showForm && (
        <CustomerFormModal
          customer={formCustomer} userBranchId={user?.branch?.id}
          isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
          onClose={() => { setShowForm(false); setFormCustomer(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['customers']); setShowForm(false); setFormCustomer(null); toast(formCustomer ? 'تم تحديث العميل' : 'تم إضافة العميل', 'success'); }}
        />
      )}

      {balanceCustomer && (
        <OpeningBalanceModal
          entity={balanceCustomer} type="customer"
          loading={openingBalanceMutation.isPending}
          onSave={(data) => openingBalanceMutation.mutate({ id: balanceCustomer.id, data })}
          onClose={() => setBalanceCustomer(null)}
        />
      )}
    </PageTransition>
  );
}

function CustomerFormModal({ customer, userBranchId, isAdmin, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: customer?.name || '', phone: customer?.phone || '',
    email: customer?.email || '', address: customer?.address || '',
    notes: customer?.notes || '', credit_limit: customer?.credit_limit ?? '',
    customer_group_id: customer?.customer_group_id || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: groupsData } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: async () => { const res = await client.get('/customers/groups'); return res.data; },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form, branch_id: userBranchId,
        credit_limit: parseFloat(form.credit_limit) || 0,
        customer_group_id: form.customer_group_id || null,
      };
      if (customer) {
        await client.put(`/customers/${customer.id}`, payload);
      } else {
        await client.post('/customers', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error?.[0]?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal open onClose={onClose} title={customer ? 'تعديل العميل' : 'إضافة عميل'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        <Input label="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="الحد الائتماني (﷼)" type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المجموعة</label>
          <Select value={form.customer_group_id} onChange={(e) => setForm({ ...form, customer_group_id: e.target.value })}>
            <option value="">— بدون مجموعة —</option>
            {(groupsData || []).map((g) => (<option key={g.id} value={g.id}>{g.name_ar || g.name}</option>))}
          </Select>
        </div>
        <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} as="textarea" rows={2} />
        <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} as="textarea" rows={2} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{customer ? 'حفظ التعديلات' : 'إضافة العميل'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </FormModal>
  );
}
