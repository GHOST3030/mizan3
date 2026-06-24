import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, Modal, PageHeader } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function ShiftsPage() {
  const [showOpen, setShowOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['shifts', branchId],
    queryFn: async () => {
      const res = await client.get('/finance/shifts', { params: { branch_id: branchId, limit: 50 } });
      return res.data;
    },
  });

  const openMutation = useMutation({
    mutationFn: (payload) => client.post('/finance/shifts/open', payload),
    onSuccess: () => { queryClient.invalidateQueries(['shifts']); setShowOpen(false); },
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, closing_balance }) => client.put(`/finance/shifts/${id}/close`, { closing_balance }),
    onSuccess: () => queryClient.invalidateQueries(['shifts']),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => client.post(`/finance/shifts/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['shifts']),
  });

  const { data: openShift } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: async () => {
      const res = await client.get('/finance/shifts', { params: { user_id: user?.id, limit: 1 } });
      return res.data.data?.find((s) => !s.closed_at) || null;
    },
  });

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="المناوبات (الورديات)"
        actions={openShift ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg font-medium">
              🟢 وردية مفتوحة - رصيد الافتتاح: {openShift.opening_balance}
            </span>
            <Can permission={PERMISSIONS.SHIFT_CLOSE}>
              <Button variant="danger" onClick={() => {
                const cb = prompt('رصيد الإغلاق:', openShift.opening_balance);
                if (cb !== null) closeMutation.mutate({ id: openShift.id, closing_balance: parseInt(cb) });
              }}>إغلاق الوردية</Button>
            </Can>
          </div>
        ) : (
          <Can permission={PERMISSIONS.SHIFT_OPEN}><Button variant="success" onClick={() => setShowOpen(true)}>+ فتح وردية</Button></Can>
        )}
      />

      {showOpen && (
        <OpenShiftForm
          branchId={branchId}
          userId={user?.id}
          onSubmit={(payload) => openMutation.mutate(payload)}
          onCancel={() => setShowOpen(false)}
          loading={openMutation.isPending}
        />
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
              <tr>
                <th className="text-right px-4 py-3">المستخدم</th>
                <th className="text-right px-4 py-3">الافتتاح</th>
                <th className="text-right px-4 py-3">الإغلاق</th>
                <th className="text-right px-4 py-3">رصيد الافتتاح</th>
                <th className="text-right px-4 py-3">رصيد الإغلاق</th>
                <th className="text-right px-4 py-3">الفرق</th>
                <th className="text-right px-4 py-3">المبيعات</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data?.data?.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد ورديات</td></tr>
              ) : (
                data?.data?.map((s) => {
                  const diff = s.difference;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{s.user?.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(s.opened_at).toLocaleString('ar')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{s.closed_at ? new Date(s.closed_at).toLocaleString('ar') : '—'}</td>
                      <td className="px-4 py-3">{s.opening_balance}</td>
                      <td className="px-4 py-3">{s.closing_balance !== null ? s.closing_balance : '—'}</td>
                      <td className="px-4 py-3">
                        {diff !== null ? (
                          <span className={`font-medium text-xs ${diff === 0 ? 'text-green-600 dark:text-green-400' : diff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                            {diff !== 0 && <span className="mr-1">{diff > 0 ? 'زيادة' : 'عجز'}</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-center">{s._count?.sales || 0}</td>
                      <td className="px-4 py-3">
                        {s.status === 'approved' ? (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs">معتمدة</span>
                        ) : s.closed_at ? (
                          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-xs">مغلقة</span>
                        ) : (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs">مفتوحة</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {s.status === 'closed' && (
                          <Can permission={PERMISSIONS.SHIFT_APPROVE}>
                            <Button size="sm" onClick={() => { if (confirm(`اعتماد إغلاق الوردية ${s.user?.name}؟`)) approveMutation.mutate(s.id); }}
                              loading={approveMutation.isPending} disabled={approveMutation.isPending}>اعتماد</Button>
                          </Can>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedShift(selectedShift?.id === s.id ? null : s)}>{selectedShift?.id === s.id ? 'إخفاء' : 'تفاصيل'}</Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedShift && (
        <ShiftDetail shift={selectedShift} onClose={() => setSelectedShift(null)} />
      )}
    </div>
  );
}

function OpenShiftForm({ branchId, userId, onSubmit, onCancel, loading }) {
  const [balance, setBalance] = useState('0');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      branch_id: branchId,
      user_id: userId,
      opening_balance: parseInt(balance || '0'),
      notes: notes || null,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 mb-6 border border-green-200 dark:border-green-800">
      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رصيد الافتتاح</label>
          <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <Button type="submit" variant="success" loading={loading}>فتح وردية</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
      </form>
    </div>
  );
}

