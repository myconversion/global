import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { ALL_SECTORS, SECTOR_LABELS, type Sector, type SectorPermission } from '@/types/permissions';
import { Users, Plus, Loader2, Mail, KeyRound } from 'lucide-react';

interface MemberRow {
  user_id: string;
  role: string;
  name: string;
  email: string;
}

function defaultSectorPerms(): Record<Sector, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> {
  const map = {} as any;
  ALL_SECTORS.forEach(s => { map[s] = { can_view: false, can_create: false, can_edit: false, can_delete: false }; });
  return map;
}

export default function UserManagementPage() {
  const { currentCompany, role } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [method, setMethod] = useState<'invite' | 'direct'>('direct');
  const [sectorPerms, setSectorPerms] = useState(defaultSectorPerms());
  const [creating, setCreating] = useState(false);

  const loadMembers = async () => {
    if (!companyId) return;
    setLoadingMembers(true);
    const { data: memberships } = await supabase
      .from('company_memberships')
      .select('user_id, role')
      .eq('company_id', companyId);
    if (!memberships) { setMembers([]); setLoadingMembers(false); return; }
    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, name, email').in('user_id', userIds);
    setMembers(memberships.map(m => {
      const p = profiles?.find(pr => pr.user_id === m.user_id);
      return { user_id: m.user_id, role: m.role, name: p?.name ?? t.userManagement.noName, email: p?.email ?? '' };
    }));
    setLoadingMembers(false);
  };

  useEffect(() => { loadMembers(); }, [companyId]);

  const togglePerm = (sector: Sector, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setSectorPerms(prev => ({
      ...prev,
      [sector]: { ...prev[sector], [action]: !prev[sector][action] },
    }));
  };

  const handleCreate = async () => {
    if (!companyId || !userName.trim() || !userEmail.trim()) return;
    if (method === 'direct' && (!userPassword || userPassword.length < 6)) {
      toast({ title: t.userManagement.passwordMinChars, variant: 'destructive' });
      return;
    }
    setCreating(true);
    const permissionsPayload = ALL_SECTORS
      .filter(s => sectorPerms[s].can_view || sectorPerms[s].can_create || sectorPerms[s].can_edit || sectorPerms[s].can_delete)
      .map(s => ({ sector: s, ...sectorPerms[s] }));
    const res = await supabase.functions.invoke('create-user', {
      body: {
        email: userEmail.trim(),
        password: method === 'direct' ? userPassword : undefined,
        name: userName.trim(),
        company_id: companyId,
        role: 'collaborator',
        method,
        sector_permissions: permissionsPayload,
      },
    });
    if (res.error) {
      toast({ title: t.userManagement.createUserError, description: res.error.message, variant: 'destructive' });
    } else {
      toast({
        title: t.userManagement.collaboratorCreated,
        description: method === 'invite' ? t.userManagement.inviteSent : t.userManagement.userCreated,
      });
      setUserName(''); setUserEmail(''); setUserPassword('');
      setSectorPerms(defaultSectorPerms());
      setDialogOpen(false);
      loadMembers();
    }
    setCreating(false);
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title={t.userManagement.restrictedAccess} description={t.userManagement.onlyAdminsCanManage} icon={<Users className="w-5 h-5 text-destructive" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.userManagement.title}
        description={`${t.userManagement.description} — ${currentCompany?.name ?? ''}`}
        icon={<Users className="w-5 h-5 text-primary" />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> {t.userManagement.collaborators}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> {t.userManagement.newCollaborator}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t.userManagement.createCollaborator}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.common.name}</Label>
                    <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder={t.userManagement.fullName} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.common.email}</Label>
                    <Input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.userManagement.creationMethod}</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={method === 'direct' ? 'default' : 'outline'} size="sm" onClick={() => setMethod('direct')} className="flex-1">
                      <KeyRound className="w-4 h-4 mr-1" /> {t.userManagement.directPassword}
                    </Button>
                    <Button type="button" variant={method === 'invite' ? 'default' : 'outline'} size="sm" onClick={() => setMethod('invite')} className="flex-1">
                      <Mail className="w-4 h-4 mr-1" /> {t.userManagement.emailInvite}
                    </Button>
                  </div>
                </div>
                {method === 'direct' && (
                  <div className="space-y-2">
                    <Label>{t.auth.password}</Label>
                    <Input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} minLength={6} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t.userManagement.sectorPermissions}</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">{t.userManagement.sector}</th>
                          <th className="text-center p-2 font-medium">{t.userManagement.view}</th>
                          <th className="text-center p-2 font-medium">{t.userManagement.create}</th>
                          <th className="text-center p-2 font-medium">{t.userManagement.edit}</th>
                          <th className="text-center p-2 font-medium">{t.userManagement.delete}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ALL_SECTORS.map(sector => (
                          <tr key={sector} className="border-t border-border">
                            <td className="p-2"><Badge variant="secondary" className="text-xs">{t.sectors[sector] || SECTOR_LABELS[sector]}</Badge></td>
                            {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(action => (
                              <td key={action} className="text-center p-2">
                                <Checkbox checked={sectorPerms[sector][action]} onCheckedChange={() => togglePerm(sector, action)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.userManagement.createCollaborator}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.userManagement.noMembers}</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between p-3 border rounded-lg border-border">
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant={m.role === 'super_admin' ? 'default' : m.role === 'admin' ? 'secondary' : 'outline'} className="text-xs">
                    {m.role === 'super_admin' ? t.header.superAdmin : m.role === 'admin' ? t.header.admin : t.header.collaborator}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
