/**
 * Currency Utility
 * 
 * Formats monetary values based on organization currency.
 * No conversion — display only.
 */

export type CurrencyCode = 'INR' | 'USD';

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; symbol: string }> = {
  INR: { locale: 'en-IN', symbol: '₹' },
  USD: { locale: 'en-US', symbol: '$' },
};

/**
 * Format a number as currency.
 * @param amount - The numeric amount
 * @param currency - Currency code (default: INR)
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
