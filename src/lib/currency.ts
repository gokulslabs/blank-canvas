/**
 * Currency Utility
 * Supports multiple currencies for multi-currency accounting.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'AUD' | 'CAD' | 'JPY';

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; symbol: string }> = {
  INR: { locale: 'en-IN', symbol: '₹' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
  AED: { locale: 'ar-AE', symbol: 'د.إ' },
  SGD: { locale: 'en-SG', symbol: 'S$' },
  AUD: { locale: 'en-AU', symbol: 'A$' },
  CAD: { locale: 'en-CA', symbol: 'C$' },
  JPY: { locale: 'ja-JP', symbol: '¥' },
};

export const ALL_CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (د.إ)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
];

export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_CONFIG[currency]?.symbol || currency;
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
}
