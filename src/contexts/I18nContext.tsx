import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getTranslations, type SupportedLanguage, type TranslationKeys } from '@/i18n';

interface I18nContextType {
  language: SupportedLanguage;
  timezone: string;
  locale: string;
  t: TranslationKeys;
  setCompanyLanguage: (lang: SupportedLanguage) => Promise<void>;
  setCompanyTimezone: (tz: string) => Promise<void>;
  setCompanyLocale: (loc: string) => Promise<void>;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { currentCompany } = useAuth();
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [locale, setLocale] = useState('pt-BR');
  const [loading, setLoading] = useState(true);

  const companyId = currentCompany?.id;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('companies')
        .select('language, timezone, locale')
        .eq('id', companyId)
        .single();

      if (data) {
        setLanguage((data as any).language ?? 'pt-BR');
        setTimezone((data as any).timezone ?? 'America/Sao_Paulo');
        setLocale((data as any).locale ?? 'pt-BR');
      }
      setLoading(false);
    })();
  }, [companyId]);

  const updateCompanyField = useCallback(async (field: string, value: string) => {
    if (!companyId) return;
    await supabase
      .from('companies')
      .update({ [field]: value } as any)
      .eq('id', companyId);
  }, [companyId]);

  const setCompanyLanguage = useCallback(async (lang: SupportedLanguage) => {
    setLanguage(lang);
    await updateCompanyField('language', lang);
  }, [updateCompanyField]);

  const setCompanyTimezone = useCallback(async (tz: string) => {
    setTimezone(tz);
    await updateCompanyField('timezone', tz);
  }, [updateCompanyField]);

  const setCompanyLocale = useCallback(async (loc: string) => {
    setLocale(loc);
    await updateCompanyField('locale', loc);
  }, [updateCompanyField]);

  const t = getTranslations(language);

  return (
    <I18nContext.Provider value={{ language, timezone, locale, t, setCompanyLanguage, setCompanyTimezone, setCompanyLocale, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
