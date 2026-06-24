import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import { Button, Modal, Pagination, Card, Badge, Input, EmptyState, toast } from '../../components/ui';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';
import { printStatement } from '../../utils/print';

const methodLabels = { cash: 'نقداً', card: 'بطاقة', transfer: 'حوالة', credit: 'آجل' };
const scheduleStatusColor = { pending: 'amber', partial: 'blue', paid: 'green' };
const scheduleStatusLabel = { pending: 'قيد الانتظار', partial: 'مسدد جزئياً', paid: 'مسدد' };

export default function CustomerStatementPage() {
  const [searchParams] = useSearchParams();
  const [customerSearch, setCustomerSearch] = useState(searchParams.get('customer_name') || '');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showList, setShowList] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [showAllTx, setShowAllTx] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const queryClient = useQueryClient();

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    const id = searchParams.get('customer_id');
    const name = searchParams.get('customer_name');
    if (id) {
      setSelectedCustomer({ id, name: name || '' });
      setCustomerSearch(name || '');
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const { data: defaultCurrency } = useQuery({
    queryKey: ['default-currency'],
    queryFn: async () => {
      const res = await client.get('/currencies', { params: { is_default: true } });
      const currencies = res.data;
      return currencies?.find((c) => c.is_default) || currencies?.[0] || null;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customer-statement-search', customerSearch],
    queryFn: async () => {
      const res = await client.get('/customers', { params: { q: customerSearch || undefined, limit: 10 } });
      return res.data;
    },
  });

  const { data: statementData, isLoading } = useQuery({
    queryKey: ['customer-statement', selectedCustomer?.id, page, dateFrom, dateTo],
    queryFn: async () => {
      const params = { page, limit: '100' };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const res = await client.get(`/customers/${selectedCustomer.id}/statement`, { params });
      return res.data;
    },
    enabled: !!selectedCustomer,
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => client.post(`/sales/payment-schedules/${id}/pay`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-statement']);
      setPayTarget(null);
      setPayAmount('');
      toast('تم تسجيل الدفعة بنجاح');
    },
  });

  const summary = statementData?.summary;
  const transactions = statementData?.transactions || [];
  const creditPurchases = transactions.filter((t) => t.type === 'sale' && t.remaining > 0);
  const paymentEntries = transactions.filter((t) => t.type === 'payment');

  const handlePay = () => {
    if (!payTarget || !payAmount) return;
    const amount = parseInt(payAmount);
    if (!amount || amount <= 0 || amount > payTarget.remaining) return;
    payMutation.mutate({
      id: payTarget.schedule_id,
      data: {
        amount,
        method: payMethod,
        currency_id: defaultCurrency?.id,
        exchange_rate: 1,
      },
    });
  };

  const payAmountNum = parseInt(payAmount);
  const isPayValid = payAmountNum > 0 && payAmountNum <= (payTarget?.remaining || 0);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">كشف حساب العميل</h1>

      {!selectedCustomer ? (
        <div className="relative max-w-md">
          <Input value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)}
            placeholder="🔍 بحث باسم العميل..." />
          {showList && customersData?.data?.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
              {customersData.data.map((c) => (
                <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowList(false); setPage(1); }}
                  className="block w-full text-right px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/40">{c.name}</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedCustomer.name}</h2>
              {statementData?.customer?.phone && (
                <p className="text-sm text-gray-500 dark:text-gray-400">📞 {statementData.customer.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
                <Button variant="outline" size="sm" onClick={() => printStatement(statementData)}>
                  🖨️ طباعة
                </Button>
              </Can>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>تغيير العميل</Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">من تاريخ</label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-40" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">إلى تاريخ</label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-40" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="mt-5">إزالة الفلتر</Button>
            )}
          </div>

          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">إجمالي المشتريات</div>
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{summary.total_sales?.toLocaleString()} ﷼</div>
              </Card>
              <Card>
                <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">إجمالي المدفوع</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{summary.total_paid?.toLocaleString()} ﷼</div>
              </Card>
              <Card>
                <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">المديونية المتبقية</div>
                <div className={`text-lg font-bold ${(summary.credit_remaining || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                  {(summary.credit_remaining || 0).toLocaleString()} ﷼
                </div>
              </Card>
              <Card>
                <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">الرصيد الحالي</div>
                <div className={`text-lg font-bold ${(summary.balance || 0) > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {(summary.balance || 0).toLocaleString()} ﷼
                </div>
              </Card>
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">جاري التحميل...</div>
          ) : transactions.length === 0 ? (
            <EmptyState icon="📊" title="لا توجد معاملات" message="لا توجد معاملات لهذا العميل في النطاق المحدد" />
          ) : (
            <div className="space-y-8">
              {creditPurchases.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-amber-500 rounded-full inline-block"></span>
                    المشتريات الآجلة
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({creditPurchases.length})</span>
                  </h3>
                  <Card padding={false}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-800">
                          <tr>
                            <th className="text-right px-4 py-3">#</th>
                            <th className="text-right px-4 py-3">الفاتورة</th>
                            <th className="text-right px-4 py-3">التاريخ</th>
                            <th className="text-right px-4 py-3">المبلغ</th>
                            <th className="text-right px-4 py-3">المدفوع</th>
                            <th className="text-right px-4 py-3">المتبقي</th>
                            <th className="text-right px-4 py-3">تاريخ الاستحقاق</th>
                            <th className="text-right px-4 py-3">الحالة</th>
                            <th className="text-right px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {creditPurchases.map((t, i) => {
                            const isOverdue = t.schedule_due_date && new Date(t.schedule_due_date) < new Date();
                            const isExpanded = expandedInvoice === t.sale_id;
                            return (
                              <tr key={`credit-${t.sale_id}`}
                                className="hover:bg-gray-50 transition dark:hover:bg-gray-800/50 cursor-pointer"
                                onClick={() => setExpandedInvoice(isExpanded ? null : t.sale_id)}>
                                <td className="px-4 py-3">
                                  <span className={`inline-block transition ${isExpanded ? 'rotate-90' : ''} text-gray-400`}>▶</span>
                                  <span className="mr-1 text-gray-400 dark:text-gray-500">{i + 1}</span>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{t.invoice_number}</td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                  {new Date(t.date).toLocaleDateString('ar')}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{t.debit.toLocaleString()} ﷼</td>
                                <td className="px-4 py-3 text-green-600 dark:text-green-400">{t.paid_amount.toLocaleString()} ﷼</td>
                                <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">{t.remaining.toLocaleString()} ﷼</td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                  {t.schedule_due_date ? (
                                    <span className={isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                                      {new Date(t.schedule_due_date).toLocaleDateString('ar')}
                                      {isOverdue && <span className="mr-1">🚩</span>}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  {t.schedule_status && (
                                    <Badge color={scheduleStatusColor[t.schedule_status] || 'gray'}>
                                      {scheduleStatusLabel[t.schedule_status] || t.schedule_status}
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
                                    {t.schedule_id && (
                                      <Button size="sm" variant="primary"
                                        onClick={() => { setPayTarget(t); setPayAmount(String(t.remaining)); }}>
                                        دفع
                                      </Button>
                                    )}
                                  </Can>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </section>
              )}

              {paymentEntries.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-green-500 rounded-full inline-block"></span>
                    سجل المدفوعات
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({paymentEntries.length})</span>
                  </h3>
                  <Card padding={false}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-800">
                          <tr>
                            <th className="text-right px-4 py-3">التاريخ</th>
                            <th className="text-right px-4 py-3">البيان</th>
                            <th className="text-right px-4 py-3">المبلغ</th>
                            <th className="text-right px-4 py-3">طريقة الدفع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {paymentEntries.map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition dark:hover:bg-gray-800/50">
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                {new Date(t.date).toLocaleDateString('ar')}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{t.description}</td>
                              <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">{t.credit.toLocaleString()} ﷼</td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{methodLabels[t.payment_method] || t.payment_method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </section>
              )}

              <section>
                <Button variant="ghost" onClick={() => setShowAllTx(!showAllTx)} className="mb-4">
                  <span className={`transform transition ${showAllTx ? 'rotate-90' : ''}`}>▶</span>
                  جميع المعاملات ({transactions.length})
                </Button>
                {showAllTx && (
                  <Card padding={false}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-800">
                          <tr>
                            <th className="text-right px-4 py-3">التاريخ</th>
                            <th className="text-right px-4 py-3">البيان</th>
                            <th className="text-right px-4 py-3">مدين</th>
                            <th className="text-right px-4 py-3">دائن</th>
                            <th className="text-right px-4 py-3">الرصيد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {transactions.map((t, i) => {
                            const isExpanded = expandedInvoice === `tx-${i}`;
                            const isSale = t.type === 'sale' || t.type === 'return';
                            return (
                              <tr key={`tx-${i}`}
                                className={`hover:bg-gray-50 transition dark:hover:bg-gray-800/50 ${t.type === 'return' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} ${t.type === 'payment' ? 'bg-green-50/30 dark:bg-green-900/5' : ''} ${isSale && t.items?.length ? 'cursor-pointer' : ''}`}
                                onClick={() => isSale && t.items?.length && setExpandedInvoice(isExpanded ? null : `tx-${i}`)}>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                  {new Date(t.date).toLocaleDateString('ar')}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800 dark:text-gray-100 text-xs">
                                    {isSale && t.items?.length > 0 && <span className={`inline-block transition ml-1 ${isExpanded ? 'rotate-90' : ''} text-gray-400`}>▶</span>}
                                    {t.description}
                                  </div>
                                  {t.payment_method && (
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500">({methodLabels[t.payment_method] || t.payment_method})</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-medium">
                                  {t.debit > 0 ? `${t.debit.toLocaleString()} ﷼` : '—'}
                                </td>
                                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                                  {t.credit > 0 ? `${t.credit.toLocaleString()} ﷼` : '—'}
                                </td>
                                <td className={`px-4 py-3 font-bold ${t.running_balance > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {t.running_balance?.toLocaleString()} ﷼
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Pagination meta={statementData?.meta} onPageChange={setPage} />
                  </Card>
                )}
              </section>
            </div>
          )}

          {!isLoading && transactions.length > 0 && (() => {
            const totalDebt = summary?.total_sales || 0;
            const totalPaid = summary?.total_paid || 0;
            const remaining = totalDebt - totalPaid;
            return (
              <div className="bg-gradient-to-l from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-t-2 border-gray-800 dark:border-gray-200 rounded-2xl p-5 mt-8">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">إجمالي الدين</div>
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalDebt.toLocaleString()} ﷼</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">المبلغ المدفوع</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{totalPaid.toLocaleString()} ﷼</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 dark:text-gray-500">المتبقي</div>
                    <div className={`text-lg font-bold ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                      {remaining.toLocaleString()} ﷼
                      {remaining === 0 && <span className="mr-2 text-sm">✅</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {payTarget && (
        <Modal open title="تسديد دفعة" onClose={() => setPayTarget(null)} maxWidth="max-w-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            الفاتورة: <span className="font-medium text-gray-800 dark:text-gray-100">{payTarget.invoice_number}</span>
            <br />
            المتبقي: <span className="font-bold text-amber-600 dark:text-amber-400">{payTarget.remaining.toLocaleString()} ﷼</span>
          </p>
          <div className="mb-4">
            <Input label="المبلغ" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              max={payTarget.remaining} />
            <div className="flex gap-1 mt-1">
              {[payTarget.remaining, Math.round(payTarget.remaining / 2), Math.round(payTarget.remaining / 4)].map((amt, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => setPayAmount(String(amt))}>
                  {amt.toLocaleString()} ﷼
                </Button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'نقداً' },
                { id: 'card', label: 'بطاقة' },
                { id: 'transfer', label: 'حوالة' },
              ].map((m) => (
                <Button key={m.id} type="button" variant={payMethod === m.id ? 'primary' : 'outline'} size="sm"
                  onClick={() => setPayMethod(m.id)}>{m.label}</Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPayTarget(null)}>إلغاء</Button>
            <Can permission={PERMISSIONS.MANAGE_CUSTOMERS}>
              <Button onClick={handlePay} loading={payMutation.isPending}
                disabled={payMutation.isPending || !isPayValid}>
                تأكيد الدفع
              </Button>
            </Can>
          </div>
        </Modal>
      )}
    </div>
  );
}
