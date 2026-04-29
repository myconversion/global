import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Building2, Plug, Loader2, Users, UserCog, Columns3, HardDrive, Target, Store } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_SECTORS, type Sector, type SectorPermission } from '@/types/permissions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import IntegrationsTab from '@/components/settings/IntegrationsTab';
import CompanyTab from '@/components/settings/CompanyTab';
import TeamsTab from '@/components/settings/TeamsTab';
import RolesTab from '@/components/settings/RolesTab';
import CustomFieldsTab from '@/components/settings/CustomFieldsTab';
import BackupRestoreTab from '@/components/settings/BackupRestoreTab';
import CRMCadenceTab from '@/components/settings/CRMCadenceTab';
import BusinessUnitsTab from '@/components/settings/BusinessUnitsTab';

interface MemberOption {
  userId: string;
  name: string;
  email: string;
  role: string;
}

function defaultPermissions(): Record<Sector, SectorPermission> {
  const map = {} as Record<Sector, SectorPermission>;
  ALL_SECTORS.forEach(s => {
    map[s] = { sector: s, can_view: false, can_create: false, can_edit: false, can_delete: false };
  });
  return map;
}

export default function SettingsPage() {
  const { currentCompany, role } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<Sector, SectorPermission>>(defaultPermissions());
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const ts = t.settings;
  const tp = ts.permissions;

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoadingMembers(true);
      const { data: membershipData } = await supabase
        .from('company_memberships')
        .select('user_id, role')
        .eq('company_id', companyId);
      if (!membershipData) { setLoadingMembers(false); return; }
      const userIds = membershipData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);
      const mapped: MemberOption[] = membershipData.map(m => {
        const prof = profiles?.find(p => p.user_id === m.user_id);
        return { userId: m.user_id, name: prof?.name ?? t.userManagement.noName, email: prof?.email ?? '', role: m.role };
      });
      setMembers(mapped);
      setLoadingMembers(false);
    })();
  }, [companyId]);

  const loadPermissions = useCallback(async (userId: string) => {
    if (!companyId) return;
    setLoadingPerms(true);
    const { data } = await supabase
      .from('user_sector_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId);
    const perms = defaultPermissions();
    if (data) {
      data.forEach((row: any) => {
        const sector = row.sector as Sector;
        if (perms[sector]) {
          perms[sector] = { sector, can_view: row.can_view, can_create: row.can_create, can_edit: row.can_edit, can_delete: row.can_delete };
        }
      });
    }
    setPermissions(perms);
    setLoadingPerms(false);
  }, [companyId]);

  useEffect(() => {
    if (selectedUserId) loadPermissions(selectedUserId);
  }, [selectedUserId, loadPermissions]);

  const togglePermission = (sector: Sector, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setPermissions(prev => ({ ...prev, [sector]: { ...prev[sector], [action]: !prev[sector][action] } }));
  };

  const handleSave = async () => {
    if (!selectedUserId || !companyId) return;
    setSaving(true);
    await supabase.from('user_sector_permissions').delete().eq('user_id', selectedUserId).eq('company_id', companyId);
    const rows = ALL_SECTORS
      .filter(s => permissions[s].can_view || permissions[s].can_create || permissions[s].can_edit || permissions[s].can_delete)
      .map(s => ({ user_id: selectedUserId, company_id: companyId, sector: s, can_view: permissions[s].can_view, can_create: permissions[s].can_create, can_edit: permissions[s].can_edit, can_delete: permissions[s].can_delete }));
    if (rows.length > 0) {
      const { error } = await supabase.from('user_sector_permissions').insert(rows);
      if (error) { toast({ title: tp.saveError, description: error.message, variant: 'destructive' }); setSaving(false); return; }
    }
    toast({ title: tp.savedSuccess });
    setSaving(false);
  };

  const selectedMember = members.find(m => m.userId === selectedUserId);

  return (
    <div>
      <PageHeader
        title={ts.title}
        description={ts.description}
        icon={<Settings className="w-5 h-5 text-primary" />}
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" /> {ts.tabs.general}</TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> {ts.tabs.teams}</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs"><UserCog className="w-3.5 h-3.5" /> {ts.tabs.roles}</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" /> {ts.tabs.users}</TabsTrigger>
          <TabsTrigger value="custom-fields" className="gap-1.5 text-xs"><Columns3 className="w-3.5 h-3.5" /> {ts.tabs.customFields}</TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 text-xs"><HardDrive className="w-3.5 h-3.5" /> {ts.tabs.backup}</TabsTrigger>
          <TabsTrigger value="crm" className="gap-1.5 text-xs"><Target className="w-3.5 h-3.5" /> {ts.tabs.crm}</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-xs"><Plug className="w-3.5 h-3.5" /> {ts.tabs.integrations}</TabsTrigger>
          <TabsTrigger value="business-units" className="gap-1.5 text-xs"><Store className="w-3.5 h-3.5" /> {ts.tabs.businessUnits}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <CompanyTab />
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> {ts.teams.title}
              </CardTitle>
            </CardHeader>
            <CardContent><TeamsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" /> {ts.roles.title}
              </CardTitle>
            </CardHeader>
            <CardContent><RolesTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> {tp.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <p className="text-sm text-muted-foreground">{tp.adminOnly}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">{tp.description}</p>
                  <div className="mb-6 max-w-sm">
                    {loadingMembers ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {tp.loadingMembers}</div>
                    ) : (
                      <Select value={selectedUserId ?? ''} onValueChange={setSelectedUserId}>
                        <SelectTrigger><SelectValue placeholder={tp.selectUser} /></SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.userId} value={m.userId}>
                              <span>{m.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">({m.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {selectedUserId && (
                    <>
                      {selectedMember && (
                        <div className="mb-4 text-sm text-muted-foreground">
                          {selectedMember.email}
                          {(selectedMember.role === 'admin' || selectedMember.role === 'super_admin') && (
                            <Badge variant="secondary" className="ml-2 text-xs">{selectedMember.role === 'super_admin' ? 'Super Admin' : 'Admin'} — {tp.fullAccess}</Badge>
                          )}
                        </div>
                      )}
                      {loadingPerms ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> {tp.loadingPerms}</div>
                      ) : (
                        <>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="text-left p-3 font-medium">{tp.sector}</th>
                                  <th className="text-center p-3 font-medium">{tp.view}</th>
                                  <th className="text-center p-3 font-medium">{tp.create}</th>
                                  <th className="text-center p-3 font-medium">{tp.edit}</th>
                                  <th className="text-center p-3 font-medium">{tp.delete}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ALL_SECTORS.map(sector => (
                                  <tr key={sector} className="border-t border-border">
                                    <td className="p-3"><Badge variant="secondary" className="text-xs">{t.sectors[sector] || sector}</Badge></td>
                                    {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(action => (
                                      <td key={action} className="text-center p-3">
                                        <Checkbox checked={permissions[sector][action]} onCheckedChange={() => togglePermission(sector, action)} />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button className="mt-4" onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {tp.save}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-fields">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Columns3 className="w-4 h-4 text-primary" /> {ts.customFields.title}
              </CardTitle>
            </CardHeader>
            <CardContent><CustomFieldsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" /> {ts.backup.title}
              </CardTitle>
            </CardHeader>
            <CardContent><BackupRestoreTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> {ts.crmCadence.title}
              </CardTitle>
            </CardHeader>
            <CardContent><CRMCadenceTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="business-units">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" /> {ts.businessUnits.title}
              </CardTitle>
            </CardHeader>
            <CardContent><BusinessUnitsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
