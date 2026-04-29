import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { LANGUAGE_OPTIONS, TIMEZONE_OPTIONS, LOCALE_OPTIONS, type SupportedLanguage } from '@/i18n';

interface CompanyData {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
}

export default function CompanyTab() {
  const { currentCompany, role } = useAuth();
  const { t, language, timezone, locale, setCompanyLanguage, setCompanyTimezone, setCompanyLocale } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [localLang, setLocalLang] = useState(language);
  const [localTz, setLocalTz] = useState(timezone);
  const [localLoc, setLocalLoc] = useState(locale);
  const [data, setData] = useState<CompanyData>({
    name: '', cnpj: '', email: '', phone: '', address: '', logo_url: '',
  });

  const isAdmin = role === 'admin' || role === 'super_admin';
  const companyId = currentCompany?.id;
  const tc = t.settings.company;

  // Sync local locale state with context
  useEffect(() => { setLocalLang(language); }, [language]);
  useEffect(() => { setLocalTz(timezone); }, [timezone]);
  useEffect(() => { setLocalLoc(locale); }, [locale]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const { data: company } = await supabase
        .from('companies')
        .select('name, cnpj, email, phone, address, logo_url')
        .eq('id', companyId)
        .single();

      if (company) {
        setData({
          name: company.name ?? '',
          cnpj: company.cnpj ?? '',
          email: company.email ?? '',
          phone: company.phone ?? '',
          address: company.address ?? '',
          logo_url: company.logo_url ?? '',
        });
      }
      setLoading(false);
    })();
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    const { error } = await supabase
      .from('companies')
      .update({
        name: data.name.trim(),
        cnpj: data.cnpj.trim() || null,
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        address: data.address.trim() || null,
        logo_url: data.logo_url.trim() || null,
      })
      .eq('id', companyId);

    if (error) {
      toast({ title: tc.saveError, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: tc.savedSuccess });
    }
    setSaving(false);
  };

  const update = (field: keyof CompanyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {tc.loading}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {tc.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isAdmin ? (
            <p className="text-sm text-muted-foreground">{tc.adminOnly}</p>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {/* Logo */}
              <div className="space-y-2">
                <Label>{tc.logoUrl}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t.placeholders.logoUrl}
                    value={data.logo_url}
                    onChange={e => update('logo_url', e.target.value)}
                  />
                  {data.logo_url && (
                    <div className="h-10 w-10 rounded border border-border overflow-hidden flex-shrink-0">
                      <img src={data.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name + CNPJ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc.name} *</Label>
                  <Input
                    value={data.name}
                    onChange={e => update('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc.cnpj}</Label>
                  <Input
                    value={data.cnpj}
                    onChange={e => update('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc.email}</Label>
                  <Input
                    type="email"
                    value={data.email}
                    onChange={e => update('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc.phone}</Label>
                  <Input
                    value={data.phone}
                    onChange={e => update('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>{tc.address}</Label>
                <Textarea
                  value={data.address}
                  onChange={e => update('address', e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={handleSave} disabled={saving || !data.name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {tc.save}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Localization Card */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              {tc.localization}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">{tc.localizationDesc}</p>
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{tc.language}</Label>
                  <Select value={localLang} onValueChange={(v) => setLocalLang(v as SupportedLanguage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{tc.timezone}</Label>
                  <Select value={localTz} onValueChange={setLocalTz}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{tc.locale}</Label>
                  <Select value={localLoc} onValueChange={setLocalLoc}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCALE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={async () => {
                  setSavingLocale(true);
                  await Promise.all([
                    setCompanyLanguage(localLang),
                    setCompanyTimezone(localTz),
                    setCompanyLocale(localLoc),
                  ]);
                  toast({ title: tc.savedSuccess });
                  setSavingLocale(false);
                }}
                disabled={savingLocale || (localLang === language && localTz === timezone && localLoc === locale)}
              >
                {savingLocale ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {tc.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
