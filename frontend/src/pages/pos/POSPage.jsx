import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import PaymentModal from './PaymentModal';
import { printReceipt, printA4 } from '../../utils/print';
import { useDebounce } from '../../utils/useDebounce';
import { Button } from '../../components/ui';
import { Can } from '../../components/Can';
import { PERMISSIONS } from '../../utils/permissions';

const DISCOUNT_LIMITS = {
  admin: 100,
  manager: 20,
  cashier: 5,
  accountant: 0,
  inventory_manager: 0,
};

export default function POSPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(null);
  const [showHeldPanel, setShowHeldPanel] = useState(false);
  const searchRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch?.id;
  const userRole = user?.role;
  const maxDiscountPct = DISCOUNT_LIMITS[userRole] ?? 0;
  const queryClient = useQueryClient();

  const { data: currencyData } = useQuery({
    queryKey: ['default-currency'],
    queryFn: async () => {
      const res = await client.get('/currencies', { params: { is_default: true } });
      const currencies = res.data;
      return currencies?.find((c) => c.is_default) || currencies?.[0] || null;
    },
    enabled: !!branchId,
  });

  const { data: productsData } = useQuery({
    queryKey: ['pos-products', debouncedSearch],
    queryFn: async () => {
      const res = await client.get('/products', {
        params: { q: debouncedSearch || undefined, limit: 50, is_active: 'true', with_stock: 'true' },
      });
      return res.data;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['pos-customers', customerSearch],
    queryFn: async () => {
      const res = await client.get('/customers', {
        params: { q: customerSearch || undefined, limit: 10 },
      });
      return res.data;
    },
  });

  const { data: shiftData } = useQuery({
    queryKey: ['active-shift', user?.id],
    queryFn: async () => {
      const res = await client.get('/finance/shifts', { params: { user_id: user?.id, limit: 1 } });
      const openShift = res.data.data?.find((s) => !s.closed_at);
      return openShift || null;
    },
  });

  const cartRef = useRef(cart);
  const shiftRef = useRef(shiftData);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { shiftRef.current = shiftData; }, [shiftData]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === 'F4') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F8') {
        e.preventDefault();
        const c = cartRef.current;
        if (c.length > 0 && shiftRef.current) setShowPayment(true);
      }
      if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (cartRef.current.length > 0 && confirm('تفريغ الفاتورة؟')) {
          setCart([]); setSelectedCustomer(null); setInvoiceDiscount(0);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name_ar || product.name,
        barcode: product.barcode,
        unit_price: product.selling_price,
        quantity: 1,
        discount: 0,
        total: product.selling_price,
      }];
    });
  };

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product_id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: qty, total: qty * item.unit_price }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const updateDiscount = (productId, discount) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              discount: Math.max(0, Math.min(discount, item.unit_price * item.quantity)),
              total: (item.unit_price * item.quantity) - Math.max(0, Math.min(discount, item.unit_price * item.quantity)),
            }
          : item
      )
    );
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), [cart]);
  const itemsDiscount = useMemo(() => cart.reduce((sum, item) => sum + item.discount, 0), [cart]);
  const total = Math.max(0, subtotal - itemsDiscount - invoiceDiscount);

  const createSaleMutation = useMutation({
    mutationFn: async (data) => {
      const res = await client.post('/sales', data);
      return res.data;
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries(['pos-products']);
      queryClient.invalidateQueries(['pos-balance']);
      queryClient.invalidateQueries(['held-sales']);
      setCart([]);
      setSelectedCustomer(null);
      setInvoiceDiscount(0);
      setLastSale(sale);
    },
    onError: (err) => {
      const message = err?.response?.data?.message || err?.message || 'فشل إتمام الفاتورة';
      alert('⚠️ ' + message);
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!shiftData) {
      alert('⚠️ يجب فتح وردية أولاً');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentComplete = async (paymentData, scheduleData) => {
    const saleData = {
      branch_id: branchId,
      shift_id: shiftData.id,
      user_id: user.id,
      customer_id: selectedCustomer?.id || null,
      subtotal,
      discount_amount: invoiceDiscount,
      tax_amount: 0,
      currency_id: currencyData?.id,
      exchange_rate: 1,
      notes: '',
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
      })),
      payments: paymentData,
      ...(scheduleData && { schedule_due_date: scheduleData.due_date, schedule_notes: scheduleData.notes }),
    };
    try {
      await createSaleMutation.mutateAsync(saleData);
      setShowPayment(false);
    } catch {
      // error handled by onError
    }
  };

  const holdSaleMutation = useMutation({
    mutationFn: async () => {
      if (!shiftData) throw new Error('يجب فتح وردية أولاً');
      const data = {
        branch_id: branchId,
        shift_id: shiftData.id,
        customer_id: selectedCustomer?.id || null,
        subtotal,
      discount_amount: invoiceDiscount,
        tax_amount: 0,
        currency_id: currencyData?.id,
        exchange_rate: 1,
        notes: '',
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total: item.total,
        })),
      };
      const res = await client.post('/sales/hold', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['held-sales']);
      setCart([]);
      setSelectedCustomer(null);
      setInvoiceDiscount(0);
    },
    onError: (err) => {
      const message = err?.response?.data?.message || err?.message || 'فشل تعليق الفاتورة';
      alert('⚠️ ' + message);
    },
  });

  const resumeSaleMutation = useMutation({
    mutationFn: async (sale) => {
      const res = await client.post(`/sales/${sale.id}/resume`);
      return res.data;
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries(['held-sales']);
      const restoredCart = sale.items.map((item) => ({
        product_id: item.product_id,
        name: item.product.name_ar || item.product.name,
        barcode: item.product.barcode,
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount,
        total: item.total,
      }));
      const restoredItemsDiscount = restoredCart.reduce((sum, i) => sum + (i.discount || 0), 0);
      setCart(restoredCart);
      setSelectedCustomer(sale.customer ? { id: sale.customer.id, name: sale.customer.name } : null);
      setInvoiceDiscount(Math.max(0, sale.discount_amount - restoredItemsDiscount));
    },
    onError: (err) => {
      const message = err?.response?.data?.message || err?.message || 'فشل استئناف الفاتورة';
      alert('⚠️ ' + message);
    },
  });

  const { data: heldSales, isLoading: heldSalesLoading } = useQuery({
    queryKey: ['held-sales'],
    queryFn: async () => {
      const res = await client.get('/sales/held/list');
      return res.data;
    },
  });

  return (
    <div className="flex h-full" dir="rtl">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3 dark:bg-gray-900 dark:border-gray-800">
          <div className="relative flex-1">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  const product = productsData?.data?.find(
                    (p) => p.barcode === search.trim()
                  );
                  if (product) {
                    addToCart(product);
                    setSearch('');
                  }
                }
              }}
              placeholder="بحث بالاسم أو الباركود..."
              className="w-full border border-gray-300 rounded-lg pr-10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
              onFocus={() => setShowCustomerList(true)}
              placeholder={selectedCustomer ? selectedCustomer.name : '👤 عميل'}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            {selectedCustomer && (
              <button type="button" onClick={() => setSelectedCustomer(null)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs dark:text-gray-500 dark:hover:text-red-400 cursor-pointer">✕</button>
            )}
            {showCustomerList && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
                {(customersData?.data || []).map((c) => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerList(false); }}
                    className="block w-full text-right px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/40">{c.name}</button>
                ))}
                <button onClick={() => { setSelectedCustomer({ id: null, name: 'زبون نقدي' }); setShowCustomerList(false); }}
                  className="block w-full text-right px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-t dark:text-gray-400 dark:hover:bg-gray-800 dark:border-gray-800">بدون عميل</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!productsData?.data?.length ? (
            <div className="text-center text-gray-400 mt-20 dark:text-gray-500">
              <div className="text-6xl mb-4">🛍️</div>
              <p>ابحث عن منتج أو امسح الباركود</p>
              <p className="text-xs mt-2 text-gray-300 dark:text-gray-500">اضغط Enter لإضافة المنتج بالباركود</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {productsData.data.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-xl border border-gray-200 p-3 text-right hover:border-blue-400 hover:shadow-md transition-all text-right group relative dark:bg-gray-900 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-gray-800 text-sm leading-tight dark:text-gray-100">{product.name_ar}</div>
                    <span className="text-xs text-gray-300 group-hover:text-blue-400 transition-colors dark:text-gray-500">+</span>
                  </div>
                  {product.barcode && (
                    <div className="text-xs text-gray-400 mb-2 font-mono dark:text-gray-500">{product.barcode}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{product.selling_price.toLocaleString()} ﷼</span>
                    {(() => {
                      const balances = product.inventory_balances;
                      if (!balances?.length) return null;
                      const stockQty = balances.reduce((s, b) => s + b.quantity, 0);
                      if (stockQty === 0) return <span className="text-xs text-red-500 dark:text-red-400">نفد المخزون</span>;
                      if (stockQty <= (product.min_stock || 0)) return <span className="text-xs text-amber-500 dark:text-amber-400">مخزون: {stockQty}</span>;
                      return <span className="text-xs text-gray-400 dark:text-gray-500">مخزون: {stockQty}</span>;
                    })()}
                  </div>
                  {product.category && (
                    <div className="mt-2">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full dark:bg-gray-800 dark:text-gray-400">{product.category.name}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-80 bg-white border-r border-gray-200 flex flex-col dark:bg-gray-900 dark:border-gray-700">
        <div className="p-3 border-b bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-gray-100">الفاتورة</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={heldSales?.length > 0 ? 'warning' : 'secondary'} onClick={() => setShowHeldPanel(!showHeldPanel)}>
                ⏸ {heldSales?.length || 0}
              </Button>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">{cart.length}</span>
            </div>
          </div>
          {!shiftData && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded dark:text-amber-400 dark:bg-amber-900/20">
              <span>⚠️</span>
              <span>الوردية مغلقة</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm dark:text-gray-500">الفاتورة فارغة</div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="bg-gray-50 rounded-xl p-2.5 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate ml-2 dark:text-gray-100">{item.name}</span>
                  <Button variant="ghost-danger" size="sm" onClick={() => removeFromCart(item.product_id)} className="!w-5 !h-5 !p-0 !min-w-0">✕</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.unit_price.toLocaleString()} ﷼</span>
                  <div className="flex items-center gap-1 bg-white rounded-lg border dark:bg-gray-900 dark:border-gray-700">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-r-lg dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700">−</button>
                    <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-gray-100">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-l-lg dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700">+</button>
                  </div>
                  <span className="text-sm font-bold text-green-600 min-w-[60px] text-left dark:text-green-400">{item.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setShowDiscountInput(showDiscountInput === item.product_id ? null : item.product_id)}
                    className={item.discount > 0 ? '!text-red-500 dark:!text-red-400' : ''}>
                    {item.discount > 0 ? `خصم ${item.discount.toLocaleString()} ﷼` : '➕ خصم'}
                  </Button>
                  {showDiscountInput === item.product_id && (
                    <input type="number" value={item.discount} min="0" max={item.unit_price * item.quantity}
                      onChange={(e) => updateDiscount(item.product_id, parseInt(e.target.value) || 0)}
                      className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs text-center dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" autoFocus
                      onBlur={() => setShowDiscountInput(null)} />
                  )}
                  {item.discount > 0 && userRole !== 'admin' && (
                    <span className="text-[10px] text-amber-500 dark:text-amber-400">{Math.round((item.discount / (item.unit_price * item.quantity)) * 100)}%</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedCustomer && selectedCustomer.id && (
          <div className="border-t border-b bg-blue-50/50 px-3 py-2 dark:border-gray-800 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
              <span>👤 {selectedCustomer.name}</span>
            </div>
            <div className="flex gap-3 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              <span>الرصيد: <span className={`font-medium ${(selectedCustomer.balance || 0) > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{(selectedCustomer.balance || 0).toLocaleString()} ﷼</span></span>
              {selectedCustomer.credit_limit > 0 && (
                <span>الحد الائتماني: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedCustomer.credit_limit.toLocaleString()} ﷼</span></span>
              )}
            </div>
          </div>
        )}

        {showHeldPanel && (
          <div className="border-t bg-amber-50 max-h-48 overflow-y-auto dark:border-gray-800 dark:bg-amber-900/20">
            <div className="sticky top-0 bg-amber-100 px-3 py-1.5 flex items-center justify-between dark:bg-amber-900/40">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">الفواتير المعلقة</span>
              <button type="button" onClick={() => setShowHeldPanel(false)} className="text-amber-400 hover:text-amber-600 text-xs dark:text-amber-500 dark:hover:text-amber-400 cursor-pointer">✕</button>
            </div>
            {heldSalesLoading ? (
              <div className="p-3 text-xs text-amber-600 text-center dark:text-amber-400">جاري التحميل...</div>
            ) : !heldSales?.length ? (
              <div className="p-3 text-xs text-amber-600 text-center dark:text-amber-400">لا توجد فواتير معلقة</div>
            ) : (
              heldSales.map((sale) => (
                <div key={sale.id} className="px-3 py-2 border-b border-amber-100 flex items-center justify-between hover:bg-amber-100/50 dark:border-amber-800/50 dark:hover:bg-amber-900/20">
                  <div>
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{sale.invoice_number}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{sale.customer?.name || 'بدون عميل'} · {sale.items.length} أصناف · {sale.total.toLocaleString()} ﷼</div>
                  </div>
                  <Can permission={PERMISSIONS.RESUME_SALES}>
                    <Button size="sm" variant="warning" onClick={() => {
                      if (cart.length > 0 && !confirm('⚠️ سيتم استبدال محتويات الفاتورة الحالية بالفاتورة المعلقة. هل تريد المتابعة؟')) return;
                      resumeSaleMutation.mutate(sale);
                    }}
                      disabled={resumeSaleMutation.isPending}
                      loading={resumeSaleMutation.isPending}>
                      استئناف
                    </Button>
                  </Can>
                </div>
              ))
            )}
          </div>
        )}

        <div className="border-t p-3 space-y-2.5 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>المجموع</span>
            <span>{subtotal.toLocaleString()} ﷼</span>
          </div>
          {itemsDiscount > 0 && (
            <div className="flex justify-between text-sm text-red-500 dark:text-red-400">
              <span>خصم الأصناف</span>
              <span>-{itemsDiscount.toLocaleString()} ﷼</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">خصم الفاتورة</span>
            <div className="flex items-center gap-1">
              <input type="number" value={invoiceDiscount} min="0" max={subtotal - itemsDiscount}
                onChange={(e) => setInvoiceDiscount(Math.max(0, Math.min(parseInt(e.target.value) || 0, subtotal - itemsDiscount)))}
                className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs text-center dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              <span className="text-gray-400 text-xs dark:text-gray-500">﷼</span>
            </div>
          </div>
          {userRole !== 'admin' && (
            <div className={`text-xs ${(itemsDiscount + invoiceDiscount) > 0 && ((itemsDiscount + invoiceDiscount) / (subtotal || 1)) * 100 > maxDiscountPct ? 'text-red-500 font-bold dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
              ⚠️ حد الخصم لدورك: {maxDiscountPct}%
            </div>
          )}
          <div className="pt-2 border-t dark:border-gray-800">
            <div className="flex justify-between text-lg font-bold text-gray-800 mb-3 dark:text-gray-100">
              <span>الإجمالي</span>
              <span className="text-green-600 dark:text-green-400">{total.toLocaleString()} ﷼</span>
            </div>
            <div className="flex gap-2">
              <Can permission={PERMISSIONS.CREATE_SALES}>
                <Button onClick={handleCheckout}
                  disabled={cart.length === 0 || createSaleMutation.isPending}
                  className="flex-1 !rounded-xl !py-3 !text-sm !font-bold"
                  loading={createSaleMutation.isPending}>
                  {`دفع ${total.toLocaleString()} ﷼`}
                </Button>
              </Can>
              <Can permission={PERMISSIONS.HOLD_SALES}>
                <Button variant="outline" onClick={() => { if (cart.length === 0) return; holdSaleMutation.mutate(); }}
                  disabled={cart.length === 0 || holdSaleMutation.isPending}
                  loading={holdSaleMutation.isPending}
                  className="border-amber-300 text-amber-600 hover:bg-amber-50 whitespace-nowrap dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20">
                  ⏸ تعليق
                </Button>
              </Can>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {cart.length > 0 && (
              <Button variant="ghost-danger" size="sm" onClick={() => { if (confirm('تفريغ الفاتورة؟')) { setCart([]); setSelectedCustomer(null); setInvoiceDiscount(0); } }}
                className="col-span-4">✕ تفريغ الفاتورة</Button>
            )}
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          cart={cart}
          customer={selectedCustomer}
          currencyId={currencyData?.id}
          onComplete={handlePaymentComplete}
          onClose={() => setShowPayment(false)}
        />
      )}

      {lastSale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center dark:bg-gray-900">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-green-900/30">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1 dark:text-gray-100">تمت الفاتورة بنجاح</h2>
            <p className="text-gray-500 text-sm mb-1 dark:text-gray-400">رقم: {lastSale.invoice_number}</p>
            <p className="text-2xl font-bold text-green-600 mb-1 dark:text-green-400">{(lastSale.total).toLocaleString()} ﷼</p>
            {lastSale.total > lastSale.paid_amount && (
              <p className="text-amber-600 text-sm font-medium mb-4 dark:text-amber-400">
                المتبقي على العميل: {(lastSale.total - lastSale.paid_amount).toLocaleString()} ﷼
              </p>
            )}
            <div className="flex gap-2 mb-3">
              <Can permission={PERMISSIONS.VIEW_FINANCIAL_REPORTS}>
                <Button onClick={() => { printReceipt(lastSale); setLastSale(null); }} className="flex-1">
                  🧾 طباعة حرارية
                </Button>
              </Can>
              <Can permission={PERMISSIONS.VIEW_FINANCIAL_REPORTS}>
                <Button variant="secondary" onClick={() => { printA4(lastSale); setLastSale(null); }} className="flex-1">
                  📄 طباعة A4
                </Button>
              </Can>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLastSale(null)}>طباعة لاحقاً</Button>
          </div>
        </div>
      )}
    </div>
  );
}
