import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, Modal, PageHeader } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function PrintTemplatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTpl, setEditTpl] = useState(null);
  const [previewTpl, setPreviewTpl] = useState(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['print-templates'],
    queryFn: async () => {
      const res = await client.get('/print-templates');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/print-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['print-templates']),
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="قوالب الطباعة"
        actions={canManage && <Can permission={PERMISSIONS.VIEW_REPORTS}><Button onClick={() => { setEditTpl(null); setShowForm(true); }}>+ إضافة قالب</Button></Can>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : templates?.length === 0 ? (
          <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
            لا توجد قوالب طباعة. أضف قالباً جديداً للبدء.
          </div>
        ) : (
          templates?.map((tpl) => (
            <div key={tpl.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">{tpl.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${tpl.type === 'thermal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                    {tpl.type === 'thermal' ? 'حرارية (80mm)' : 'A4'}
                  </span>
                  {tpl.is_default && <span className="mr-2 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">افتراضي</span>}
                </div>
                {canManage && (
                  <Can permission={PERMISSIONS.VIEW_REPORTS}>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditTpl(tpl); setShowForm(true); }}>تعديل</Button>
                      <Button variant="ghost-danger" size="sm"
                        onClick={() => { if (confirm('حذف القالب؟')) deleteMutation.mutate(tpl.id); }}>حذف</Button>
                    </div>
                  </Can>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {tpl.header && <div>رأس: {tpl.header.length} حرف</div>}
                {tpl.body && <div>المحتوى: {tpl.body.length} حرف</div>}
                {tpl.footer && <div>تذييل: {tpl.footer.length} حرف</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewTpl(previewTpl?.id === tpl.id ? null : tpl)} className="mt-3">
                {previewTpl?.id === tpl.id ? 'إخفاء المعاينة' : 'معاينة'}
              </Button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <TemplateFormModal
          template={editTpl}
          onClose={() => { setShowForm(false); setEditTpl(null); }}
          onSuccess={() => { queryClient.invalidateQueries(['print-templates']); setShowForm(false); setEditTpl(null); }}
        />
      )}
    </div>
  );
}

function TemplateFormModal({ template, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    type: template?.type || 'thermal',
    header: template?.header || '',
    body: template?.body || '',
    footer: template?.footer || '',
    css: template?.css || '',
    is_default: template?.is_default || false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (template) {
        await client.put(`/print-templates/${template.id}`, form);
      } else {
        await client.post('/print-templates', form);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={template ? 'تعديل قالب الطباعة' : 'إضافة قالب طباعة'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4" dir="rtl">
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100">
              <option value="thermal">حرارية (80mm)</option>
              <option value="a4">A4</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            رأس الصفحة (HTML)
            <span className="text-xs text-gray-400 mr-2">{'{company_name}, {invoice_number}, {date}'}</span>
          </label>
          <textarea value={form.header} onChange={(e) => setForm({ ...form, header: e.target.value })}
            rows={3} dir="ltr"
            className="w-full font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            المحتوى (HTML)
            <span className="text-xs text-gray-400 mr-2">{'{items_table}, {totals}'}</span>
          </label>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={6} dir="ltr"
            className="w-full font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            التذييل (HTML)
            <span className="text-xs text-gray-400 mr-2">{'{footer_text}'}</span>
          </label>
          <textarea value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })}
            rows={2} dir="ltr"
            className="w-full font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CSS</label>
          <textarea value={form.css} onChange={(e) => setForm({ ...form, css: e.target.value })}
            rows={4} dir="ltr"
            className="w-full font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600" />
          <span className="text-sm text-gray-700 dark:text-gray-300">تعيين كقالب افتراضي</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">
            {template ? 'حفظ التعديلات' : 'إضافة القالب'}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}
