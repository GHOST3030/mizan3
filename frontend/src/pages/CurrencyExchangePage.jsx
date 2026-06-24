import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';
import { Can } from '../components/Can';
import { PERMISSIONS } from '../utils/permissions';

export default function CurrencyExchangePage() {
  const [source, setSource] = useState('safe');
  const [sourceId, setSourceId] = useState('');
  const [fromCurrencyId, setFromCurrencyId] = useState('');
  const [toCurrencyId, setToCurrencyId] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [notes, setNotes] = useState('');
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const queryClient = useQueryClient();

  const { data: safes } = useQuery({
    queryKey: ['safe-boxes', branchId],
    queryFn: async () => { const res = await client.get(`/safe?branch_id=${branchId}`); return res.data; },
  });

  const { data: registers } = useQuery({
    queryKey: ['cash-registers', branchId],
    queryFn: async () => { const res = await client.get(`/finance/cash-registers?branch_id=${branchId}`); return res.data; },
  });

  const { data: currencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => { const res = await client.get('/currencies'); return res.data; },
  });

  const exchangeMutation = useMutation({
    mutationFn: (data) => client.post('/finance/currency-exchange', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['safe-boxes']);
      queryClient.invalidateQueries(['cash-registers']);
      setFromAmount('');
      setExchangeRate('');
      setNotes('');
    },
  });

  const sources = source === 'safe' ? safes : registers;
  const toAmount = fromAmount && exchangeRate ? Math.floor(parseInt(fromAmount) * parseInt(exchangeRate)) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceId || !fromCurrencyId || !toCurrencyId || !fromAmount || !exchangeRate) return;
    if (fromCurrencyId === toCurrencyId) { alert('يجب اختيار عملتين مختلفتين'); return; }

    exchangeMutation.mutate({
      branch_id: branchId,
      from_currency_id: fromCurrencyId,
      to_currency_id: toCurrencyId,
      from_amount: parseInt(fromAmount),
      exchange_rate: parseInt(exchangeRate),
      source,
      source_id: sourceId,
      notes: notes || undefined,
    });
  };

  const formatBal = (amount, currency) => {
    const sym = currency?.symbol || '';
    return `${amount} ${sym}`;
  };

  const fromCurrency = currencies?.find((c) => c.id === fromCurrencyId);
  const toCurrency = currencies?.find((c) => c.id === toCurrencyId);

  return (
    <div className="p-6 max-w-xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">تحويل العملات</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 space-y-4">
        <div className="flex gap-2">
          <Button type="button" variant={source === 'safe' ? 'primary' : 'secondary'} onClick={() => setSource('safe')} className="flex-1">🔒 خزنة</Button>
          <Button type="button" variant={source === 'cash_register' ? 'primary' : 'secondary'} onClick={() => setSource('cash_register')} className="flex-1">💰 صندوق</Button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المصدر</label>
          <select value={sourceId} onChange={(e) => {
            setSourceId(e.target.value);
            const s = sources?.find((x) => x.id === e.target.value);
            if (s) setFromCurrencyId(s.currency_id);
          }} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" required>
            <option value="">اختر {source === 'safe' ? 'الخزنة' : 'الصندوق'}</option>
            {sources?.filter((s) => s.is_active !== false).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar || s.name} — {formatBal(s.balance, s.currency)} — {s.currency?.code}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من عملة</label>
            <select value={fromCurrencyId} onChange={(e) => setFromCurrencyId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" required>
              <option value="">اختر</option>
              {currencies?.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى عملة</label>
            <select value={toCurrencyId} onChange={(e) => setToCurrencyId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" required>
              <option value="">اختر</option>
              {currencies?.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ (من)</label>
            <input type="number" value={fromAmount} min="1" onChange={(e) => setFromAmount(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" required placeholder="مثال: 10000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر الصرف</label>
            <input type="number" value={exchangeRate} min="1" onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" required placeholder="مثال: 150000" />
          </div>
        </div>

        {toAmount > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {fromAmount.toLocaleString()} {fromCurrency?.code || ''}
            </span>
            <span className="mx-2 text-blue-400 dark:text-blue-300">→</span>
            <span className="text-lg font-bold text-blue-800 dark:text-blue-300">
              {toAmount.toLocaleString()} {toCurrency?.code || ''}
            </span>
            <div className="text-xs text-blue-400 dark:text-blue-300 mt-1">سعر الصرف: 1 {fromCurrency?.code || ''} = {(parseInt(exchangeRate)).toFixed(2)} {toCurrency?.code || ''}</div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" placeholder="اختياري" />
        </div>

        <Can permission={PERMISSIONS.MANAGE_INVENTORY}>
          <Button type="submit" disabled={!sourceId || !fromCurrencyId || !toCurrencyId || !fromAmount || !exchangeRate || fromCurrencyId === toCurrencyId}
            loading={exchangeMutation.isPending} className="w-full">تأكيد تحويل العملة</Button>
        </Can>

        {exchangeMutation.isSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm text-center">
            ✅ تم تحويل {exchangeMutation.data?.data?.result?.from_amount?.toLocaleString()} {fromCurrency?.code} ← {exchangeMutation.data?.data?.result?.to_amount?.toLocaleString()} {toCurrency?.code}
          </div>
        )}
      </form>
    </div>
  );
}
