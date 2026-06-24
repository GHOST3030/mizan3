export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString();
};

export const formatCurrencyFixed = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
