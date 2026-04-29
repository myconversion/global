import type { SupportedLanguage } from '@/i18n';

export function formatCurrency(value: number, language: SupportedLanguage = 'pt-BR') {
  const locale = language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US';
  const currency = language === 'en' ? 'USD' : 'BRL';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}
