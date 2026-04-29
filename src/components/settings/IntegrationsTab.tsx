import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Mail, Webhook, Key, Plus, Trash2, Loader2, Save, Eye, EyeOff, Brain, Instagram, Facebook, Phone, Users, Globe, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useI18n } from '@/contexts/I18nContext';

interface IntegrationConfig {
  id?: string;
  type: string;
  name: string;
  config: Record<string, string>;
  is_active: boolean;
  access_type?: string;
}

interface CompanyMember {
  user_id: string;
  name: string;
  email: string;
}

const WHATSAPP_PROVIDERS = [
  { value: 'evolution', label: 'Evolution API' },
  { value: 'evolution2', label: 'Evolution API 2.0' },
  { value: 'zapi', label: 'Z-API' },
  { value: 'uazapi', label: 'UAZAPI' },
  { value: 'uzapi', label: 'Uzapi' },
  { value: 'uazapi_dev', label: 'uazapi.dev' },
  { value: 'wasender', label: 'WaSenderAPI' },
  { value: 'waha', label: 'Waha' },
  { value: 'baileys', label: 'Baileys' },
  { value: 'official', label: 'API Oficial Meta' },
];

const VOIP_PROVIDERS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'vonage', label: 'Vonage (Nexmo)' },
  { value: '3cx', label: '3CX' },
  { value: 'asterisk', label: 'Asterisk / FreePBX' },
  { value: 'justcall', label: 'JustCall' },
  { value: 'aircall', label: 'Aircall' },
];

const AI_PROVIDERS = [
  { type: 'ai_openai', label: 'OpenAI', icon: '🤖', description: 'GPT-4, GPT-3.5', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'gpt-4o', temperature: '0.7' } },
  { type: 'ai_gemini', label: 'Google Gemini', icon: '✨', description: 'Gemini Pro, Flash', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'gemini-2.5-flash', temperature: '0.7' } },
  { type: 'ai_anthropic', label: 'Anthropic', icon: '🧠', description: 'Claude 3.5, Claude 3', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'claude-sonnet-4-20250514', temperature: '0.7' } },
  { type: 'ai_groq', label: 'Groq', icon: '⚡', description: 'LLaMA, Mixtral', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'llama-3.3-70b-versatile', temperature: '0.7' } },
  { type: 'ai_cohere', label: 'Cohere', icon: '🔗', description: 'Command R+', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'command-r-plus', temperature: '0.7' } },
  { type: 'ai_mistral', label: 'Mistral AI', icon: '🌬️', description: 'Mistral Large, Medium, Small', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'mistral-large-latest', temperature: '0.7' } },
  { type: 'ai_deepseek', label: 'DeepSeek', icon: '🔍', description: 'DeepSeek V3, Coder', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'deepseek-chat', temperature: '0.7' } },
  { type: 'ai_openrouter', label: 'OpenRouter', icon: '🌐', description: 'Multi-model API', fields: { api_key: 'API Key', model: 'Model', temperature: 'Temperature' }, defaults: { model: 'openai/gpt-4o', temperature: '0.7' } },
];

