import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Button, Modal, Badge } from '../../components/ui';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

export default function CompaniesPage() {
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await client.get('/core/companies');
      return res.data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', selectedCompany],
    queryFn: async () => {
      const res = await client.get('/core/branches', { params: { company_id: selectedCompany } });
      return res.data;
    },
    enabled: !!selectedCompany,
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => client.delete(`/core/companies/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['companies']),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id) => client.delete(`/core/branches/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['branches']),
  });

  const isAdmin = user?.role === 'admin';
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الشركة والفروع</h1>
        {isAdmin && <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}><Button onClick={() => { setEditCompany(null); setShowCompanyForm(true); }}>+ إضافة شركة</Button></Can>}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="space-y-6">
          {companies?.map((c) => (
            <div key={c.id} className={`bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden ${selectedCompany === c.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">{c.name_ar || c.name}</h2>
                  {c.tax_number && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الرقم الضريبي: {c.tax_number}</p>}
                </div>
                <div className="flex gap-3 items-center">
                  <Button variant="ghost" size="sm"
                    onClick={() => { setSelectedCompany(selectedCompany === c.id ? null : c.id); }}>
                    {selectedCompany === c.id ? 'إخفاء الفروع' : 'عرض الفروع'}
                  </Button>
                  {isAdmin && (
                    <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}>
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setEditCompany(c); setShowCompanyForm(true); }}>تعديل</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => { if (confirm('حذف الشركة؟')) deleteCompanyMutation.mutate(c.id); }}>حذف</Button>
                      </>
                    </Can>
                  )}
                </div>
              </div>

              {selectedCompany === c.id && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">الفروع</h3>
                    {isAdmin && (
                      <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}><Button size="sm" onClick={() => { setSelectedCompany(c.id); setEditBranch(null); setShowBranchForm(true); }}>
                        + إضافة فرع
                      </Button></Can>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
                      <tr>
                        <th className="text-right px-4 py-3">الاسم (عربي)</th>
                        <th className="text-right px-4 py-3">الاسم (إنجليزي)</th>
                        <th className="text-right px-4 py-3">الهاتف</th>
                        <th className="text-right px-4 py-3">الحالة</th>
                        {canManage && <th className="text-right px-4 py-3">إجراءات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {branches?.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">لا يوجد فروع</td></tr>
                      ) : (
                        branches?.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{b.name_ar}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.name || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge color={b.is_active ? 'green' : 'red'}>{b.is_active ? 'نشط' : 'موقف'}</Badge>
                            </td>
                            {canManage && (
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  {isAdmin && (
                                    <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}>
                                      <>
                                        <Button variant="ghost" size="sm" onClick={() => { setEditBranch(b); setShowBranchForm(true); }}>تعديل</Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                                          onClick={() => { if (confirm('حذف الفرع؟')) deleteBranchMutation.mutate(b.id); }}>حذف</Button>
                                      </>
                                    </Can>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCompanyForm && (
        <CompanyFormModal
          company={editCompany}
          onClose={() => { setShowCompanyForm(false); setEditCompany(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['companies']); setShowCompanyForm(false); setEditCompany(null); }}
        />
      )}

      {showBranchForm && (
        <BranchFormModal
          branch={editBranch}
          companyId={selectedCompany}
          onClose={() => { setShowBranchForm(false); setEditBranch(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries(['branches']);
            queryClient.invalidateQueries(['companies']);
            setShowBranchForm(false);
            setEditBranch(null);
          }}
        />
      )}
    </div>
  );
}

function CompanyFormModal({ company, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: company?.name || '',
    name_ar: company?.name_ar || '',
    logo_url: company?.logo_url || '',
    tax_number: company?.tax_number || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (company) {
        await client.put(`/core/companies/${company.id}`, form);
      } else {
        await client.post('/core/companies', form);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={company ? 'تعديل الشركة' : 'إضافة شركة'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (عربي) *</label>
          <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (إنجليزي)</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم الضريبي</label>
          <input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط الشعار</label>
          <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{company ? 'حفظ التعديلات' : 'إضافة الشركة'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}

function BranchFormModal({ branch, companyId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: branch?.name || '',
    name_ar: branch?.name_ar || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    is_active: branch?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, company_id: companyId };
      if (branch) {
        await client.put(`/core/branches/${branch.id}`, payload);
      } else {
        await client.post('/core/branches', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={branch ? 'تعديل الفرع' : 'إضافة فرع'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (عربي) *</label>
          <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (إنجليزي)</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600" />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">الفرع نشط</label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">{branch ? 'حفظ التعديلات' : 'إضافة الفرع'}</Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}
