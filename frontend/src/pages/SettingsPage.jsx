import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { Button, Modal, Table } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function SettingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSetting, setEditSetting] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await client.get('/core/settings');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/core/settings/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['settings']),
  });

  const columns = [
    { key: 'key', label: 'المفتاح', render: (s) => <span className="font-medium text-gray-800 dark:text-gray-100 dir-ltr text-left block">{s.key}</span> },
    { key: 'value', label: 'القيمة', render: (s) => <span className="text-gray-600 dark:text-gray-400 max-w-xs truncate block">{s.value}</span> },
    { key: 'branch', label: 'الفرع', render: (s) => s.branch?.name_ar || 'عام' },
  ];

  const commonSettings = [
    { key: 'inventory.allow_negative_stock', value: 'block', label: 'البيع بدون مخزون', desc: 'block=منع, warn=تحذير, allow=السماح' },
  ];

  const addSetting = async (key, value) => {
    try {
      await client.post('/core/settings', { key, value });
      queryClient.invalidateQueries(['settings']);
    } catch { /* ignored */ }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الإعدادات</h1>
        <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}><Button onClick={() => { setEditSetting(null); setShowForm(true); }}>+ إضافة إعداد</Button></Can>
      </div>

      <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 mb-6">
          <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-3">إعدادات سريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commonSettings.map((s) => {
              const existing = settings?.find((st) => st.key === s.key && !st.branch_id);
              return (
                <div key={s.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.label}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{s.desc}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 dir-ltr">{existing?.value || 'block'}</span>
                    <Button size="sm" onClick={() => {
                      const val = prompt(`القيمة الحالية: ${existing?.value || 'block'}\n${s.desc}`, existing?.value || 'block');
                      if (val && ['block', 'warn', 'allow'].includes(val)) addSetting(s.key, val);
                      else if (val) alert('القيمة يجب أن تكون block أو warn أو allow');
                    }}>تغيير</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Can>

      <Table
        columns={columns}
        data={settings}
        isLoading={isLoading}
        emptyMessage="لا يوجد إعدادات"
        renderActions={(s) => (
          <Can permission={PERMISSIONS.MANAGE_PERMISSIONS}>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditSetting(s); setShowForm(true); }}>تعديل</Button>
              <Button variant="ghost" size="sm" className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => { if (confirm('حذف الإعداد؟')) deleteMutation.mutate(s.id); }}>حذف</Button>
            </div>
          </Can>
        )}
      />

      {showForm && (
        <SettingFormModal
          setting={editSetting}
          onClose={() => { setShowForm(false); setEditSetting(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['settings']); setShowForm(false); setEditSetting(null); }}
        />
      )}
    </div>
  );
}

function SettingFormModal({ setting, onClose, onSuccess }) {
  const [form, setForm] = useState({
    key: setting?.key || '',
    value: setting?.value || '',
    branch_id: setting?.branch_id || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ['branches-for-settings'],
    queryFn: async () => {
      const res = await client.get('/core/branches');
      return res.data;
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, branch_id: form.branch_id || null };
      if (setting) {
        await client.put(`/core/settings/${setting.id}`, payload);
      } else {
        await client.post('/core/settings', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={setting ? 'تعديل الإعداد' : 'إضافة إعداد'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المفتاح *</label>
          <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            placeholder="company_name" required dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القيمة *</label>
          <textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
          <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100">
            <option value="">— عام (جميع الفروع) —</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">
            {setting ? 'حفظ التعديلات' : 'إضافة الإعداد'}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}
