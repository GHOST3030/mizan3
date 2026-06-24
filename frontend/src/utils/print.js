const formatNum = (n) => n;

const VARIABLE_RE = /\{(\w+)\}/g;

function fillTemplate(str, data) {
  return str?.replace(VARIABLE_RE, (_, key) => data[key] ?? `{${key}}`) || '';
}

export function renderFromTemplate(tpl, sale) {
  const saleDate = new Date(sale.created_at).toLocaleString('ar');
  const data = {
    company_name: 'متجر ميزان',
    invoice_number: sale.invoice_number,
    date: saleDate,
  };

  const itemsHtml = sale.items?.map((item) => {
    const name = item.product?.name_ar || item.product?.name || 'منتج';
    return `<tr>
      <td style="text-align:right">${name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:center">${formatNum(item.unit_price)}</td>
      ${item.discount > 0 ? `<td style="text-align:center">${formatNum(item.discount)}</td>` : ''}
      <td style="text-align:left">${formatNum(item.total)}</td>
    </tr>`;
  }).join('');

  const paymentsHtml = sale.payments?.map((p) => {
    const labels = { cash: 'نقداً', card: 'بطاقة', transfer: 'حوالة', credit: 'آجل' };
    return `<div style="display:flex;justify-content:space-between;font-size:12px">
      <span>${labels[p.method] || p.method}</span>
      <span>${formatNum(p.amount)}</span>
    </div>`;
  }).join('');

  const totalsHtml = `
    ${sale.subtotal ? `<div><span>المجموع</span><span>${formatNum(sale.subtotal)}</span></div>` : ''}
    ${sale.discount_amount > 0 ? `<div style="color:red"><span>الخصم</span><span>-${formatNum(sale.discount_amount)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:11px">
      <span>المدفوع</span><span>${formatNum(sale.paid_amount)}</span>
    </div>
    ${sale.change_amount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px">
      <span>الباقي</span><span>${formatNum(sale.change_amount)}</span>
    </div>` : ''}
    <div style="font-size:14px;font-weight:bold;display:flex;justify-content:space-between;border-top:1px solid #999;padding-top:4px;margin-top:4px">
      <span>الإجمالي</span><span>${formatNum(sale.total)}</span>
    </div>
    ${paymentsHtml ? `<div style="margin-top:4px">${paymentsHtml}</div>` : ''}
  `;

  const finalHtml = (tpl?.header ? fillTemplate(tpl.header, data) : '') +
    (tpl?.body ? fillTemplate(tpl.body, { ...data, items_table: itemsHtml, totals: totalsHtml }) : itemsHtml) +
    (tpl?.footer ? fillTemplate(tpl.footer, data) : '');

  const css = tpl?.css || '';
  const pageSize = tpl?.type === 'a4' ? 'A4' : '80mm auto';

  return `<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="utf-8">
<title>فاتورة ${sale.invoice_number}</title>
<style>
  @page { margin: 0; size: ${pageSize}; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { padding: 10px; font-size: 12px; color: #000; }
  ${css}
</style>
</head>
<body>${finalHtml}
<div class="no-print" style="text-align:center;margin-top:16px">
  <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer">🖨️ طباعة</button>
  <button onclick="window.close()" style="padding:8px 16px;font-size:14px;cursor:pointer">إغلاق</button>
</div>
<script>window.onafterprint=window.close;window.print()</script>
</body>
</html>`;
}

export function printReceipt(sale, companyName = 'متجر ميزان') {
  const items = sale.items || [];
  const payments = sale.payments || [];
  const customer = sale.customer;
  const saleDate = new Date(sale.created_at).toLocaleString('ar');
  const printDate = new Date().toLocaleString('ar');

  const itemsHtml = items.map((item) => {
    const name = item.product?.name_ar || item.product?.name || 'منتج';
    const qty = item.quantity;
    const price = formatNum(item.unit_price);
    const discount = item.discount || 0;
    const total = formatNum(item.total);
    return `
      <tr>
        <td style="text-align:right">${name}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:center">${price}</td>
        ${discount > 0 ? `<td style="text-align:center">${formatNum(discount)}</td>` : ''}
        <td style="text-align:left">${total}</td>
      </tr>`;
  }).join('');

  const paymentsHtml = payments.map((p) => {
    const labels = { cash: 'نقداً', card: 'بطاقة', transfer: 'حوالة', credit: 'آجل' };
    return `<div style="display:flex;justify-content:space-between;font-size:12px">
      <span>${labels[p.method] || p.method}</span>
      <span>${formatNum(p.amount)}</span>
    </div>`;
  }).join('');

  const hasDiscount = sale.discount_amount > 0;

  const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>فاتورة ${sale.invoice_number}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { padding: 10px; font-size: 12px; color: #000; }
  .header { text-align: center; margin-bottom: 10px; }
  .header h2 { font-size: 16px; margin-bottom: 4px; }
  .header .info { font-size: 11px; color: #555; }
  .divider { border-top: 1px dashed #999; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { border-bottom: 1px solid #999; padding: 4px 2px; font-size: 10px; }
  td { padding: 3px 2px; }
  .totals { margin-top: 6px; }
  .totals > div { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .totals .grand { font-size: 14px; font-weight: bold; border-top: 1px solid #999; padding-top: 4px; margin-top: 4px; }
  .footer { text-align: center; margin-top: 10px; font-size: 10px; color: #888; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h2>${companyName}</h2>
    <div class="info">
      <div>فاتورة: ${sale.invoice_number}</div>
      <div>التاريخ: ${saleDate}</div>
      ${customer ? `<div>العميل: ${customer.name}</div>` : ''}
      ${sale.user ? `<div>الكاشير: ${sale.user.name}</div>` : ''}
    </div>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:right">المنتج</th>
        <th style="text-align:center">الكمية</th>
        <th style="text-align:center">السعر</th>
        ${hasDiscount ? '<th style="text-align:center">الخصم</th>' : ''}
        <th style="text-align:left">المجموع</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="totals">
    ${sale.subtotal ? `<div><span>المجموع</span><span>${formatNum(sale.subtotal)}</span></div>` : ''}
    ${hasDiscount ? `<div style="color:red"><span>الخصم</span><span>-${formatNum(sale.discount_amount)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:11px">
      <span>المدفوع</span>
      <span>${formatNum(sale.paid_amount)}</span>
    </div>
    ${sale.change_amount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px">
      <span>الباقي</span>
      <span>${formatNum(sale.change_amount)}</span>
    </div>` : ''}
    <div class="grand">
      <span>الإجمالي</span>
      <span>${formatNum(sale.total)}</span>
    </div>
    ${paymentsHtml ? `<div style="margin-top:4px">${paymentsHtml}</div>` : ''}
  </div>

  <div class="footer">
    <div>شكراً لتسوقكم</div>
    <div>${printDate}</div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:16px">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer">🖨️ طباعة</button>
    <button onclick="window.close()" style="padding:8px 16px;font-size:14px;cursor:pointer">إغلاق</button>
  </div>

  <script>
    window.onafterprint = window.close;
    window.print();
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(html);
  win.document.close();
}

export function printA4(sale, companyName = 'متجر ميزان') {
  const items = sale.items || [];
  const payments = sale.payments || [];
  const customer = sale.customer;
  const saleDate = new Date(sale.created_at).toLocaleString('ar');

  const itemsHtml = items.map((item, i) => {
    const name = item.product?.name_ar || item.product?.name || 'منتج';
    return `
      <tr>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${i + 1}</td>
        <td style="text-align:right;padding:6px 4px;border:1px solid #ddd">${name}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${item.quantity}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${formatNum(item.unit_price)}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${formatNum(item.discount || 0)}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${formatNum(item.total)}</td>
      </tr>`;
  }).join('');

  const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>فاتورة ${sale.invoice_number}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { padding: 20px; font-size: 13px; color: #000; }
  .header { display:flex;justify-content:space-between;align-items:start;margin-bottom:20px; }
  .header h2 { font-size: 20px; }
  .info-table { width:100%;margin-bottom:16px; }
  .info-table td { padding:4px 8px;font-size:12px; }
  table { width:100%;border-collapse:collapse;margin-bottom:16px; }
  th { background:#f5f5f5;padding:8px 4px;border:1px solid #ddd;font-size:12px; }
  td { padding:6px 4px;border:1px solid #ddd;font-size:12px; }
  .totals { width:300px;margin-right:auto; }
  .totals > div { display:flex;justify-content:space-between;padding:4px 0;font-size:13px; }
  .totals .grand { font-size:16px;font-weight:bold;border-top:2px solid #333;padding-top:6px;margin-top:4px; }
  .footer { text-align:center;margin-top:30px;font-size:11px;color:#888; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h2>${companyName}</h2>
      <p style="font-size:12px;color:#555;margin-top:4px">فاتورة بيع</p>
    </div>
    <div style="text-align:left">
      <div style="font-size:13px;font-weight:bold">رقم: ${sale.invoice_number}</div>
      <div style="font-size:12px;color:#555">التاريخ: ${saleDate}</div>
    </div>
  </div>

  <table class="info-table">
    <tr>
      <td><strong>العميل:</strong> ${customer?.name || 'نقدي'}</td>
      <td><strong>الكاشير:</strong> ${sale.user?.name || '—'}</td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th style="text-align:right">المنتج</th>
        <th style="text-align:center">الكمية</th>
        <th style="text-align:center">سعر الوحدة</th>
        <th style="text-align:center">الخصم</th>
        <th style="text-align:center">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div><span>المجموع</span><span>${formatNum(sale.subtotal || sale.total)}</span></div>
    ${sale.discount_amount > 0 ? `<div style="color:red"><span>الخصم</span><span>-${formatNum(sale.discount_amount)}</span></div>` : ''}
    <div class="grand"><span>الإجمالي</span><span>${formatNum(sale.total)}</span></div>
    <div style="margin-top:8px">
      ${payments.map((p) => {
        const labels = { cash: 'نقداً', card: 'بطاقة', transfer: 'حوالة', credit: 'آجل' };
        return `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${labels[p.method] || p.method}</span><span>${formatNum(p.amount)}</span></div>`;
      }).join('')}
    </div>
    ${sale.change_amount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:green"><span>الباقي</span><span>${formatNum(sale.change_amount)}</span></div>` : ''}
  </div>

  <div class="footer">
    <p>شكراً لتسوقكم معنا</p>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 32px;font-size:15px;cursor:pointer;background:#2563eb;color:#fff;border:none;border-radius:8px">🖨️ طباعة</button>
    <button onclick="window.close()" style="padding:10px 24px;font-size:15px;cursor:pointer;background:#e5e7eb;border:none;border-radius:8px;margin-right:8px">إغلاق</button>
  </div>

  <script>
    window.onafterprint = window.close;
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(html);
  win.document.close();
}

export function printStatement(statement, companyName = 'متجر ميزان') {
  const summary = statement.summary || {};
  const transactions = statement.transactions || [];
  const customer = statement.customer;
  const now = new Date().toLocaleString('ar', { timeZone: 'Asia/Riyadh' });

  const creditPurchases = transactions.filter((t) => t.type === 'sale' && t.remaining > 0);
  const payments = transactions.filter((t) => t.type === 'payment');

  const purchasesHtml = creditPurchases.map((t) => {
    const isOverdue = t.schedule_due_date && new Date(t.schedule_due_date) < new Date();
    const itemsHtml = (t.items || []).map((item) => `
      <tr>
        <td style="text-align:right;padding:2px 4px">${item.product_name}</td>
        <td style="text-align:center;padding:2px 4px">${item.quantity}</td>
        <td style="text-align:center;padding:2px 4px">${formatNum(item.unit_price)}</td>
        <td style="text-align:left;padding:2px 4px">${formatNum(item.total)}</td>
      </tr>`).join('');

    const cashierName = t.cashier_name || '—';
    return `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:bold">${t.invoice_number}</span>
          <span style="font-size:11px;color:#666">${new Date(t.date).toLocaleDateString('ar')}</span>
        </div>
        <div style="font-size:10px;color:#9ca3af;margin-bottom:4px">الكاشير: ${cashierName}</div>
        ${t.schedule_due_date ? `<div style="font-size:11px;color:${isOverdue ? '#dc2626' : '#666'};margin-bottom:4px">تاريخ الاستحقاق: ${new Date(t.schedule_due_date).toLocaleDateString('ar')}${isOverdue ? ' - متأخرة' : ''}</div>` : ''}
        <div style="font-size:12px;margin-bottom:4px">
          المبلغ: <span style="font-weight:bold">${formatNum(t.debit)}</span>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          مدفوع: <span style="color:#16a34a">${formatNum(t.paid_amount)}</span>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          المتبقي: <span style="color:#d97706;font-weight:bold">${formatNum(t.remaining)}</span>
        </div>
        ${itemsHtml ? `
        <table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:6px">
          <thead><tr style="border-bottom:1px solid #d1d5db">
            <th style="text-align:right;padding:2px 4px">المنتج</th>
            <th style="text-align:center;padding:2px 4px">الكمية</th>
            <th style="text-align:center;padding:2px 4px">السعر</th>
            <th style="text-align:left;padding:2px 4px">الإجمالي</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>` : ''}
      </div>`;
  }).join('');

  const paymentsHtml = payments.map((p) => {
    const labels = { cash: 'نقداً', card: 'بطاقة', transfer: 'حوالة', credit: 'آجل' };
    return `
      <tr>
        <td style="text-align:center;padding:4px 6px">${new Date(p.date).toLocaleDateString('ar')}</td>
        <td style="text-align:right;padding:4px 6px">${p.description}</td>
        <td style="text-align:left;padding:4px 6px;color:#16a34a;font-weight:bold">${formatNum(p.credit)}</td>
        <td style="text-align:center;padding:4px 6px">${labels[p.payment_method] || p.payment_method}</td>
      </tr>`;
  }).join('');

  const totalDebt = summary.total_sales || 0;
  const totalPaid = summary.total_paid || 0;
  const remaining = totalDebt - totalPaid;

  const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>كشف حساب - ${customer?.name || ''}</title>
<style>
  @page { margin: 10mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { padding: 20px; font-size: 13px; color: #1f2937; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
  .header h1 { font-size: 22px; color: #2563eb; margin-bottom: 4px; }
  .header .sub { font-size: 12px; color: #6b7280; }
  .customer-info { margin-bottom: 20px; padding: 12px; background: #f0f5ff; border-radius: 8px; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; }
  .summary-card { flex: 1; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; }
  .summary-card .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: bold; }
  .section-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
  .footer-summary { margin-top: 24px; border-top: 2px solid #1f2937; padding-top: 12px; }
  .footer-summary > div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .footer-summary .grand { font-size: 18px; font-weight: bold; border-top: 2px solid #1f2937; padding-top: 8px; margin-top: 4px; }
  .no-print { text-align: center; margin-top: 20px; }
  .no-print button { padding: 10px 32px; font-size: 14px; cursor: pointer; background: #2563eb; color: #fff; border: none; border-radius: 8px; }
  .no-print button.sec { background: #e5e7eb; color: #1f2937; margin-right: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { border-bottom: 1px solid #d1d5db; padding: 6px; font-size: 11px; color: #6b7280; }
  td { padding: 6px; border-bottom: 1px solid #f3f4f6; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${companyName}</h1>
    <div class="sub">كشف حساب العميل</div>
    <div class="sub">تاريخ الطباعة: ${now}</div>
  </div>

  <div class="customer-info">
    <div style="font-size:16px;font-weight:bold">${customer?.name || ''}</div>
    ${customer?.phone ? `<div style="font-size:12px;color:#6b7280">📞 ${customer.phone}</div>` : ''}
    ${customer?.group?.name ? `<div style="font-size:12px;color:#6b7280">المجموعة: ${customer.group.name}</div>` : ''}
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">إجمالي المشتريات</div>
      <div class="value" style="color:#1f2937">${formatNum(totalDebt)} ﷼</div>
    </div>
    <div class="summary-card">
      <div class="label">إجمالي المدفوع</div>
      <div class="value" style="color:#16a34a">${formatNum(totalPaid)} ﷼</div>
    </div>
    <div class="summary-card">
      <div class="label">المديونية</div>
      <div class="value" style="color:${remaining > 0 ? '#d97706' : '#16a34a'}">${formatNum(remaining)} ﷼</div>
    </div>
  </div>

  ${creditPurchases.length > 0 ? `
  <div class="section-title">📋 المشتريات الآجلة (${creditPurchases.length})</div>
  ${purchasesHtml}` : ''}

  ${payments.length > 0 ? `
  <div class="section-title" style="margin-top:20px">💰 سجل المدفوعات (${payments.length})</div>
  <table>
    <thead><tr>
      <th style="text-align:center">التاريخ</th>
      <th style="text-align:right">البيان</th>
      <th style="text-align:left">المبلغ</th>
      <th style="text-align:center">طريقة الدفع</th>
    </tr></thead>
    <tbody>${paymentsHtml}</tbody>
  </table>` : ''}

  <div class="footer-summary">
    <div><span>إجمالي الدين</span><span style="font-weight:bold">${formatNum(totalDebt)} ﷼</span></div>
    <div><span>المبلغ المدفوع</span><span style="color:#16a34a;font-weight:bold">${formatNum(totalPaid)} ﷼</span></div>
    <div class="grand"><span>المتبقي</span><span style="color:${remaining > 0 ? '#d97706' : '#16a34a'}">${formatNum(remaining)} ﷼</span></div>
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ طباعة</button>
    <button class="sec" onclick="window.close()">إغلاق</button>
  </div>
  <script>window.onafterprint = window.close;window.print()</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}
