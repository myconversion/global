import { ptBR } from 'date-fns/locale/pt-BR';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import type { SupportedLanguage } from '@/i18n';

export function getDateLocale(lang: SupportedLanguage) {
  switch (lang) {
    case 'pt-BR': return ptBR;
    case 'es': return es;
    default: return enUS;
  }
}

export function getDateFnsLocaleString(lang: SupportedLanguage) {
  switch (lang) {
    case 'pt-BR': return 'pt-BR';
    case 'es': return 'es';
    default: return 'en-US';
  }
}
