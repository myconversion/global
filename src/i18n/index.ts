import ptBR, { type TranslationKeys } from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';

export type SupportedLanguage = 'pt-BR' | 'en' | 'es';

export const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const translations: Record<SupportedLanguage, TranslationKeys> = {
  'pt-BR': ptBR,
  en,
  es,
};

export function getTranslations(lang: SupportedLanguage): TranslationKeys {
  return translations[lang] ?? ptBR;
}

export const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/New_York', label: 'Massachusetts / New York (GMT-4)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
  { value: 'America/Denver', label: 'Denver (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' },
];

export const LOCALE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (Brasil) — dd/MM/yyyy' },
  { value: 'en-US', label: 'English (US) — MM/dd/yyyy' },
  { value: 'en-GB', label: 'English (UK) — dd/MM/yyyy' },
  { value: 'es-ES', label: 'Español (España) — dd/MM/yyyy' },
  { value: 'es-MX', label: 'Español (México) — dd/MM/yyyy' },
];

export type { TranslationKeys };