export default function IntegrationsTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [integrationAccess, setIntegrationAccess] = useState<Record<string, string[]>>({});
  const [localAccessType, setLocalAccessType] = useState<Record<string, string>>({});
  const [localSelectedUsers, setLocalSelectedUsers] = useState<Record<string, string[]>>({});
  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const loadMembers = useCallback(async () => {
    if (!companyId) return;
    const { data: memberships } = await supabase
      .from('company_memberships')
      .select('user_id')
      .eq('company_id', companyId);
    if (!memberships || memberships.length === 0) return;

    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);
    if (profiles) {
      setCompanyMembers(profiles as CompanyMember[]);
    }
  }, [companyId]);

  const loadConfigs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('company_id', companyId);
    if (data) {
      const mapped = data.map((d: any) => ({
        id: d.id,
        type: d.type,
        name: d.name,
        config: d.config as Record<string, string>,
        is_active: d.is_active,
        access_type: d.access_type || 'company_wide',
      }));
      setConfigs(mapped);

      const accessTypes: Record<string, string> = {};
      mapped.forEach(c => {
        if (c.id) accessTypes[c.id] = c.access_type || 'company_wide';
      });
      setLocalAccessType(accessTypes);

      const configIds = mapped.filter(c => c.id).map(c => c.id!);
      if (configIds.length > 0) {
        const { data: accessData } = await supabase
          .from('integration_user_access')
          .select('integration_id, user_id')
          .in('integration_id', configIds);
        if (accessData) {
          const accessMap: Record<string, string[]> = {};
          const localSelected: Record<string, string[]> = {};
          accessData.forEach((a: any) => {
            if (!accessMap[a.integration_id]) accessMap[a.integration_id] = [];
            accessMap[a.integration_id].push(a.user_id);
          });
          setIntegrationAccess(accessMap);
          Object.entries(accessMap).forEach(([integId, userIds]) => {
            localSelected[integId] = [...userIds];
          });
          setLocalSelectedUsers(prev => ({ ...prev, ...localSelected }));
        }
      }
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadConfigs(); loadMembers(); }, [loadConfigs, loadMembers]);

  const toggleSecret = (key: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const saveConfig = async (config: IntegrationConfig) => {
    if (!companyId) return;
    setSaving(config.id || config.type);
    const configKey = config.id || config.type;
    const accessType = localAccessType[configKey] || 'company_wide';
    try {
      let integrationId = config.id;
      if (config.id) {
        const { error } = await supabase
          .from('integration_configs')
          .update({ name: config.name, config: config.config, is_active: config.is_active, access_type: accessType, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('integration_configs')
          .insert({ company_id: companyId, type: config.type, name: config.name, config: config.config, is_active: config.is_active, access_type: accessType, created_by: (await supabase.auth.getUser()).data.user?.id })
          .select('id')
          .single();
        if (error) throw error;
        integrationId = inserted?.id;
      }

      if (integrationId && accessType === 'restricted') {
        const selectedUsers = localSelectedUsers[configKey] || [];
        await supabase
          .from('integration_user_access')
          .delete()
          .eq('integration_id', integrationId);
        if (selectedUsers.length > 0) {
          const rows = selectedUsers.map(userId => ({
            integration_id: integrationId!,
            user_id: userId,
            company_id: companyId,
          }));
          const { error: insertErr } = await supabase
            .from('integration_user_access')
            .insert(rows);
          if (insertErr) throw insertErr;
        }
      } else if (integrationId && accessType === 'company_wide') {
        await supabase
          .from('integration_user_access')
          .delete()
          .eq('integration_id', integrationId);
      }

      toast({ title: t.settingsIntegrations.savedSuccess });
      await loadConfigs();
    } catch (err: any) {
      toast({ title: t.settingsIntegrations.errorSaving, description: err.message, variant: 'destructive' });
    }
    setSaving(null);
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from('integration_configs').delete().eq('id', id);
    if (error) {
      toast({ title: t.settingsIntegrations.errorRemoving, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.settingsIntegrations.removed });
      await loadConfigs();
    }
  };

  const addNew = (type: string) => {
    const defaults: Record<string, IntegrationConfig> = {
      whatsapp: { type: 'whatsapp', name: 'WhatsApp', config: { provider: 'evolution', api_url: '', api_key: '', instance: '' }, is_active: false, access_type: 'company_wide' },
      email_smtp: { type: 'email_smtp', name: 'E-mail SMTP', config: { host: '', port: '587', user: '', password: '', from_email: '', from_name: '', encryption: 'tls' }, is_active: false, access_type: 'company_wide' },
      email_resend: { type: 'email_resend', name: 'Resend', config: { api_key: '', from_domain: '', from_email: '', from_name: '' }, is_active: false, access_type: 'company_wide' },
      webhook: { type: 'webhook', name: 'Webhook', config: { url: '', secret: '', events: 'all' }, is_active: false, access_type: 'company_wide' },
      api_key: { type: 'api_key', name: 'API', config: { service_name: '', api_key: '', base_url: '' }, is_active: false, access_type: 'company_wide' },
      instagram_direct: { type: 'instagram_direct', name: 'Instagram Direct', config: { page_access_token: '', instagram_business_id: '' }, is_active: false, access_type: 'company_wide' },
      facebook_messenger: { type: 'facebook_messenger', name: 'Facebook Messenger', config: { page_access_token: '', page_id: '', verify_token: '' }, is_active: false, access_type: 'company_wide' },
      voip: { type: 'voip', name: 'VoIP', config: { provider: 'twilio', api_url: '', api_key: '', auth_token: '', caller_id: '', enable_recording: 'true', webhook_url: '' }, is_active: false, access_type: 'company_wide' },
    };

    const aiProvider = AI_PROVIDERS.find(p => p.type === type);
    if (aiProvider) {
      const newConfig: IntegrationConfig = {
        type: aiProvider.type,
        name: aiProvider.label,
        config: { api_key: '', ...aiProvider.defaults },
        is_active: false,
        access_type: 'company_wide',
      };
      setConfigs(prev => [...prev, newConfig]);
      setLocalAccessType(prev => ({ ...prev, [aiProvider.type]: 'company_wide' }));
      return;
    }

    if (defaults[type]) {
      setConfigs(prev => [...prev, defaults[type]]);
      setLocalAccessType(prev => ({ ...prev, [type]: 'company_wide' }));
    }
  };

  const updateConfigField = (index: number, field: string, value: string) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, config: { ...c.config, [field]: value } } : c));
  };

  const updateConfigName = (index: number, name: string) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, name } : c));
  };

  const toggleActive = (index: number) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, is_active: !c.is_active } : c));
  };

  const handleAccessTypeChange = (configKey: string, value: string) => {
    setLocalAccessType(prev => ({ ...prev, [configKey]: value }));
  };

  const handleToggleUser = (configKey: string, userId: string) => {
    setLocalSelectedUsers(prev => {
      const current = prev[configKey] || [];
      const exists = current.includes(userId);
      return {
        ...prev,
        [configKey]: exists ? current.filter(id => id !== userId) : [...current, userId],
      };
    });
  };

  const handleRemoveUser = (configKey: string, userId: string) => {
    setLocalSelectedUsers(prev => ({
      ...prev,
      [configKey]: (prev[configKey] || []).filter(id => id !== userId),
    }));
  };

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">{t.settingsIntegrations.adminOnly}</p>;
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> {t.settingsIntegrations.loadingIntegrations}</div>;
  }

  const renderSecretInput = (index: number, field: string, label: string, placeholder: string) => {
    const key = `${index}-${field}`;
    const isVisible = visibleSecrets.has(key);
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="relative">
          <Input
            type={isVisible ? 'text' : 'password'}
            value={configs[index].config[field] || ''}
            onChange={e => updateConfigField(index, field, e.target.value)}
            placeholder={placeholder}
            className="pr-10"
          />
          <button type="button" onClick={() => toggleSecret(key)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  const renderTextInput = (index: number, field: string, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={configs[index].config[field] || ''}
        onChange={e => updateConfigField(index, field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const renderAccessControl = (config: IntegrationConfig, index: number) => {
    const configKey = config.id || config.type;
    const accessType = localAccessType[configKey] || 'company_wide';
    const selectedUsers = localSelectedUsers[configKey] || [];

    return (
      <div className="mt-4 pt-4 border-t border-border space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> {t.settingsIntegrations.accessControl}
        </Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleAccessTypeChange(configKey, 'company_wide')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
              accessType === 'company_wide'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {t.settingsIntegrations.companyWide}
          </button>
          <button
            type="button"
            onClick={() => handleAccessTypeChange(configKey, 'restricted')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
              accessType === 'restricted'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {t.settingsIntegrations.restrictedUsers}
          </button>
        </div>

        {accessType === 'restricted' && (
          <div className="space-y-2">
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map(userId => {
                  const member = companyMembers.find(m => m.user_id === userId);
                  if (!member) return null;
                  return (
                    <Badge key={userId} variant="secondary" className="text-xs gap-1 pr-1">
                      {member.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(configKey, userId)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {companyMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">{t.settingsIntegrations.noMembersFound}</p>
              ) : (
                companyMembers.map(member => {
                  const isSelected = selectedUsers.includes(member.user_id);
                  return (
                    <label
                      key={member.user_id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleUser(configKey, member.user_id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConfigCard = (config: IntegrationConfig, index: number) => {
    const isSaving = saving === (config.id || config.type);
    return (
      <Card key={config.id || `new-${index}`} className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input
                value={config.name}
                onChange={e => updateConfigName(index, e.target.value)}
                className="font-medium h-8 w-48"
              />
              <Badge variant={config.is_active ? 'default' : 'secondary'} className="text-xs">
                {config.is_active ? t.settingsIntegrations.activeLabel : t.settingsIntegrations.inactiveLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={config.is_active} onCheckedChange={() => toggleActive(index)} />
              {config.id ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteConfig(config.id!)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfigs(prev => prev.filter((_, i) => i !== index))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.type === 'whatsapp' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.settingsIntegrations.providerLabel}</Label>
                <Select value={config.config.provider || 'evolution'} onValueChange={v => updateConfigField(index, 'provider', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WHATSAPP_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {renderTextInput(index, 'api_url', 'URL API', 'https://api.example.com')}
              {renderSecretInput(index, 'api_key', 'API Key', 'Your API key')}
              {renderTextInput(index, 'instance', 'Instance', 'Instance name')}
            </>
          )}
          {config.type === 'email_smtp' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {renderTextInput(index, 'host', 'Host SMTP', 'smtp.gmail.com')}
                {renderTextInput(index, 'port', 'Port', '587')}
              </div>
              {renderTextInput(index, 'user', 'User', 'your@email.com')}
              {renderSecretInput(index, 'password', 'Password', 'Email password')}
              <div className="grid grid-cols-2 gap-3">
                {renderTextInput(index, 'from_email', 'From Email', 'noreply@company.com')}
                {renderTextInput(index, 'from_name', 'From Name', 'My Company')}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.settingsIntegrations.encryptionLabel}</Label>
                <Select value={config.config.encryption || 'tls'} onValueChange={v => updateConfigField(index, 'encryption', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">{t.settingsIntegrations.noneEncryption}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {config.type === 'email_resend' && (
            <>
              {renderSecretInput(index, 'api_key', 'API Key (Resend)', 're_xxxxxxxxxxxx')}
              {renderTextInput(index, 'from_domain', 'Domain', 'company.com')}
              <div className="grid grid-cols-2 gap-3">
                {renderTextInput(index, 'from_email', 'From Email', 'noreply@company.com')}
                {renderTextInput(index, 'from_name', 'From Name', 'My Company')}
              </div>
            </>
          )}
          {config.type === 'instagram_direct' && (
            <>
              {renderSecretInput(index, 'page_access_token', 'Page Access Token', 'Page access token')}
              {renderTextInput(index, 'instagram_business_id', 'Instagram Business Account ID', 'Business account ID')}
            </>
          )}
          {config.type === 'facebook_messenger' && (
            <>
              {renderSecretInput(index, 'page_access_token', 'Page Access Token', 'Page access token')}
              {renderTextInput(index, 'page_id', 'Page ID', 'Facebook page ID')}
              {renderSecretInput(index, 'verify_token', 'Verify Token (Webhook)', 'Verification token')}
            </>
          )}
          {config.type === 'webhook' && (
            <>
              {renderTextInput(index, 'url', 'Webhook URL', 'https://n8n.example.com/webhook/xxx')}
              {renderSecretInput(index, 'secret', 'Secret', 'Auth token')}
              <div className="space-y-1.5">
                <Label className="text-xs">{t.settingsIntegrations.eventsLabel}</Label>
                <Select value={config.config.events || 'all'} onValueChange={v => updateConfigField(index, 'events', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.settingsIntegrations.allEvents}</SelectItem>
                    <SelectItem value="crm">CRM</SelectItem>
                    <SelectItem value="projects">{t.sectors.projects}</SelectItem>
                    <SelectItem value="financial">{t.sectors.financial}</SelectItem>
                    <SelectItem value="clients">{t.clients.title || 'Clients'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {config.type === 'api_key' && (
            <>
              {renderTextInput(index, 'service_name', 'Service Name', 'E.g.: OpenAI, Stripe...')}
              {renderSecretInput(index, 'api_key', 'API Key', 'API Key')}
              {renderTextInput(index, 'base_url', 'Base URL', 'https://api.service.com')}
            </>
          )}
          {config.type === 'voip' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.settingsIntegrations.providerLabel}</Label>
                <Select value={config.config.provider || 'twilio'} onValueChange={v => updateConfigField(index, 'provider', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOIP_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {renderTextInput(index, 'api_url', 'API URL / SIP Server', 'https://api.twilio.com')}
              {renderSecretInput(index, 'api_key', 'API Key / Account SID', 'Your API key')}
              {renderSecretInput(index, 'auth_token', 'Auth Token / Secret', 'Auth token')}
              {renderTextInput(index, 'caller_id', 'Caller ID', '+15551234567')}
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.config.enable_recording === 'true'}
                  onCheckedChange={v => updateConfigField(index, 'enable_recording', v ? 'true' : 'false')}
                />
                <Label className="text-xs">{t.settingsIntegrations.enableRecording}</Label>
              </div>
              {renderTextInput(index, 'webhook_url', 'Event Webhook', 'https://example.com/webhook/voip')}
            </>
          )}
          {config.type.startsWith('ai_') && (
            <>
              {renderSecretInput(index, 'api_key', 'API Key', 'Your API key')}
              {renderTextInput(index, 'model', 'Model', 'E.g.: gpt-4o')}
              {renderTextInput(index, 'temperature', 'Temperature (0-1)', '0.7')}
            </>
          )}

          {renderAccessControl(config, index)}

          <Button onClick={() => saveConfig(config)} disabled={isSaving} size="sm" className="mt-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t.settingsIntegrations.saveBtn}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const whatsappConfigs = configs.filter(c => c.type === 'whatsapp');
  const emailConfigs = configs.filter(c => c.type === 'email_smtp' || c.type === 'email_resend');
  const instagramConfigs = configs.filter(c => c.type === 'instagram_direct');
  const facebookConfigs = configs.filter(c => c.type === 'facebook_messenger');
  const webhookConfigs = configs.filter(c => c.type === 'webhook');
  const apiConfigs = configs.filter(c => c.type === 'api_key');
  const voipConfigs = configs.filter(c => c.type === 'voip');
  const aiConfigs = configs.filter(c => c.type.startsWith('ai_'));

  return (
    <Tabs defaultValue="whatsapp" className="space-y-4">
      <ScrollArea className="w-full">
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> E-mail</TabsTrigger>
          <TabsTrigger value="instagram" className="gap-1.5 text-xs"><Instagram className="w-3.5 h-3.5" /> Instagram</TabsTrigger>
          <TabsTrigger value="facebook" className="gap-1.5 text-xs"><Facebook className="w-3.5 h-3.5" /> Messenger</TabsTrigger>
          <TabsTrigger value="voip" className="gap-1.5 text-xs"><Phone className="w-3.5 h-3.5" /> VoIP</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5 text-xs"><Webhook className="w-3.5 h-3.5" /> Webhooks</TabsTrigger>
          <TabsTrigger value="apis" className="gap-1.5 text-xs"><Key className="w-3.5 h-3.5" /> APIs</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs"><Brain className="w-3.5 h-3.5" /> AI</TabsTrigger>
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TabsContent value="whatsapp" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-green-500" /> WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('whatsapp')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addWhatsApp}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="email" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-blue-500" /> E-mail SMTP/IMAP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailConfigs.filter(c => c.type === 'email_smtp').map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('email_smtp')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addSMTP}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-violet-500" /> Resend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailConfigs.filter(c => c.type === 'email_resend').map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('email_resend')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addResend}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="instagram" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500" /> Instagram Direct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instagramConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('instagram_direct')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addInstagram}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="facebook" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> Facebook Messenger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {facebookConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('facebook_messenger')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addMessenger}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="voip" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-500" /> VoIP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {voipConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('voip')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addVoIP}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="webhooks" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Webhook className="w-4 h-4 text-orange-500" /> Webhooks / n8n</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhookConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('webhook')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addWebhook}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="apis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Key className="w-4 h-4 text-purple-500" /> APIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <Button variant="outline" size="sm" onClick={() => addNew('api_key')}><Plus className="w-4 h-4 mr-2" /> {t.settingsIntegrations.addAPI}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiConfigs.map((c) => renderConfigCard(c, configs.indexOf(c)))}
            <div className="flex flex-wrap gap-2">
              {AI_PROVIDERS.map(p => {
                const exists = aiConfigs.some(c => c.type === p.type);
                return (
                  <Button key={p.type} variant="outline" size="sm" onClick={() => addNew(p.type)} disabled={exists}>
                    <Plus className="w-4 h-4 mr-1" /> {p.icon} {p.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