function ShortageSurplusPanel({ shift }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showResolve, setShowResolve] = useState(false);
  const [resolveForm, setResolveForm] = useState({ note: '', action: 'approve' });
  const hasDiff = shift.difference !== 0;
  const isSurplus = shift.difference > 0;

  const resolveMutation = useMutation({
    mutationFn: async ({ action, note }) => {
      await client.put(`/finance/shifts/${shift.id}/close`, {
        closing_balance: shift.closing_balance,
        difference_note: note,
        difference_status: action === 'approve' ? 'resolved' : 'written_off',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      setShowResolve(false);
    },
  });

  if (!hasDiff || shift.status === 'approved') return null;

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className={`mt-4 p-4 rounded-xl border ${isSurplus ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">
            {isSurplus ? '💰 زيادة في الصندوق' : '🔴 عجز في الصندوق'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            الفرق: <span className={`font-bold ${isSurplus ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {isSurplus ? '+' : ''}{shift.difference} ﷼
            </span>
            {' — '}المتوقع: {shift.closing_balance} ﷼
          </p>
        </div>
        {isManager && (
          <Button size="sm" onClick={() => setShowResolve(true)}>
            {isSurplus ? 'توثيق الزيادة' : 'معالجة العجز'}
          </Button>
        )}
      </div>

      {shift.difference_note && (
        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">ملاحظات:</span> {shift.difference_note}
        </div>
      )}

      {showResolve && (
        <Modal open title={isSurplus ? 'توثيق زيادة الصندوق' : 'معالجة العجز'} onClose={() => setShowResolve(false)}>
          <div className="p-5 space-y-4">
            <div className={`p-3 rounded-lg text-sm ${isSurplus ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
              {isSurplus
                ? `تم تسجيل زيادة بمبلغ ${shift.difference} ﷼ في صندوق الوردية`
                : `تم تسجيل عجز بمبلغ ${Math.abs(shift.difference)} ﷼ في صندوق الوردية`}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
              <textarea value={resolveForm.note} onChange={(e) => setResolveForm({ ...resolveForm, note: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                placeholder={isSurplus ? 'سبب الزيادة (إن وجد)' : 'سبب العجز'} />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => resolveMutation.mutate({ action: 'approve', note: resolveForm.note })}
                loading={resolveMutation.isPending} className="flex-1">
                {isSurplus ? 'اعتماد الزيادة' : 'اعتماد العجز'}
              </Button>
              {!isSurplus && (
                <Button variant="secondary" onClick={() => resolveMutation.mutate({ action: 'write_off', note: resolveForm.note })}
                  loading={resolveMutation.isPending} className="flex-1">
                  شطب العجز
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ShiftDetail({ shift, onClose }) {
  return (
    <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100">تفاصيل الوردية - {shift.user?.name}</h2>
        <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">✕</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div><span className="text-gray-500 dark:text-gray-400">الافتتاح:</span><div className="font-medium">{new Date(shift.opened_at).toLocaleString('ar')}</div></div>
        <div><span className="text-gray-500 dark:text-gray-400">الإغلاق:</span><div className="font-medium">{shift.closed_at ? new Date(shift.closed_at).toLocaleString('ar') : '—'}</div></div>
        <div><span className="text-gray-500 dark:text-gray-400">رصيد الافتتاح:</span><div className="font-medium">{shift.opening_balance}</div></div>
        <div><span className="text-gray-500 dark:text-gray-400">رصيد الإغلاق:</span><div className="font-medium">{shift.closing_balance !== null ? shift.closing_balance : '—'}</div></div>
      </div>

      {shift.closed_at && shift.difference !== null && shift.difference !== 0 && (
        <ShortageSurplusPanel shift={shift} />
      )}

      {shift.sales?.length > 0 && (
        <>
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">مبيعات الوردية ({shift.sales.length})</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
              <tr>
                <th className="text-right px-3 py-2">الفاتورة</th>
                <th className="text-right px-3 py-2">العميل</th>
                <th className="text-right px-3 py-2">الإجمالي</th>
                <th className="text-right px-3 py-2">المدفوع</th>
                <th className="text-right px-3 py-2">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {shift.sales.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium">{s.invoice_number}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{s.customer?.name || 'نقدي'}</td>
                  <td className="px-3 py-2 text-green-600 dark:text-green-400 font-medium">{s.total}</td>
                  <td className="px-3 py-2">{s.paid_amount}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{new Date(s.created_at).toLocaleString('ar')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
