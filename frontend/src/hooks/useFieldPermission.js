import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../utils/permissions';

export function useFieldPermission() {
  const user = useAuthStore((s) => s.user);

  return {
    canViewProductCost: () => hasPermission(user, 'field:view_product_cost'),
    canViewProfitMargin: () => hasPermission(user, 'field:view_profit_margin'),
    canViewProfitAmount: () => hasPermission(user, 'field:view_profit_amount'),
    canViewInventoryValue: () => hasPermission(user, 'field:view_inventory_value'),
    canViewDailyProfit: () => hasPermission(user, 'field:view_daily_profit'),
    canViewMonthlyProfit: () => hasPermission(user, 'field:view_monthly_profit'),
    canViewSafeBalance: () => hasPermission(user, 'field:view_safe_balance'),
    canViewFinancialSummary: () => hasPermission(user, 'field:view_financial_summary'),
    canViewCustomerBalance: () => hasPermission(user, 'field:view_customer_balance'),
    canViewSupplierBalance: () => hasPermission(user, 'field:view_supplier_balance'),
    canViewPurchaseCosts: () => hasPermission(user, 'field:view_purchase_costs'),
  };
}
