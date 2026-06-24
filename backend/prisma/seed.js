import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

const BRANCH_ID = '00000000-0000-0000-0000-000000000002';
const CURRENCY_YER = '00000000-0000-0000-0000-000000000010';
const WAREHOUSE_ID = '00000000-0000-0000-0000-000000000700';

async function main() {
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mizan Store',
      name_ar: 'متجر ميزان',
    },
  });
  console.log(' الشركة:', company.name_ar);

  const branch = await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: {},
    create: {
      id: BRANCH_ID,
      company_id: company.id,
      name: 'Main Branch',
      name_ar: 'الفرع الرئيسي',
      is_active: true,
    },
  });
  console.log(' الفرع:', branch.name_ar);

  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      branch_id: branch.id,
      name: 'المدير العام',
      username: 'admin',
      password_hash: hash,
      role: 'admin',
    },
  });
  console.log(' المستخدم:', admin.username);

  await prisma.currency.upsert({
    where: { id: CURRENCY_YER },
    update: {},
    create: {
      id: CURRENCY_YER,
      code: 'YER',
      name: 'ريال يمني',
      symbol: '﷼',
      exchange_rate: 1,
      is_default: true,
    },
  });
  await prisma.currency.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      code: 'USD',
      name: 'دولار أمريكي',
      symbol: '$',
      exchange_rate: 1500,
      is_default: false,
    },
  });
  await prisma.currency.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      code: 'SAR',
      name: 'ريال سعودي',
      symbol: 'SR',
      exchange_rate: 400,
      is_default: false,
    },
  });
  console.log(' العملات: YER, USD, SAR');

  // ─── Warehouse ───────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { id: WAREHOUSE_ID },
    update: {},
    create: {
      id: WAREHOUSE_ID,
      branch_id: BRANCH_ID,
      name: 'Main Warehouse',
      name_ar: 'المستودع الرئيسي',
      is_active: true,
    },
  });
  console.log(' المستودع:', warehouse.name_ar);

  // ─── Cash Register ──────────────────────
  await prisma.cashRegister.upsert({
    where: { id: '00000000-0000-0000-0000-000000000800' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000800',
      branch_id: BRANCH_ID,
      name: 'الخزينة الرئيسية',
      balance: 500000,
      currency_id: CURRENCY_YER,
    },
  });
  console.log(' الخزينة: الخزينة الرئيسية');

  // ─── Customer Groups ────────────────────
  const groups = {};
  for (const g of [
    { id: '00000000-0000-0000-0000-000000000900', name: 'عادي' },
    { id: '00000000-0000-0000-0000-000000000901', name: 'VIP' },
    { id: '00000000-0000-0000-0000-000000000902', name: 'جملة' },
  ]) {
    groups[g.id] = await prisma.customerGroup.upsert({
      where: { id: g.id },
      update: {},
      create: g,
    });
  }
  console.log(' مجموعات العملاء: عادي, VIP, جملة');

  // ─── Customers ──────────────────────────
  const customersData = [
    { id: '00000000-0000-0000-0000-000000000501', name: 'علي حسن', phone: '777111222', group_id: groups['00000000-0000-0000-0000-000000000901'].id, balance: 0, credit_limit: 200000 },
    { id: '00000000-0000-0000-0000-000000000502', name: 'أحمد ناصر', phone: '777333444', group_id: groups['00000000-0000-0000-0000-000000000900'].id, balance: 15000, credit_limit: 50000 },
    { id: '00000000-0000-0000-0000-000000000503', name: 'فاطمة محمد', phone: '777555666', group_id: groups['00000000-0000-0000-0000-000000000900'].id, balance: 0, credit_limit: 30000 },
    { id: '00000000-0000-0000-0000-000000000504', name: 'خالد عبدالله', phone: '777777888', group_id: groups['00000000-0000-0000-0000-000000000902'].id, balance: 0, credit_limit: 500000 },
    { id: '00000000-0000-0000-0000-000000000505', name: 'نورة صالح', phone: '777999000', group_id: groups['00000000-0000-0000-0000-000000000900'].id, balance: 0, credit_limit: 0 },
  ];
  const customers = [];
  for (const c of customersData) {
    customers.push(await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        branch_id: BRANCH_ID,
        customer_group_id: c.group_id,
        name: c.name,
        phone: c.phone,
        balance: c.balance,
        credit_limit: c.credit_limit,
      },
    }));
  }
  console.log(` العملاء: ${customers.length} عميل`);

  // ─── Supplier Categories ────────────────
  const supplierCats = {};
  for (const sc of [
    { id: '00000000-0000-0000-0000-000000000a00', name: 'Food & Beverages', description: 'مواد غذائية ومشروبات' },
    { id: '00000000-0000-0000-0000-000000000a01', name: 'Cleaning & Personal Care', description: 'منظفات وعناية شخصية' },
    { id: '00000000-0000-0000-0000-000000000a02', name: 'Dairy & Fresh', description: 'ألبان ومواد طازجة' },
  ]) {
    supplierCats[sc.id] = await prisma.supplierCategory.upsert({
      where: { id: sc.id },
      update: {},
      create: sc,
    });
  }
  console.log(' تصنيفات الموردين: مواد غذائية, منظفات, ألبان');

  // ─── Suppliers ──────────────────────────
  const suppliersData = [
    { id: '00000000-0000-0000-0000-000000000601', name: 'هائل الدولية', phone: '712345678', cat_id: supplierCats['00000000-0000-0000-0000-000000000a00'].id },
    { id: '00000000-0000-0000-0000-000000000602', name: 'مؤسسة السعيدة التجارية', phone: '712345679', cat_id: supplierCats['00000000-0000-0000-0000-000000000a00'].id },
    { id: '00000000-0000-0000-0000-000000000603', name: 'المراعي اليمن', phone: '712345680', cat_id: supplierCats['00000000-0000-0000-0000-000000000a02'].id },
    { id: '00000000-0000-0000-0000-000000000604', name: 'شركة النظافة الحديثة', phone: '712345681', cat_id: supplierCats['00000000-0000-0000-0000-000000000a01'].id },
  ];
  const suppliers = [];
  for (const s of suppliersData) {
    suppliers.push(await prisma.supplier.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        branch_id: BRANCH_ID,
        supplier_category_id: s.cat_id,
        name: s.name,
        phone: s.phone,
      },
    }));
  }
  console.log(` الموردين: ${suppliers.length} مورد`);

  // ─── Units ──────────────────────────────
  const units = {};
  const unitsData = [
    { id: '00000000-0000-0000-0000-000000000200', name: 'Piece', name_ar: 'حبة' },
    { id: '00000000-0000-0000-0000-000000000201', name: 'kg', name_ar: 'كجم' },
    { id: '00000000-0000-0000-0000-000000000202', name: 'g', name_ar: 'جرام' },
    { id: '00000000-0000-0000-0000-000000000203', name: 'Litre', name_ar: 'لتر' },
    { id: '00000000-0000-0000-0000-000000000204', name: 'ml', name_ar: 'مل' },
    { id: '00000000-0000-0000-0000-000000000205', name: 'Pack', name_ar: 'علبة' },
    { id: '00000000-0000-0000-0000-000000000206', name: 'Sack', name_ar: 'كيس' },
    { id: '00000000-0000-0000-0000-000000000207', name: 'Carton', name_ar: 'كرتونة' },
  ];
  for (const u of unitsData) {
    units[u.id] = await prisma.unit.upsert({ where: { id: u.id }, update: {}, create: u });
  }
  console.log(` الوحدات: ${unitsData.length} وحدة`);

  // ─── Brands ─────────────────────────────
  const brands = {};
  const brandsData = [
    { id: '00000000-0000-0000-0000-000000000300', name: 'Pepsi' },
    { id: '00000000-0000-0000-0000-000000000301', name: 'Coca-Cola' },
    { id: '00000000-0000-0000-0000-000000000302', name: 'Hail' },
    { id: '00000000-0000-0000-0000-000000000303', name: 'Almarai' },
    { id: '00000000-0000-0000-0000-000000000304', name: 'Al-Saeeda' },
    { id: '00000000-0000-0000-0000-000000000305', name: 'Nido' },
    { id: '00000000-0000-0000-0000-000000000306', name: 'Lulu' },
    { id: '00000000-0000-0000-0000-000000000307', name: 'Al-Watania' },
    { id: '00000000-0000-0000-0000-000000000308', name: 'Rabi' },
    { id: '00000000-0000-0000-0000-000000000309', name: 'Nescafe' },
    { id: '00000000-0000-0000-0000-00000000030a', name: 'Lays' },
    { id: '00000000-0000-0000-0000-00000000030b', name: 'Ulker' },
    { id: '00000000-0000-0000-0000-00000000030c', name: 'Tide' },
    { id: '00000000-0000-0000-0000-00000000030d', name: 'Head & Shoulders' },
  ];
  for (const b of brandsData) {
    brands[b.id] = await prisma.brand.upsert({ where: { id: b.id }, update: {}, create: b });
  }
  console.log(` العلامات التجارية: ${brandsData.length} علامة`);

  // ─── Categories ─────────────────────────
  const categories = {};
  const categoriesData = [
    { id: '00000000-0000-0000-0000-000000000100', name: 'Beverages', name_ar: 'مشروبات' },
    { id: '00000000-0000-0000-0000-000000000101', name: 'Dairy', name_ar: 'ألبان' },
    { id: '00000000-0000-0000-0000-000000000102', name: 'Groceries', name_ar: 'مواد غذائية' },
    { id: '00000000-0000-0000-0000-000000000103', name: 'Canned Food', name_ar: 'معلبات' },
    { id: '00000000-0000-0000-0000-000000000104', name: 'Snacks', name_ar: 'وجبات خفيفة' },
    { id: '00000000-0000-0000-0000-000000000105', name: 'Cleaning Supplies', name_ar: 'منظفات' },
    { id: '00000000-0000-0000-0000-000000000106', name: 'Personal Care', name_ar: 'عناية شخصية' },
    { id: '00000000-0000-0000-0000-000000000107', name: 'Sweets & Candy', name_ar: 'حلويات' },
    { id: '00000000-0000-0000-0000-000000000108', name: 'Spices', name_ar: 'بهارات' },
  ];
  for (const cat of categoriesData) {
    categories[cat.id] = await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }
  console.log(` التصنيفات: ${categoriesData.length} تصنيف`);

  // ─── Products ───────────────────────────
  const productsData = [
    // Beverages (category 100)
    { id: '00000000-0000-0000-0000-00000000f001', name: 'Mineral Water 1.5L', name_ar: 'مياه معدنية 1.5 لتر', cat: '00000000-0000-0000-0000-000000000100', unit: '00000000-0000-0000-0000-000000000203', brand: '00000000-0000-0000-0000-000000000302', barcode: '6281001234560', cost: 150, sell: 250, min: 48 },
    { id: '00000000-0000-0000-0000-00000000f002', name: 'Pepsi Can 330ml', name_ar: 'بيبسي علبة 330 مل', cat: '00000000-0000-0000-0000-000000000100', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000300', barcode: '6282001234560', cost: 200, sell: 300, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f003', name: 'Coca-Cola Can 330ml', name_ar: 'كوكاكولا علبة 330 مل', cat: '00000000-0000-0000-0000-000000000100', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000301', barcode: '6282001234561', cost: 200, sell: 300, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f004', name: 'Mirinda Can 330ml', name_ar: 'ميرندا علبة 330 مل', cat: '00000000-0000-0000-0000-000000000100', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000300', barcode: '6282001234562', cost: 200, sell: 300, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f005', name: '7up Can 330ml', name_ar: 'سفن أب علبة 330 مل', cat: '00000000-0000-0000-0000-000000000100', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000300', barcode: '6282001234563', cost: 200, sell: 300, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f006', name: 'Tropicana Mango Juice 1L', name_ar: 'عصير تروبيكانا مانجو 1 لتر', cat: '00000000-0000-0000-0000-000000000100', unit: '00000000-0000-0000-0000-000000000203', brand: '00000000-0000-0000-0000-000000000301', barcode: '6282001234564', cost: 800, sell: 1200, min: 12 },

    // Dairy (category 101)
    { id: '00000000-0000-0000-0000-00000000f007', name: 'Almarai Fresh Milk 1L', name_ar: 'حليب المراعي طازج 1 لتر', cat: '00000000-0000-0000-0000-000000000101', unit: '00000000-0000-0000-0000-000000000203', brand: '00000000-0000-0000-0000-000000000303', barcode: '6282001234565', cost: 700, sell: 1000, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f008', name: 'Nido Powdered Milk 2.25kg', name_ar: 'حليب نيدو بودرة 2.25 كجم', cat: '00000000-0000-0000-0000-000000000101', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000305', barcode: '6282001234566', cost: 3500, sell: 4500, min: 6 },
    { id: '00000000-0000-0000-0000-00000000f009', name: 'Almarai Yogurt 500g', name_ar: 'زبادي المراعي 500 جرام', cat: '00000000-0000-0000-0000-000000000101', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000303', barcode: '6282001234567', cost: 350, sell: 500, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f00a', name: 'Almarai Cheddar Cheese 250g', name_ar: 'جبنة شيدر المراعي 250 جرام', cat: '00000000-0000-0000-0000-000000000101', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000303', barcode: '6282001234568', cost: 800, sell: 1200, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f00b', name: 'Cream Cheese 200g', name_ar: 'جبنة كريم 200 جرام', cat: '00000000-0000-0000-0000-000000000101', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000303', barcode: '6282001234569', cost: 400, sell: 600, min: 12 },

    // Groceries (category 102)
    { id: '00000000-0000-0000-0000-00000000f00c', name: 'Hail Basmati Rice 5kg', name_ar: 'أرز بسمتي هائل 5 كجم', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000206', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234570', cost: 5500, sell: 7500, min: 10 },
    { id: '00000000-0000-0000-0000-00000000f00d', name: 'White Sugar 5kg', name_ar: 'سكر أبيض 5 كجم', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000206', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234571', cost: 3500, sell: 4500, min: 10 },
    { id: '00000000-0000-0000-0000-00000000f00e', name: 'Al-Saeeda Vegetable Oil 1.5L', name_ar: 'زيت نباتي السعيدة 1.5 لتر', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000203', brand: '00000000-0000-0000-0000-000000000304', barcode: '6282001234572', cost: 2200, sell: 3000, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f00f', name: 'Lulu Vegetable Oil 1L', name_ar: 'زيت نباتي لآلى 1 لتر', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000203', brand: '00000000-0000-0000-0000-000000000306', barcode: '6282001234573', cost: 1500, sell: 2200, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f010', name: 'Al-Malaki Wheat Flour 5kg', name_ar: 'دقيق القمح الملكي 5 كجم', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000206', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234574', cost: 2500, sell: 3500, min: 10 },
    { id: '00000000-0000-0000-0000-00000000f011', name: 'Al-Watania Spaghetti 500g', name_ar: 'معكرونة سباغيتي الوطنية 500 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234575', cost: 500, sell: 800, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f012', name: 'Rabi Tea 100g', name_ar: 'شاي ربيع 100 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000308', barcode: '6282001234576', cost: 800, sell: 1200, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f013', name: 'Nescafe Instant Coffee 200g', name_ar: 'نسكافيه 200 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000309', barcode: '6282001234577', cost: 1800, sell: 2500, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f014', name: 'Red Lentils 1kg', name_ar: 'عدس أحمر 1 كجم', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000201', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234578', cost: 1000, sell: 1500, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f015', name: 'Fava Beans 500g', name_ar: 'فول مدمس 500 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234579', cost: 600, sell: 1000, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f016', name: 'Pure Ghee 1kg', name_ar: 'سمن بلدي 1 كجم', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000201', brand: '00000000-0000-0000-0000-000000000304', barcode: '6282001234580', cost: 2500, sell: 3500, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f017', name: 'Natural Honey 500g', name_ar: 'عسل نحل طبيعي 500 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234581', cost: 6000, sell: 8000, min: 6 },
    { id: '00000000-0000-0000-0000-00000000f018', name: 'Table Salt 500g', name_ar: 'ملح طعام 500 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234582', cost: 150, sell: 300, min: 48 },
    { id: '00000000-0000-0000-0000-00000000f019', name: 'Macaroni 500g', name_ar: 'معكرونة 500 جرام', cat: '00000000-0000-0000-0000-000000000102', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234583', cost: 400, sell: 650, min: 24 },

    // Canned Food (category 103)
    { id: '00000000-0000-0000-0000-00000000f01a', name: 'Almarai Tuna 185g', name_ar: 'تونة المراعي 185 جرام', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000303', barcode: '6282001234584', cost: 1000, sell: 1500, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f01b', name: 'Al-Saeeda Tuna 185g', name_ar: 'تونة السعيدة 185 جرام', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000304', barcode: '6282001234585', cost: 800, sell: 1200, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f01c', name: 'Canned White Beans 400g', name_ar: 'فاصوليا بيضاء معلبة 400 جرام', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234586', cost: 500, sell: 800, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f01d', name: 'Canned Peas & Carrots 400g', name_ar: 'بازيلا وجزر معلبة 400 جرام', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234587', cost: 600, sell: 900, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f01e', name: 'Tomato Sauce 370g', name_ar: 'صلصة طماطم 370 جرام', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234588', cost: 400, sell: 700, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f01f', name: 'Tomato Paste 140g', name_ar: 'معجون طماطم 140 جرام', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234589', cost: 250, sell: 400, min: 48 },
    { id: '00000000-0000-0000-0000-00000000f020', name: 'Chicken Bouillon Cubes 30pc', name_ar: 'مرق دجاج مكعبات 30 حبة', cat: '00000000-0000-0000-0000-000000000103', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-000000000307', barcode: '6282001234590', cost: 300, sell: 500, min: 48 },

    // Snacks (category 104)
    { id: '00000000-0000-0000-0000-00000000f021', name: 'Lays Chips 150g', name_ar: 'شيبس ليز 150 جرام', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030a', barcode: '6282001234591', cost: 400, sell: 600, min: 48 },
    { id: '00000000-0000-0000-0000-00000000f022', name: 'Texas Chips 100g', name_ar: 'شيبس تيكساس 100 جرام', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030a', barcode: '6282001234592', cost: 250, sell: 400, min: 48 },
    { id: '00000000-0000-0000-0000-00000000f023', name: 'Ulker Plain Biscuits', name_ar: 'بسكويت أولكر سادة', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234593', cost: 300, sell: 500, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f024', name: 'Digestive Biscuits', name_ar: 'بسكويت دايجستف', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234594', cost: 450, sell: 700, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f025', name: 'Galaxy Chocolate 100g', name_ar: 'شوكولاتة جالكسي 100 جرام', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234595', cost: 1000, sell: 1500, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f026', name: 'Twinkies Cake', name_ar: 'كيك توينكيز', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234596', cost: 250, sell: 400, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f027', name: 'Microwave Popcorn', name_ar: 'فشار جاهز للميكروويف', cat: '00000000-0000-0000-0000-000000000104', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030a', barcode: '6282001234597', cost: 350, sell: 600, min: 24 },

    // Cleaning Supplies (category 105)
    { id: '00000000-0000-0000-0000-00000000f028', name: 'Tide Laundry Detergent 3kg', name_ar: 'مسحوق تايد 3 كجم', cat: '00000000-0000-0000-0000-000000000105', unit: '00000000-0000-0000-0000-000000000206', brand: '00000000-0000-0000-0000-00000000030c', barcode: '6282001234598', cost: 3500, sell: 5000, min: 6 },
    { id: '00000000-0000-0000-0000-00000000f029', name: 'Pril Dish Soap 500ml', name_ar: 'سائل جلي بريل 500 مل', cat: '00000000-0000-0000-0000-000000000105', unit: '00000000-0000-0000-0000-000000000204', brand: '00000000-0000-0000-0000-00000000030c', barcode: '6282001234599', cost: 500, sell: 800, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f02a', name: 'Airwick Air Freshener', name_ar: 'معطر جو ايرويك', cat: '00000000-0000-0000-0000-000000000105', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030c', barcode: '6282001234600', cost: 600, sell: 1000, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f02b', name: 'Clorox Bleach 1L', name_ar: 'كلوركس 1 لتر', cat: '00000000-0000-0000-0000-000000000105', unit: '00000000-0000-0000-0000-000000000203', brand: '00000000-0000-0000-0000-00000000030c', barcode: '6282001234601', cost: 400, sell: 700, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f02c', name: 'Lux Shower Soap', name_ar: 'صابون استحمام لوكس', cat: '00000000-0000-0000-0000-000000000105', unit: '00000000-0000-0000-0000-000000000200', brand: '00000000-0000-0000-0000-00000000030c', barcode: '6282001234602', cost: 250, sell: 400, min: 48 },

    // Personal Care (category 106)
    { id: '00000000-0000-0000-0000-00000000f02d', name: 'Head & Shoulders Shampoo 200ml', name_ar: 'شامبو هيد اند شولدرز 200 مل', cat: '00000000-0000-0000-0000-000000000106', unit: '00000000-0000-0000-0000-000000000204', brand: '00000000-0000-0000-0000-00000000030d', barcode: '6282001234603', cost: 1800, sell: 2500, min: 12 },
    { id: '00000000-0000-0000-0000-00000000f02e', name: 'Signal Toothpaste', name_ar: 'معجون أسنان سيجنال', cat: '00000000-0000-0000-0000-000000000106', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030d', barcode: '6282001234604', cost: 500, sell: 800, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f02f', name: 'Hand Soap 250ml', name_ar: 'صابون سائل لليدين 250 مل', cat: '00000000-0000-0000-0000-000000000106', unit: '00000000-0000-0000-0000-000000000204', brand: '00000000-0000-0000-0000-00000000030c', barcode: '6282001234605', cost: 350, sell: 600, min: 24 },

    // Sweets & Candy (category 107)
    { id: '00000000-0000-0000-0000-00000000f030', name: 'Kinder Chocolate', name_ar: 'شوكولاتة كندر', cat: '00000000-0000-0000-0000-000000000107', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234606', cost: 600, sell: 1000, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f031', name: 'Jumbo Candy', name_ar: 'حلوى جامبو', cat: '00000000-0000-0000-0000-000000000107', unit: '00000000-0000-0000-0000-000000000200', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234607', cost: 100, sell: 200, min: 100 },
    { id: '00000000-0000-0000-0000-00000000f032', name: 'Wrigley\'s Gum 50g', name_ar: 'علكة ويقليز 50 جرام', cat: '00000000-0000-0000-0000-000000000107', unit: '00000000-0000-0000-0000-000000000205', brand: '00000000-0000-0000-0000-00000000030b', barcode: '6282001234608', cost: 200, sell: 300, min: 48 },

    // Spices (category 108)
    { id: '00000000-0000-0000-0000-00000000f033', name: 'Black Pepper 100g', name_ar: 'فلفل أسود 100 جرام', cat: '00000000-0000-0000-0000-000000000108', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234609', cost: 600, sell: 900, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f034', name: 'Cumin 100g', name_ar: 'كمون 100 جرام', cat: '00000000-0000-0000-0000-000000000108', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234610', cost: 300, sell: 500, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f035', name: 'Turmeric 100g', name_ar: 'كركم 100 جرام', cat: '00000000-0000-0000-0000-000000000108', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234611', cost: 300, sell: 500, min: 24 },
    { id: '00000000-0000-0000-0000-00000000f036', name: 'Mixed Spices 100g', name_ar: 'بهارات مشكلة 100 جرام', cat: '00000000-0000-0000-0000-000000000108', unit: '00000000-0000-0000-0000-000000000202', brand: '00000000-0000-0000-0000-000000000302', barcode: '6282001234612', cost: 400, sell: 650, min: 24 },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        branch_id: BRANCH_ID,
        category_id: p.cat,
        unit_id: p.unit,
        brand_id: p.brand,
        name: p.name,
        name_ar: p.name_ar,
        barcode: p.barcode,
        cost_price: p.cost,
        selling_price: p.sell,
        min_stock: p.min,
        is_active: true,
      },
    });
    products.push(product);
  }
  console.log(` المنتجات: ${products.length} منتج`);

  // ─── Inventory Balances ─────────────────
  const initialStock = [
    { id: '00000000-0000-0000-0000-00000000f001', qty: 120 },  // Water
    { id: '00000000-0000-0000-0000-00000000f002', qty: 96 },   // Pepsi
    { id: '00000000-0000-0000-0000-00000000f003', qty: 96 },   // Coca-Cola
    { id: '00000000-0000-0000-0000-00000000f004', qty: 72 },   // Mirinda
    { id: '00000000-0000-0000-0000-00000000f005', qty: 72 },   // 7up
    { id: '00000000-0000-0000-0000-00000000f006', qty: 36 },   // Juice
    { id: '00000000-0000-0000-0000-00000000f007', qty: 48 },   // Milk
    { id: '00000000-0000-0000-0000-00000000f008', qty: 18 },   // Nido
    { id: '00000000-0000-0000-0000-00000000f009', qty: 60 },   // Yogurt
    { id: '00000000-0000-0000-0000-00000000f00a', qty: 24 },   // Cheese
    { id: '00000000-0000-0000-0000-00000000f00b', qty: 24 },   // Cream Cheese
    { id: '00000000-0000-0000-0000-00000000f00c', qty: 25 },   // Rice
    { id: '00000000-0000-0000-0000-00000000f00d', qty: 30 },   // Sugar
    { id: '00000000-0000-0000-0000-00000000f00e', qty: 36 },   // Oil 1.5L
    { id: '00000000-0000-0000-0000-00000000f00f', qty: 36 },   // Oil 1L
    { id: '00000000-0000-0000-0000-00000000f010', qty: 20 },   // Flour
    { id: '00000000-0000-0000-0000-00000000f011', qty: 72 },   // Spaghetti
    { id: '00000000-0000-0000-0000-00000000f012', qty: 48 },   // Tea
    { id: '00000000-0000-0000-0000-00000000f013', qty: 24 },   // Coffee
    { id: '00000000-0000-0000-0000-00000000f014', qty: 30 },   // Lentils
    { id: '00000000-0000-0000-0000-00000000f015', qty: 36 },   // Fava beans
    { id: '00000000-0000-0000-0000-00000000f016', qty: 20 },   // Ghee
    { id: '00000000-0000-0000-0000-00000000f017', qty: 12 },   // Honey
    { id: '00000000-0000-0000-0000-00000000f018', qty: 96 },   // Salt
    { id: '00000000-0000-0000-0000-00000000f019', qty: 72 },   // Macaroni
    { id: '00000000-0000-0000-0000-00000000f01a', qty: 48 },   // Tuna Almarai
    { id: '00000000-0000-0000-0000-00000000f01b', qty: 48 },   // Tuna Saeeda
    { id: '00000000-0000-0000-0000-00000000f01c', qty: 36 },   // Beans
    { id: '00000000-0000-0000-0000-00000000f01d', qty: 36 },   // Peas
    { id: '00000000-0000-0000-0000-00000000f01e', qty: 48 },   // Tomato sauce
    { id: '00000000-0000-0000-0000-00000000f01f', qty: 72 },   // Tomato paste
    { id: '00000000-0000-0000-0000-00000000f020', qty: 72 },   // Bouillon
    { id: '00000000-0000-0000-0000-00000000f021', qty: 72 },   // Lays
    { id: '00000000-0000-0000-0000-00000000f022', qty: 72 },   // Texas
    { id: '00000000-0000-0000-0000-00000000f023', qty: 36 },   // Biscuits Ulker
    { id: '00000000-0000-0000-0000-00000000f024', qty: 36 },   // Digestive
    { id: '00000000-0000-0000-0000-00000000f025', qty: 24 },   // Galaxy
    { id: '00000000-0000-0000-0000-00000000f026', qty: 36 },   // Twinkies
    { id: '00000000-0000-0000-0000-00000000f027', qty: 24 },   // Popcorn
    { id: '00000000-0000-0000-0000-00000000f028', qty: 12 },   // Tide
    { id: '00000000-0000-0000-0000-00000000f029', qty: 36 },   // Pril
    { id: '00000000-0000-0000-0000-00000000f02a', qty: 24 },   // Airwick
    { id: '00000000-0000-0000-0000-00000000f02b', qty: 24 },   // Clorox
    { id: '00000000-0000-0000-0000-00000000f02c', qty: 72 },   // Lux
    { id: '00000000-0000-0000-0000-00000000f02d', qty: 24 },   // H&S
    { id: '00000000-0000-0000-0000-00000000f02e', qty: 48 },   // Signal
    { id: '00000000-0000-0000-0000-00000000f02f', qty: 36 },   // Hand soap
    { id: '00000000-0000-0000-0000-00000000f030', qty: 36 },   // Kinder
    { id: '00000000-0000-0000-0000-00000000f031', qty: 200 },  // Jumbo
    { id: '00000000-0000-0000-0000-00000000f032', qty: 60 },   // Gum
    { id: '00000000-0000-0000-0000-00000000f033', qty: 36 },   // Pepper
    { id: '00000000-0000-0000-0000-00000000f034', qty: 36 },   // Cumin
    { id: '00000000-0000-0000-0000-00000000f035', qty: 36 },   // Turmeric
    { id: '00000000-0000-0000-0000-00000000f036', qty: 36 },   // Mixed
  ];

  for (const s of initialStock) {
    await prisma.inventoryBalance.upsert({
      where: {
        branch_id_warehouse_id_product_id: {
          branch_id: BRANCH_ID,
          warehouse_id: WAREHOUSE_ID,
          product_id: s.id,
        },
      },
      update: { quantity: s.qty },
      create: {
        branch_id: BRANCH_ID,
        warehouse_id: WAREHOUSE_ID,
        product_id: s.id,
        quantity: s.qty,
      },
    });
  }
  console.log(' أرصدة المخزون:', initialStock.length);

  // ─── Stock Movements (opening balance) ──
  let moveIdx = 0;
  for (const s of initialStock) {
    const mid = `00000000-0000-0000-0000-00000f${String(moveIdx).padStart(3, '0')}f`;
    await prisma.stockMovement.upsert({
      where: { id: mid },
      update: {},
      create: {
        id: mid,
        branch_id: BRANCH_ID,
        warehouse_id: WAREHOUSE_ID,
        product_id: s.id,
        type: 'purchase',
        quantity: s.qty,
        notes: 'رصيد افتتاحي',
      },
    });
    moveIdx++;
  }
  console.log(' حركات المخزون:', moveIdx);

  // ─── RBAC: Roles ────────────────────────────
  const roleDefs = [
    { name: 'super_admin', label: 'المشرف العام', is_system: true },
    { name: 'admin', label: 'مدير النظام', is_system: true },
    { name: 'manager', label: 'مدير الفرع', is_system: true },
    { name: 'accountant', label: 'محاسب', is_system: true },
    { name: 'inventory_manager', label: 'مسؤول المخزون', is_system: true },
    { name: 'cashier', label: 'كاشير', is_system: true },
    { name: 'auditor', label: 'مدقق', is_system: true },
  ];

  const roles = {};
  for (const r of roleDefs) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: { label: r.label },
      create: r,
    });
  }
  console.log(` الأدوار: ${Object.keys(roles).length} دور`);

  // ─── RBAC: Permissions ──────────────────────────
  const permissionDefs = [
    // Field-Level Security (Phase G2)
    { key: 'field:view_product_cost', label: 'عرض تكلفة المنتج', group: 'field_security' },
    { key: 'field:view_profit_margin', label: 'عرض هامش الربح', group: 'field_security' },
    { key: 'field:view_profit_amount', label: 'عرض مبلغ الربح', group: 'field_security' },
    { key: 'field:view_inventory_value', label: 'عرض قيمة المخزون', group: 'field_security' },
    { key: 'field:view_daily_profit', label: 'عرض الربح اليومي', group: 'field_security' },
    { key: 'field:view_monthly_profit', label: 'عرض الربح الشهري', group: 'field_security' },
    { key: 'field:view_safe_balance', label: 'عرض رصيد الخزنة', group: 'field_security' },
    { key: 'field:view_financial_summary', label: 'عرض الملخص المالي', group: 'field_security' },
    { key: 'field:view_customer_balance', label: 'عرض رصيد العميل', group: 'field_security' },
    { key: 'field:view_supplier_balance', label: 'عرض رصيد المورد', group: 'field_security' },
    { key: 'field:view_purchase_costs', label: 'عرض تكاليف المشتريات', group: 'field_security' },
    // Financial
    { key: 'financial:view_profit_reports', label: 'عرض تقارير الأرباح', group: 'financial' },
    { key: 'financial:view_financial_reports', label: 'عرض التقارير المالية', group: 'financial' },
    { key: 'financial:view_cost_reports', label: 'عرض تقارير التكاليف', group: 'financial' },
    // Inventory
    { key: 'inventory:manage', label: 'إدارة المخزون', group: 'inventory' },
    { key: 'inventory:adjustment', label: 'تسوية المخزون', group: 'inventory' },
    { key: 'inventory:transfer', label: 'تحويل مخزون', group: 'inventory' },
    { key: 'inventory:count', label: 'جرد المخزون', group: 'inventory' },
    { key: 'inventory:wastage', label: 'تالف ومفقود', group: 'inventory' },
    // Sales
    { key: 'sales:create', label: 'إنشاء فاتورة بيع', group: 'sales' },
    { key: 'sales:edit', label: 'تعديل فاتورة بيع', group: 'sales' },
    { key: 'sales:cancel', label: 'إلغاء فاتورة بيع', group: 'sales' },
    { key: 'sales:delete', label: 'حذف فاتورة بيع', group: 'sales' },
    { key: 'sales:hold', label: 'تعليق فاتورة بيع', group: 'sales' },
    { key: 'sales:resume', label: 'استئناف فاتورة بيع', group: 'sales' },
    // Returns
    { key: 'returns:create', label: 'إنشاء مرتجع', group: 'returns' },
    { key: 'returns:cancel', label: 'إلغاء مرتجع', group: 'returns' },
    { key: 'returns:delete', label: 'حذف مرتجع', group: 'returns' },
    // Products
    { key: 'products:manage', label: 'إدارة المنتجات', group: 'products' },
    { key: 'products:manage_categories', label: 'إدارة التصنيفات', group: 'products' },
    // Business
    { key: 'business:manage_suppliers', label: 'إدارة الموردين', group: 'business' },
    { key: 'business:manage_customers', label: 'إدارة العملاء', group: 'business' },
    { key: 'business:manage_purchases', label: 'إدارة المشتريات', group: 'business' },
    { key: 'business:manage_expenses', label: 'إدارة المصروفات', group: 'business' },
    // Administration
    { key: 'admin:manage_users', label: 'إدارة المستخدمين', group: 'administration' },
    { key: 'admin:manage_roles', label: 'إدارة الأدوار', group: 'administration' },
    { key: 'admin:manage_permissions', label: 'إدارة الصلاحيات', group: 'administration' },
    // Reporting
    { key: 'reporting:view_reports', label: 'عرض التقارير', group: 'reporting' },
    { key: 'reporting:export_reports', label: 'تصدير التقارير', group: 'reporting' },
    // Audit
    { key: 'audit:view_logs', label: 'عرض سجل النشاطات', group: 'audit' },
    // Dashboard
    { key: 'dashboard:view_executive_dashboard', label: 'عرض لوحة القيادة التنفيذية', group: 'dashboard' },
    { key: 'dashboard:view_company_profit', label: 'عرض أرباح الشركة', group: 'dashboard' },
    { key: 'dashboard:view_branch_profit', label: 'عرض أرباح الفرع', group: 'dashboard' },
    { key: 'dashboard:view_inventory_value', label: 'عرض قيمة المخزون', group: 'dashboard' },
    { key: 'dashboard:view_financial_summary', label: 'عرض الملخص المالي', group: 'dashboard' },
    // Legacy (keep for backward compat)
    { key: 'expense:view', label: 'عرض المصروفات', group: 'expense' },
    { key: 'expense:create', label: 'إضافة مصروف', group: 'expense' },
    { key: 'expense:edit', label: 'تعديل المصروفات', group: 'expense' },
    { key: 'expense:approve', label: 'اعتماد المصروفات', group: 'expense' },
    { key: 'expense:delete', label: 'حذف المصروفات', group: 'expense' },
    { key: 'expense:category:manage', label: 'إدارة تصنيفات المصروفات', group: 'expense' },
    { key: 'report:financial', label: 'التقارير المالية', group: 'report' },
    { key: 'report:export', label: 'تصدير التقارير', group: 'report' },
    { key: 'shift:open', label: 'فتح وردية', group: 'shift' },
    { key: 'shift:close', label: 'إغلاق وردية', group: 'shift' },
    { key: 'shift:approve', label: 'اعتماد الورديات', group: 'shift' },
    { key: 'cash_register:manage', label: 'إدارة الصندوق', group: 'finance' },
    { key: 'currency:exchange', label: 'تحويل العملات', group: 'finance' },
    { key: 'template:manage', label: 'إدارة قوالب الطباعة', group: 'settings' },
    { key: 'sale:cancel:review', label: 'مراجعة إلغاء الفواتير', group: 'sale' },
    { key: 'inventory:movement:view', label: 'عرض حركة المخزون', group: 'inventory' },
    { key: 'inventory:valuation:view', label: 'عرض تقييم المخزون', group: 'inventory' },
    { key: 'inventory:low_stock:view', label: 'عرض المنتجات المنخفضة', group: 'inventory' },
  ];

  const permissions = {};
  for (const p of permissionDefs) {
    permissions[p.key] = await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label },
      create: p,
    });
  }
  console.log(` الصلاحيات: ${Object.keys(permissions).length} صلاحية`);

  // ─── RBAC: Role-Permission Mappings ──────────────
  const rolePermMap = {
    super_admin: Object.keys(permissions),
    admin: [
      'field:view_product_cost', 'field:view_profit_margin', 'field:view_profit_amount', 'field:view_inventory_value', 'field:view_daily_profit', 'field:view_monthly_profit', 'field:view_safe_balance', 'field:view_financial_summary', 'field:view_customer_balance', 'field:view_supplier_balance', 'field:view_purchase_costs',
      'dashboard:view_executive_dashboard', 'dashboard:view_company_profit', 'dashboard:view_branch_profit', 'dashboard:view_inventory_value', 'dashboard:view_financial_summary',
      // Financial
      'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
      // Inventory
      'inventory:manage', 'inventory:adjustment', 'inventory:transfer', 'inventory:count', 'inventory:wastage',
      // Sales
      'sales:create', 'sales:edit', 'sales:cancel', 'sales:delete', 'sales:hold', 'sales:resume',
      // Returns
      'returns:create', 'returns:cancel', 'returns:delete',
      // Products
      'products:manage', 'products:manage_categories',
      // Business
      'business:manage_suppliers', 'business:manage_customers', 'business:manage_purchases', 'business:manage_expenses',
      // Administration
      'admin:manage_users', 'admin:manage_roles', 'admin:manage_permissions',
      // Reporting
      'reporting:view_reports', 'reporting:export_reports',
      // Audit
      'audit:view_logs',
      // Legacy
      'expense:view', 'expense:create', 'expense:edit', 'expense:approve', 'expense:delete', 'expense:category:manage',
      'report:financial', 'report:export',
      'shift:open', 'shift:close', 'shift:approve', 'cash_register:manage', 'currency:exchange',
      'template:manage', 'sale:cancel:review',
      'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
    ],
    manager: [
      'field:view_product_cost', 'field:view_profit_margin', 'field:view_profit_amount', 'field:view_inventory_value', 'field:view_daily_profit', 'field:view_monthly_profit', 'field:view_safe_balance', 'field:view_financial_summary', 'field:view_customer_balance', 'field:view_supplier_balance', 'field:view_purchase_costs',
      'dashboard:view_executive_dashboard', 'dashboard:view_company_profit', 'dashboard:view_branch_profit', 'dashboard:view_inventory_value', 'dashboard:view_financial_summary',
      'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
      'inventory:manage', 'inventory:adjustment', 'inventory:transfer', 'inventory:count', 'inventory:wastage',
      'sales:create', 'sales:edit', 'sales:cancel', 'sales:hold', 'sales:resume',
      'returns:create', 'returns:cancel',
      'products:manage', 'products:manage_categories',
      'business:manage_suppliers', 'business:manage_customers', 'business:manage_purchases', 'business:manage_expenses',
      'reporting:view_reports', 'reporting:export_reports',
      'expense:view', 'expense:create', 'expense:edit', 'expense:approve', 'expense:category:manage',
      'report:financial', 'report:export',
      'shift:open', 'shift:close', 'shift:approve', 'cash_register:manage', 'currency:exchange',
      'template:manage', 'sale:cancel:review',
      'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
    ],
    accountant: [
      'field:view_product_cost', 'field:view_profit_margin', 'field:view_profit_amount', 'field:view_inventory_value', 'field:view_daily_profit', 'field:view_monthly_profit', 'field:view_safe_balance', 'field:view_financial_summary', 'field:view_customer_balance', 'field:view_supplier_balance', 'field:view_purchase_costs',
      'dashboard:view_executive_dashboard', 'dashboard:view_company_profit', 'dashboard:view_financial_summary',
      'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
      'expense:view', 'expense:create',
      'report:financial', 'report:export',
      'reporting:view_reports', 'reporting:export_reports',
    ],
    inventory_manager: [
      'dashboard:view_executive_dashboard', 'dashboard:view_inventory_value',
      'inventory:manage', 'inventory:adjustment', 'inventory:transfer', 'inventory:count', 'inventory:wastage',
      'products:manage',
      'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
    ],
    cashier: [
      'sales:create', 'sales:cancel', 'sales:hold', 'sales:resume',
      'returns:create',
      'expense:view', 'shift:open', 'shift:close',
    ],
    auditor: [
      'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
      'reporting:view_reports', 'reporting:export_reports',
      'audit:view_logs',
      'report:financial', 'report:export',
      'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
    ],
  };

  let mappingCount = 0;
  for (const [roleName, perms] of Object.entries(rolePermMap)) {
    const roleId = roles[roleName]?.id;
    if (!roleId) continue;
    for (const permKey of perms) {
      const permId = permissions[permKey]?.id;
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: roleId, permission_id: permId } },
        update: {},
        create: { role_id: roleId, permission_id: permId },
      });
      mappingCount++;
    }
  }
  console.log(` تعيينات الصلاحيات: ${mappingCount} تعيين`);

  // ─── RBAC: Create expected seed users if missing ─
  const seedUsers = [
    { username: 'manager', name: 'مدير الفرع', role: 'manager' },
    { username: 'cashier', name: 'الكاشير', role: 'cashier' },
    { username: 'accountant', name: 'المحاسب', role: 'accountant' },
    { username: 'admin2', name: 'مدير النظام 2', role: 'admin' },
    { username: 'cashir', name: 'الكاشير (قديم)', role: 'cashier' },
    { username: 'account2', name: 'محاسب 2', role: 'accountant' },
  ];

  for (const u of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      await prisma.user.create({
        data: {
          branch_id: BRANCH_ID,
          name: u.name,
          username: u.username,
          password_hash: hash,
          role: u.role,
          role_id: roles[u.role]?.id,
          is_active: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { username: u.username },
        data: {
          password_hash: hash,
          role_id: roles[u.role]?.id,
          is_active: true,
        },
      });
    }
  }
  console.log(` المستخدمين: ${seedUsers.length} مستخدم`);

  // Link admin to admin role
  await prisma.user.update({
    where: { username: 'admin' },
    data: { role_id: roles.admin.id },
  });
  console.log(' ربط المستخدم admin بالدور admin');

  // ─── Done ──────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('   تم تجهيز بيانات البقالة بنجاح!      ');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('   المنتجات:  ', products.length);
  console.log('   التصنيفات: ', categoriesData.length);
  console.log('   العملاء:   ', customersData.length);
  console.log('   الموردين:  ', suppliersData.length);
  console.log('   الأرصدة:   ', initialStock.length);
  console.log('');
  console.log(' بيانات الدخول:');
  console.log('   username : admin      | password : admin123     | role: admin');
  console.log('   username : manager    | password : admin123     | role: manager');
  console.log('   username : cashier    | password : admin123     | role: cashier');
  console.log('   username : accountant | password : admin123     | role: accountant');
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
