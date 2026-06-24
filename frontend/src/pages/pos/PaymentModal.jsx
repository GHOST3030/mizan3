import { useState, useMemo } from 'react';
import { Button, Modal } from '../../components/ui';

const METHODS = [
  { id: 'cash', label: 'نقداً', icon: '💵' },
  { id: 'card', label: 'بطاقة', icon: '💳' },
  { id: 'transfer', label: 'حوالة', icon: '🏦' },
  { id: 'credit', label: 'آجل', icon: '📋' },
];

export default function PaymentModal({ total, cart, customer, currencyId, onComplete, onClose }) {
  const [payments, setPayments] = useState([{ method: 'cash', amount: total }]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const remaining = useMemo(() => Math.max(0, total - totalPaid), [total, totalPaid]);
  const change = useMemo(() => Math.max(0, totalPaid - total), [totalPaid, total]);

  const updatePayment = (index, field, value) => {
    setPayments((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePayment = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const addPayment = () => {
    const currentTotal = payments.reduce((s, p) => s + p.amount, 0);
    const remainingAmount = Math.max(0, total - currentTotal);
    if (remainingAmount <= 0) return;
    setPayments((prev) => [...prev, { method: 'cash', amount: remainingAmount }]);
  };

  const quickAmounts = useMemo(() => {
    const amounts = [total];
    const rounded = Math.ceil(total / 1000) * 1000;
    if (rounded !== total) amounts.push(rounded);
    amounts.push(rounded + 1000);
    amounts.push(rounded + 2000);
    amounts.push(rounded + 5000);
    return amounts;
  }, [total]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validPayments = payments.filter((p) => p.amount > 0);
      const hasCredit = validPayments.some((p) => p.method === 'credit');
      if (hasCredit && !customer) {
        alert('⚠️ يجب اختيار عميل للدفع الآجل');
        setLoading(false);
        return;
      }
      const finalPayments = validPayments.map((p) => ({
        method: p.method,
        amount: p.amount,
        currency_id: currencyId,
        exchange_rate: 1,
      }));
      const scheduleData = remaining > 0 && customer ? { due_date: dueDate || null, notes: null } : null;
      await onComplete(finalPayments, scheduleData);
    } finally {
      setLoading(false);
    }
  };

  const hasValidPayments = payments.some((p) => p.amount > 0);
  const hasCreditLine = customer && payments.some((p) => p.method === 'credit');
  const canSubmit = (hasValidPayments || hasCreditLine) && (totalPaid >= total || customer);

  return (
    <Modal open title="إتمام الدفع" onClose={onClose} maxWidth="max-w-lg">
      <div className="p-5 space-y-4">
        {customer && (
          <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg flex items-center gap-2 dark:bg-blue-900/30 dark:text-blue-400">
            <span>👤</span>
            <span>العميل: {customer.name}</span>
            {(customer.balance || 0) > 0 && (
              <span className="mr-auto text-xs text-red-500 dark:text-red-400">رصيد: {(customer.balance || 0).toLocaleString()} ﷼</span>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center dark:from-gray-800 dark:to-gray-900">
          <div className="text-sm text-gray-500 mb-1 dark:text-gray-400">المبلغ المطلوب</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{total.toLocaleString()} ﷼</div>
          <div className="text-xs text-gray-400 mt-1 dark:text-gray-500">{cart.length} أصناف</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">طرق الدفع</label>
          {payments.map((payment, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 dark:bg-gray-800">
              <select value={payment.method} onChange={(e) => updatePayment(index, 'method', e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                ))}
              </select>
              <input type="number" value={payment.amount} min="0" max={total}
                onChange={(e) => updatePayment(index, 'amount', Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              {payments.length > 1 && (
                <Button variant="ghost-danger" size="sm" onClick={() => removePayment(index)} className="!w-6 !h-6 !p-0 !min-w-0">✕</Button>
              )}
            </div>
          ))}
          {totalPaid < total && (
            <Button variant="outline" onClick={addPayment} className="w-full !border-dashed !py-2">
              + إضافة طريقة دفع أخرى
            </Button>
          )}
        </div>

        {totalPaid > 0 && totalPaid < total && (
          <div className="flex justify-between text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 dark:bg-amber-900/20 dark:border-amber-800">
            <span className="text-amber-700 dark:text-amber-400">المتبقي</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{remaining.toLocaleString()} ﷼</span>
          </div>
        )}

        {totalPaid >= total && change > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex justify-between text-sm font-bold dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            <span>الباقي</span>
            <span>{change.toLocaleString()} ﷼</span>
          </div>
        )}

        {remaining > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
            <div className="text-sm text-center font-medium mb-2">
              المتبقي: {remaining.toLocaleString()} ﷼
              {customer ? ' (سيضاف لرصيد العميل)' : ' (يلزم اختيار عميل)'}
            </div>
            {customer && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">تاريخ الاستحقاق (اختياري)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100" />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-5 gap-1">
          {quickAmounts.map((amt, i) => (
            <Button key={i} variant="secondary" size="sm" onClick={() => {
              const lastIdx = payments.length - 1;
              updatePayment(lastIdx, 'amount', Math.min(amt, total));
            }}>
              {amt.toLocaleString()}
            </Button>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}
            className="flex-1 !py-3 !rounded-xl" loading={loading}>
            {remaining === 0
              ? `تأكيد الدفع (${totalPaid.toLocaleString()} ﷼)`
              : totalPaid === 0 && customer
                ? 'فاتورة آجلة'
                : `دفع ${totalPaid.toLocaleString()} ﷼ + باقي ${remaining.toLocaleString()} ﷼`}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1 !py-3 !rounded-xl">إلغاء</Button>
        </div>
      </div>
    </Modal>
  );
}