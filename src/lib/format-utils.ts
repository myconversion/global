import type { SupportedLanguage } from '@/i18n';

/**
 * Returns the currency code based on language.
 * EN → USD, PT-BR/ES → BRL
 */
export function getCurrencyCode(language: SupportedLanguage): string {
  return language === 'en' ? 'USD' : 'BRL';
}

/**
 * Returns the currency symbol based on language.
 * EN → U$, PT-BR/ES → R$
 */
export function getCurrencySymbol(language: SupportedLanguage): string {
  return language === 'en' ? 'U$' : 'R$';
}

/**
 * Full currency formatting using Intl.NumberFormat.
 */
export function formatCurrency(value: number, language: SupportedLanguage): string {
  const locale = language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US';
  const currency = getCurrencyCode(language);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Compact currency for dashboards (e.g. "U$ 12k" or "R$ 12k").
 */
export function formatCurrencyCompact(value: number, language: SupportedLanguage): string {
  const sym = getCurrencySymbol(language);
  if (Math.abs(value) >= 1000) return `${sym} ${(value / 1000).toFixed(0)}k`;
  const locale = language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US';
  return `${sym} ${value.toLocaleString(locale)}`;
}

/**
 * Date format string for date-fns `format()`.
 * EN → MM/dd/yyyy, PT-BR/ES → dd/MM/yyyy
 */
export function getDateFormatPattern(language: SupportedLanguage): string {
  return language === 'en' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
}

/**
 * Short date format for tables with month name.
 * EN → MMM dd, yyyy  PT-BR/ES → dd MMM yyyy
 */
export function getDateFormatShort(language: SupportedLanguage): string {
  return language === 'en' ? 'MMM dd, yyyy' : 'dd MMM yyyy';
}
