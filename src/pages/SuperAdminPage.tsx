import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { Shield, Building2, Plus, Users, Loader2, Mail, KeyRound } from 'lucide-react';
import { CompanyCard } from '@/components/super-admin/CompanyCard';
import { SECTOR_LABELS, ALL_SECTORS, Sector } from '@/types/permissions';

interface CompanyRow {
  id: string;
  name: string;
  created_at: string;
}

interface MemberRow {
  user_id: string;
  role: string;
  profile_name: string;
  profile_email: string;
}

export default function SuperAdminPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyModules, setNewCompanyModules] = useState<Record<Sector, boolean>>(
    Object.fromEntries(ALL_SECTORS.map(s => [s, true])) as Record<Sector, boolean>
  );
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminCompanyId, setAdminCompanyId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMethod, setAdminMethod] = useState<'invite' | 'direct'>('direct');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyMembers, setCompanyMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [editModulesCompanyId, setEditModulesCompanyId] = useState<string | null>(null);
  const [editModules, setEditModules] = useState<Record<Sector, boolean>>(
    Object.fromEntries(ALL_SECTORS.map(s => [s, true])) as Record<Sector, boolean>
  );
  const [savingModules, setSavingModules] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    const { data } = await supabase.from('companies').select('id, name, created_at').order('created_at', { ascending: false });
    setCompanies(data ?? []);
    setLoadingCompanies(false);
  };

  useEffect(() => { loadCompanies(); }, []);

  const loadMembers = async (companyId: string) => {
    setLoadingMembers(true);
    const { data: memberships } = await supabase
      .from('company_memberships')
      .select('user_id, role')
      .eq('company_id', companyId);

    if (!memberships) { setCompanyMembers([]); setLoadingMembers(false); return; }

    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);

    const mapped: MemberRow[] = memberships.map(m => {
      const p = profiles?.find(pr => pr.user_id === m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        profile_name: p?.name ?? t.superAdmin.noName,
        profile_email: p?.email ?? '',
      };
    });
    setCompanyMembers(mapped);
    setLoadingMembers(false);
  };

  useEffect(() => {
    if (selectedCompanyId) loadMembers(selectedCompanyId);
  }, [selectedCompanyId]);

  const loadCompanyModules = async (companyId: string) => {
    const { data } = await supabase
      .from('company_modules')
      .select('module, is_enabled')
      .eq('company_id', companyId);

    const modules = Object.fromEntries(ALL_SECTORS.map(s => [s, true])) as Record<Sector, boolean>;
    if (data) {
      data.forEach((m: any) => {
        if (m.module in modules) {
          modules[m.module as Sector] = m.is_enabled;
        }
      });
    }
    setEditModules(modules);
    setEditModulesCompanyId(companyId);
  };

  const handleSaveModules = async () => {
    if (!editModulesCompanyId) return;
    setSavingModules(true);

    for (const sector of ALL_SECTORS) {
      const { data: existing } = await supabase
        .from('company_modules')
        .select('id')
        .eq('company_id', editModulesCompanyId)
        .eq('module', sector)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('company_modules')
          .update({ is_enabled: editModules[sector] })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('company_modules')
          .insert({
            company_id: editModulesCompanyId,
            module: sector as any,
            is_enabled: editModules[sector],
          });
      }
    }

    toast({ title: t.superAdmin.modulesUpdated });
    setSavingModules(false);
    setEditModulesCompanyId(null);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setCreatingCompany(true);
    const { data: company, error } = await supabase.from('companies').insert({ name: newCompanyName.trim() }).select('id').single();
    if (error || !company) {
      toast({ title: t.superAdmin.errorCreatingCompany, description: error?.message, variant: 'destructive' });
    } else {
      const moduleRows = ALL_SECTORS.map(sector => ({
        company_id: company.id,
        module: sector as any,
        is_enabled: newCompanyModules[sector],
      }));
      await supabase.from('company_modules').insert(moduleRows);

      toast({ title: t.superAdmin.companyCreated });
      setNewCompanyName('');
      setNewCompanyModules(Object.fromEntries(ALL_SECTORS.map(s => [s, true])) as Record<Sector, boolean>);
      setCompanyDialogOpen(false);
      loadCompanies();
    }
    setCreatingCompany(false);
  };

  const handleCreateAdmin = async () => {
    if (!adminCompanyId || !adminName.trim() || !adminEmail.trim()) return;
    if (adminMethod === 'direct' && (!adminPassword || adminPassword.length < 6)) {
      toast({ title: t.superAdmin.minPasswordChars, variant: 'destructive' });
      return;
    }
    setCreatingAdmin(true);

    const res = await supabase.functions.invoke('create-user', {
      body: {
        email: adminEmail.trim(),
        password: adminMethod === 'direct' ? adminPassword : undefined,
        name: adminName.trim(),
        company_id: adminCompanyId,
        role: 'admin',
        method: adminMethod,
      },
    });

    if (res.error) {
      toast({ title: t.superAdmin.errorCreatingAdmin, description: res.error.message, variant: 'destructive' });
    } else {
      toast({
        title: t.superAdmin.adminCreated,
        description: adminMethod === 'invite' ? t.superAdmin.inviteSentDesc : t.superAdmin.userCreatedDesc,
      });
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminDialogOpen(false);
      if (selectedCompanyId === adminCompanyId) loadMembers(adminCompanyId);
    }
    setCreatingAdmin(false);
  };

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title={t.superAdmin.restrictedAccess} description={t.superAdmin.restrictedDesc} icon={<Shield className="w-5 h-5 text-destructive" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.superAdmin.title}
        description={t.superAdmin.description}
        icon={<Shield className="w-5 h-5 text-primary" />}
      />

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies" className="gap-2"><Building2 className="w-4 h-4" /> {t.superAdmin.companiesTab}</TabsTrigger>
          <TabsTrigger value="admins" className="gap-2"><Users className="w-4 h-4" /> {t.superAdmin.membersTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> {t.superAdmin.registeredCompanies}
              </CardTitle>
              <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> {t.superAdmin.newCompany}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{t.superAdmin.createCompany}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t.superAdmin.companyName}</Label>
                      <Input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder={t.superAdmin.companyName} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.superAdmin.enabledModules}</Label>
                      <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg border-border">
                        {ALL_SECTORS.map(sector => (
                          <div key={sector} className="flex items-center justify-between">
                            <Label htmlFor={`new-mod-${sector}`} className="text-sm cursor-pointer">{SECTOR_LABELS[sector]}</Label>
                            <Switch
                              id={`new-mod-${sector}`}
                              checked={newCompanyModules[sector]}
                              onCheckedChange={v => setNewCompanyModules(prev => ({ ...prev, [sector]: v }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateCompany} disabled={creatingCompany} className="w-full">
                      {creatingCompany && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.superAdmin.createCompanyBtn}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingCompanies ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </div>
              ) : companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.superAdmin.noCompanies}</p>
              ) : (
                <div className="space-y-2">
                  {companies.map(c => (
                    <CompanyCard
                      key={c.id}
                      company={c}
                      companies={companies}
                      onModulesClick={loadCompanyModules}
                      onCompanyUpdated={loadCompanies}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!editModulesCompanyId} onOpenChange={v => { if (!v) setEditModulesCompanyId(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.superAdmin.manageModules}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {ALL_SECTORS.map(sector => (
                  <div key={sector} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <Label htmlFor={`edit-mod-${sector}`} className="text-sm cursor-pointer">{SECTOR_LABELS[sector]}</Label>
                    <Switch
                      id={`edit-mod-${sector}`}
                      checked={editModules[sector]}
                      onCheckedChange={v => setEditModules(prev => ({ ...prev, [sector]: v }))}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveModules} disabled={savingModules} className="w-full">
                {savingModules && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.superAdmin.saveModules}
              </Button>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> {t.superAdmin.membersByCompany}
              </CardTitle>
              <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> {t.superAdmin.newAdmin}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t.superAdmin.createAdmin}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t.superAdmin.companiesTab}</Label>
                      <Select value={adminCompanyId} onValueChange={setAdminCompanyId}>
                        <SelectTrigger><SelectValue placeholder={t.superAdmin.selectCompany} /></SelectTrigger>
                        <SelectContent>
                          {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.common.name}</Label>
                      <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder={t.superAdmin.fullName} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.common.email}</Label>
                      <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder={t.superAdmin.adminEmailPlaceholder} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.superAdmin.creationMethod}</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant={adminMethod === 'direct' ? 'default' : 'outline'} size="sm" onClick={() => setAdminMethod('direct')} className="flex-1">
                          <KeyRound className="w-4 h-4 mr-1" /> {t.superAdmin.directPassword}
                        </Button>
                        <Button type="button" variant={adminMethod === 'invite' ? 'default' : 'outline'} size="sm" onClick={() => setAdminMethod('invite')} className="flex-1">
                          <Mail className="w-4 h-4 mr-1" /> {t.superAdmin.emailInvite}
                        </Button>
                      </div>
                    </div>
                    {adminMethod === 'direct' && (
                      <div className="space-y-2">
                        <Label>{t.superAdmin.passwordLabel}</Label>
                        <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder={t.superAdmin.minPasswordChars} minLength={6} />
                      </div>
                    )}
                    <Button onClick={handleCreateAdmin} disabled={creatingAdmin} className="w-full">
                      {creatingAdmin && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.superAdmin.createAdminBtn}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="mb-4 max-w-sm">
                <Select value={selectedCompanyId ?? ''} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger><SelectValue placeholder={t.superAdmin.selectCompanyToView} /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCompanyId && (
                loadingMembers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.superAdmin.loadingMembers}
                  </div>
                ) : companyMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.superAdmin.noMembers}</p>
                ) : (
                  <div className="space-y-2">
                    {companyMembers.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between p-3 border rounded-lg border-border">
                        <div>
                          <p className="font-medium text-sm">{m.profile_name}</p>
                          <p className="text-xs text-muted-foreground">{m.profile_email}</p>
                        </div>
                        <Badge variant={m.role === 'super_admin' ? 'default' : m.role === 'admin' ? 'secondary' : 'outline'} className="text-xs">
                          {m.role === 'super_admin' ? 'Super Admin' : m.role === 'admin' ? 'Admin' : t.superAdmin.collaboratorRole}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
