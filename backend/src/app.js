import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { errorLogger } from './middleware/errorLogger.js';
import { apiLimiter, loginLimiter } from './middleware/rateLimit.js';
import { auditMeta } from './middleware/auditMeta.js';

// Routes
import coreRoutes from './modules/core/core.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import currenciesRoutes from './modules/core/currencies.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import categoriesRoutes from './modules/products/categories.routes.js';
import unitsRoutes from './modules/products/units.routes.js';
import brandsRoutes from './modules/products/brands.routes.js';
import productUnitsRoutes from './modules/products/product-units.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import purchasesRoutes from './modules/purchases/purchases.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import numberSequenceRoutes from './modules/core/number-sequence.routes.js';
import safeRoutes from './modules/safe/safe.routes.js';
import printTemplateRoutes from './modules/core/print-template.routes.js';
import permissionsRoutes from './modules/permissions/permissions.routes.js';
import executiveDashboardRoutes from './modules/executive-dashboard/executive-dashboard.routes.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(auditMeta);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'Mizan POS', version: '1.0.0' });
});

// API Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);
app.use('/api/core', coreRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/currencies', currenciesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/product-units', productUnitsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/number-sequences', numberSequenceRoutes);
app.use('/api/safe', safeRoutes);
app.use('/api/print-templates', printTemplateRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/executive-dashboard', executiveDashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error logger (logs 500 errors to DB)
app.use(errorLogger);

// Global error handler
app.use(errorHandler);

export default app;