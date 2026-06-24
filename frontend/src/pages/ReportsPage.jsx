import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Button, PageHeader, Pagination } from '../components/ui';
import { Can } from '../components/Can';
import { CanViewField } from '../components/CanViewField';
import { PERMISSIONS } from '../utils/permissions';
import { formatCurrency } from '../utils/currency';

const tabs = [
  { key: 'overview', label: '📊 لوحة التحكم' },
  { key: 'sales', label: '📈 المبيعات' },
  { key: 'purchases', label: '📦 المشتريات' },
  { key: 'profit', label: '💰 الأرباح' },
  { key: 'inventory', label: '🏭 المخزون' },
  { key: 'customers', label: '👥 العملاء' },
  { key: 'suppliers', label: '🚚 الموردين' },
  { key: 'slow', label: '🐌 منتجات راكدة' },
  { key: 'safe', label: '🔒 الخزنة' },
  { key: 'expenses', label: '💸 المصروفات' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('overview');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = { ...(from && { from }), ...(to && { to }) };

  return (
    <div className="p-6" dir="rtl">
      <PageHeader title="التقارير" />
        <div className="flex gap-2 items-center">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm" />
          <span className="text-gray-400 dark:text-gray-500">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm" />
        </div>

      <Can permission={PERMISSIONS.VIEW_REPORTS}>
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </Can>

      {tab === 'overview' && <DashboardView params={params} from={from} to={to} />}
      {tab === 'sales' && <SalesView params={params} />}
      {tab === 'purchases' && <PurchasesView params={params} />}
      {tab === 'profit' && <ProfitView params={params} />}
      {tab === 'inventory' && <InventoryView />}
      {tab === 'customers' && <CustomersView params={params} />}
      {tab === 'suppliers' && <SuppliersView params={params} />}
      {tab === 'slow' && <SlowMovingView params={params} />}
      {tab === 'safe' && <SafeView params={params} />}
      {tab === 'expenses' && <ExpenseReportView params={params} />}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────

function DashboardView({ params }) {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const res = await client.get('/reports/dashboard'); return res.data; },
  });

  const { data: financeSummary } = useQuery({
    queryKey: ['finance-summary', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/finance/summary', { params }); return res.data; },
  });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard title="مبيعات اليوم" value={dashboard?.today?.sales_count || 0}
          sub={`${dashboard?.today?.total || 0} ﷼`} color="text-blue-600" />
        <KpiCard title="إجمالي المصروفات" value={`${financeSummary?.total_expenses || 0} ﷼`}
          sub="للفترة المحددة" color="text-red-500" />
        <CanViewField fieldPermission="field:view_monthly_profit">
          <KpiCard title="صافي الربح" value={`${financeSummary?.net_profit || 0} ﷼`}
            sub={(financeSummary?.net_profit || 0) >= 0 ? 'إيجابي' : 'سلبي'}
            color={(financeSummary?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'} />
        </CanViewField>
        <KpiCard title="منتجات منخفضة" value={dashboard?.low_stock_products?.length || 0}
          sub="تحتاج إعادة طلب"
          color={(dashboard?.low_stock_products?.length || 0) > 0 ? 'text-red-500' : 'text-green-600'} />
      </div>

      {dashboard?.today?.top_products?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">🏆 أفضل المنتجات مبيعاً اليوم</h2>
          <div className="space-y-2">
            {dashboard.today.top_products.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 dark:text-gray-500 text-xs w-5">{idx + 1}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{item.product?.name_ar || item.product?.name}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{item.quantity} وحدة</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sales Tab ─────────────────────────────────────────

function SalesView({ params }) {
  const [salesTab, setSalesTab] = useState('summary');
  const [productPage, setProductPage] = useState(1);

  const { data: summary } = useQuery({
    queryKey: ['sales-summary', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/sales/summary', { params }); return res.data; },
  });

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/sales/daily', { params }); return res.data; },
  });

  const { data: byProduct } = useQuery({
    queryKey: ['sales-by-product', params.from, params.to, productPage],
    queryFn: async () => { const res = await client.get('/reports/sales/by-product', { params: { ...params, page: productPage } }); return res.data; },
  });

  const { data: byCashier } = useQuery({
    queryKey: ['sales-by-cashier', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/sales/by-cashier', { params }); return res.data; },
  });

  const maxDaily = Math.max(...(dailySales?.map((d) => d.total) || [0]), 1);

  const subTabs = [
    { key: 'summary', label: 'ملخص' },
    { key: 'daily', label: 'يومي' },
    { key: 'products', label: 'حسب المنتج' },
    { key: 'cashiers', label: 'حسب الكاشير' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {subTabs.map((t) => (
            <button key={t.key} onClick={() => setSalesTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${salesTab === t.key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t.label}</button>
          ))}
        </div>
        <ExportButton type="sales_by_product" params={params} label="تصدير Excel" />
      </div>

      {salesTab === 'summary' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <KpiCard title="إجمالي المبيعات" value={`${formatCurrency(summary?.total_revenue)} ﷼`}
            sub={`${summary?.total_sales || 0} فاتورة`} color="text-green-600" />
          <KpiCard title="الخصم" value={`${formatCurrency(summary?.total_discount)} ﷼`}
            sub={`${summary?.total_returned || 0} مرتجع`} color="text-amber-600" />
          <KpiCard title="الضريبة" value={`${formatCurrency(summary?.total_tax)} ﷼`}
            sub="" color="text-purple-600" />
          <KpiCard title="متوسط الفاتورة" value={`${(summary?.total_sales && summary?.total_revenue ? formatCurrency(summary.total_revenue / summary.total_sales) : '0')} ﷼`}
            sub="لكل فاتورة" color="text-blue-600" />
        </div>
      )}

      {salesTab === 'daily' && dailySales?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
          <div className="space-y-1">
            {dailySales.slice(-30).map((d) => (
              <div key={d.date} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-gray-500 dark:text-gray-400 text-xs">{new Date(d.date).toLocaleDateString('ar', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                  <div className="bg-gradient-to-l from-blue-500 to-blue-400 h-full rounded-full flex items-center justify-end px-2"
                    style={{ width: `${Math.max(2, (d.total / maxDaily) * 100)}%` }}>
                    <span className="text-white text-xs font-medium">{(d.total).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {salesTab === 'products' && (
        <>
          <DataTable
            headers={['المنتج', 'الباركود', 'الكمية', 'الإجمالي', 'عدد الفواتير']}
            rows={byProduct?.data?.map((r) => [
              r.product?.name_ar || r.product?.name,
              r.product?.barcode || '—',
              r.quantity,
              r.total,
              r.invoices,
            ])}
          />
          <Pagination meta={byProduct?.meta} onPageChange={setProductPage} />
        </>
      )}

      {salesTab === 'cashiers' && (
        <DataTable
          headers={['الكاشير', 'عدد الفواتير', 'الإجمالي', 'الخصم', 'المدفوع']}
          rows={byCashier?.map((r) => [
            r.user?.name,
            r.invoices,
            r.total,
            r.discount,
            r.paid,
          ])}
        />
      )}
    </div>
  );
}

// ─── Purchases Tab ─────────────────────────────────────

function PurchasesView({ params }) {
  const { data } = useQuery({
    queryKey: ['purchases-summary', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/purchases/summary', { params }); return res.data; },
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton type="purchases" params={params} label="تصدير Excel" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard title="إجمالي المشتريات" value={`${formatCurrency(data?.total_amount)} ﷼`}
          sub={`${data?.total_purchases || 0} فاتورة`} color="text-blue-600" />
        <KpiCard title="عدد الموردين" value={data?.by_supplier?.length || 0}
          sub="مورد نشط" color="text-green-600" />
      </div>

      <DataTable
        headers={['المورد', 'عدد الفواتير', 'الإجمالي']}
        rows={data?.by_supplier?.map((r) => [
          r.supplier?.name || 'نقدي',
          r.count,
          r.total,
        ])}
      />
    </div>
  );
}

// ─── Profit Tab ────────────────────────────────────────

function ProfitView({ params }) {
  const { data } = useQuery({
    queryKey: ['profit-loss', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/profit-loss', { params }); return res.data; },
  });

  const items = data ? [
    { label: 'إجمالي المبيعات', value: data.total_revenue, color: 'text-blue-600', perm: null },
    { label: 'الخصومات', value: -data.total_discount, color: 'text-red-500', perm: null },
    { label: 'صافي المبيعات', value: data.net_revenue, color: 'text-blue-700', perm: null },
    { label: 'تكلفة البضاعة المباعة', value: -data.cost_of_goods_sold, color: 'text-amber-600', perm: 'field:view_purchase_costs' },
    { label: 'إجمالي الربح', value: data.gross_profit, color: 'text-green-600', perm: 'field:view_monthly_profit' },
    { label: 'المصروفات', value: -data.total_expenses, color: 'text-red-500', perm: null },
  ] : [];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton type="profit_loss" params={params} label="تصدير Excel" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="صافي المبيعات" value={`${formatCurrency(data?.net_revenue)} ﷼`}
            sub="بعد الخصم" color="text-blue-600" />
          <CanViewField fieldPermission="field:view_purchase_costs">
            <KpiCard title="تكلفة البضاعة" value={`${formatCurrency(data?.cost_of_goods_sold)} ﷼`}
              sub="COGS" color="text-amber-600" />
          </CanViewField>
          <CanViewField fieldPermission="field:view_monthly_profit">
            <KpiCard title="إجمالي الربح" value={`${formatCurrency(data?.gross_profit)} ﷼`}
              sub={`${data?.net_revenue > 0 ? ((data.gross_profit / data.net_revenue) * 100).toFixed(1) : 0}%`} color="text-green-600" />
          </CanViewField>
          <CanViewField fieldPermission="field:view_monthly_profit">
            <KpiCard title="صافي الربح" value={`${formatCurrency(data?.net_profit)} ﷼`}
              sub={`${data?.profit_margin_pct || 0}%`} color={data?.net_profit >= 0 ? 'text-green-700' : 'text-red-600'} />
          </CanViewField>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const row = (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className={`font-medium ${item.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {item.value >= 0 ? '+' : ''}{item.value} ﷼
                </span>
              </div>
            );
            return item.perm ? <CanViewField key={idx} fieldPermission={item.perm}>{row}</CanViewField> : row;
          })}
          <CanViewField fieldPermission="field:view_monthly_profit">
            <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200 dark:border-gray-700">
              <span className="font-bold text-gray-800 dark:text-gray-100">صافي الربح</span>
              <span className={`font-bold text-lg ${(data?.net_profit || 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(data?.net_profit)} ﷼
              </span>
            </div>
          </CanViewField>
        </div>
      </div>
    </div>
  );
}

// ─── Customers Tab ─────────────────────────────────────

function CustomersView({ params }) {
  const { data } = useQuery({
    queryKey: ['top-customers', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/customers/top', { params }); return res.data; },
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton type="top_customers" params={params} label="تصدير Excel" />
      </div>

      <DataTable
        headers={['العميل', 'الهاتف', 'عدد الفواتير', 'الإجمالي', 'المدفوع', 'الرصيد']}
        rows={data?.map((r) => [
          r.customer?.name,
          r.customer?.phone || '—',
          r.invoices,
          r.total,
          r.paid,
          r.balance,
        ])}
      />
    </div>
  );
}

// ─── Inventory Tab ─────────────────────────────────────

function InventoryView() {
  const [invTab, setInvTab] = useState('valuation');
  const [movementProduct, setMovementProduct] = useState('');

  const { data: valuation } = useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: async () => { const res = await client.get('/reports/inventory/valuation'); return res.data; },
  });

  const { data: products } = useQuery({
    queryKey: ['products-simple'],
    queryFn: async () => { const res = await client.get('/products', { params: { limit: 500 } }); return res.data; },
  });

  const { data: movement } = useQuery({
    queryKey: ['product-movement', movementProduct],
    queryFn: async () => { const res = await client.get('/reports/inventory/movement', { params: { product_id: movementProduct } }); return res.data; },
    enabled: !!movementProduct,
  });

  const subTabs = [
    { key: 'valuation', label: 'تقييم المخزون' },
    { key: 'movement', label: 'حركة منتج' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {subTabs.map((t) => (
          <button key={t.key} onClick={() => setInvTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${invTab === t.key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t.label}</button>
        ))}
      </div>

      {invTab === 'valuation' && (
        <div>
          <div className="flex justify-end mb-4">
            <ExportButton type="inventory_valuation" params={{}} label="تصدير Excel" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard title="إجمالي المنتجات" value={valuation?.total_products || 0}
              sub="برصيد أكبر من صفر" color="text-blue-600" />
            <KpiCard title="إجمالي الكمية" value={valuation?.total_quantity?.toLocaleString() || 0}
              sub="وحدة" color="text-green-600" />
            <CanViewField fieldPermission="field:view_inventory_value">
              <KpiCard title="قيمة التكلفة" value={`${formatCurrency(valuation?.total_cost_value)} ﷼`}
                sub="بسعر التكلفة" color="text-amber-600" />
            </CanViewField>
            <CanViewField fieldPermission="field:view_profit_margin">
              <KpiCard title="قيمة البيع" value={`${formatCurrency(valuation?.total_selling_value)} ﷼`}
                sub={`الربح المحتمل: ${formatCurrency(valuation?.potential_profit)}`} color="text-green-700" />
            </CanViewField>
          </div>

          {valuation?.by_warehouse && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.values(valuation.by_warehouse).map((wh) => (
                <div key={wh.warehouse?.id || 'none'} className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">{wh.warehouse?.name_ar || 'عام'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">الكمية: {wh.count}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">التكلفة: {wh.cost}</div>
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">البيع: {wh.selling}</div>
                </div>
              ))}
            </div>
          )}

          <DataTable
            headers={['المنتج', 'المخزن', 'الكمية', 'التكلفة', 'البيع', 'إجمالي التكلفة', 'إجمالي البيع']}
            rows={valuation?.items?.map((r) => [
              r.product?.name_ar || r.product?.name,
              r.warehouse?.name_ar || 'عام',
              r.quantity,
              r.cost_price,
              r.selling_price,
              r.total_cost,
              r.total_selling,
            ])}
          />
        </div>
      )}

      {invTab === 'movement' && (
        <div>
          <div className="mb-4 flex gap-2">
            <select value={movementProduct} onChange={(e) => setMovementProduct(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm flex-1">
              <option value="">اختر منتج</option>
              {products?.data?.map((p) => (
                <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>
              ))}
            </select>
          </div>

          {movement && (
            <div>
              <div className="flex justify-end mb-4">
                <ExportButton type="product_movement" params={{ product_id: movementProduct }} label="تصدير Excel" />
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <KpiCard title="رصيد افتتاحي" value={movement.opening_quantity} sub="" color="text-gray-600 dark:text-gray-400" />
                <KpiCard title="وارد" value={movement.in_quantity} sub="" color="text-green-600" />
                <KpiCard title="صادر" value={movement.out_quantity} sub="" color="text-red-500" />
                <KpiCard title="رصيد ختامي" value={movement.closing_quantity} sub="" color="text-blue-600" />
              </div>
              <DataTable
                headers={['التاريخ', 'النوع', 'المخزن', 'الكمية', 'الرصيد']}
                rows={movement.movements?.map((m) => [
                  new Date(m.date).toLocaleString('ar'),
                  m.type,
                  m.warehouse,
                  m.quantity,
                  m.running_balance,
                ])}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Suppliers Tab ─────────────────────────────────────

function SuppliersView({ params }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['supplier-report', params.from, params.to, page],
    queryFn: async () => { const res = await client.get('/reports/suppliers/detailed', { params: { ...params, page } }); return res.data; },
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton type="supplier_report" params={params} label="تصدير Excel" />
      </div>
      <DataTable
        headers={['المورد', 'الهاتف', 'الرصيد', 'عدد الفواتير', 'إجمالي المشتريات', 'إجمالي المدفوع']}
        rows={data?.data?.map((r) => [
          r.name,
          r.phone || '—',
          r.balance,
          r.invoice_count,
          r.total_purchases,
          r.total_paid,
        ])}
      />
      <Pagination meta={data?.meta} onPageChange={setPage} />
    </div>
  );
}

// ─── Slow-Moving Products Tab ──────────────────────────

function SlowMovingView() {
  const [months, setMonths] = useState(3);
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['slow-moving', months, page],
    queryFn: async () => { const res = await client.get('/reports/products/slow-moving', { params: { months, page } }); return res.data; },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600 dark:text-gray-400">آخر</label>
        <select value={months} onChange={(e) => { setMonths(parseInt(e.target.value)); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm">
          <option value={1}>شهر</option>
          <option value={3}>3 أشهر</option>
          <option value={6}>6 أشهر</option>
          <option value={12}>سنة</option>
        </select>
        <ExportButton type="slow_moving" params={{ months }} label="تصدير Excel" />
      </div>
      <DataTable
        headers={['المنتج', 'الباركود', 'المخزون', 'الكمية المباعة', 'قيمة المبيعات', 'معدل الدوران']}
        rows={data?.data?.map((r) => [
          r.name_ar || r.name,
          r.barcode || '—',
          r.current_stock,
          r.sold_quantity,
          r.sold_value,
          r.turnover_rate,
        ])}
      />
      <Pagination meta={data?.meta} onPageChange={setPage} />
    </div>
  );
}

// ─── Safe Box Tab ──────────────────────────────────────

function SafeView({ params }) {
  const { data } = useQuery({
    queryKey: ['safe-report', params.from, params.to],
    queryFn: async () => { const res = await client.get('/reports/safe/detailed', { params }); return res.data; },
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton type="safe_report" params={params} label="تصدير Excel" />
      </div>
      <DataTable
        headers={['الخزنة', 'الرصيد', 'العملة', 'إجمالي الإيداع', 'إجمالي السحب', 'عدد الحركات']}
        rows={data?.map((r) => [
          r.name_ar || r.name,
          r.balance,
          r.currency?.code || '',
          r.total_cash_in,
          r.total_cash_out,
          r.movement_count,
        ])}
      />
    </div>
  );
}

// ─── Expense Report Tab ────────────────────────────────

function ExpenseReportView({ params }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['expense-report', params.from, params.to, page],
    queryFn: async () => { const res = await client.get('/reports/expenses/detailed', { params: { ...params, page } }); return res.data; },
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton type="expense_report" params={params} label="تصدير Excel" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="إجمالي المصروفات" value={data?.total_expenses || 0} sub="معتمدة فقط" color="text-red-600" />
        <KpiCard title="عدد المصروفات" value={data?.total_count || 0} sub="معتمدة" color="text-blue-600" />
        <KpiCard title="معلقة" value={data?.pending_count || 0} sub="تنتظر الاعتماد" color="text-amber-600" />
        <KpiCard title="من الخزنة" value={data?.by_payment_source?.safe || 0} sub="" color="text-purple-600" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 mb-6">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">توزيع المصروفات حسب التصنيف</h3>
        <DataTable
          headers={['التصنيف', 'العدد', 'الإجمالي']}
          rows={data?.groups?.map((g) => [g.label, g.count, g.total])}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">تفاصيل المصروفات</h3>
        <DataTable
          headers={['التاريخ', 'التصنيف', 'المبلغ', 'المصدر', 'المستخدم', 'ملاحظات']}
          rows={data?.expenses?.map((e) => [
            new Date(e.expense_date || e.created_at).toLocaleString('ar'),
            e.expense_category?.name_ar || e.category || '—',
            e.amount?.toLocaleString(),
            e.payment_source === 'safe' ? 'خزنة' : e.payment_source === 'cash_register' ? 'صندوق' : 'مباشر',
            e.user?.name || '—',
            e.notes || '—',
          ])}
        />
        <Pagination meta={data?.meta} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────

function KpiCard({ title, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
      <div className="text-gray-400 dark:text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function DataTable({ headers, rows }) {
  if (!rows?.length) return <div className="text-gray-400 dark:text-gray-500 text-sm p-6 text-center">لا توجد بيانات</div>;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-800">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-right px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportButton({ type, params, label }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await client.get('/reports/export', {
        params: { ...params, type },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${type}_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('فشل التصدير');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Can permission={PERMISSIONS.EXPORT_REPORTS}>
      <Button variant="success" size="sm" onClick={handleExport} loading={loading} disabled={loading}>
        📥 {label}
      </Button>
    </Can>
  );
}
