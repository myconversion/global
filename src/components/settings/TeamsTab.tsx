import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Loader2, Save, UserPlus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  leader_id: string | null;
  members: { id: string; user_id: string; name: string; email: string }[];
}

interface MemberOption {
  userId: string;
  name: string;
  email: string;
}

export default function TeamsTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', color: '#3B82F6' });
  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const loadTeams = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: teamsData }, { data: teamMembersData }, { data: membershipData }] = await Promise.all([
      supabase.from('teams').select('*').eq('company_id', companyId),
      supabase.from('team_members').select('*').eq('company_id', companyId),
      supabase.from('company_memberships').select('user_id').eq('company_id', companyId),
    ]);
    const userIds = membershipData?.map(m => m.user_id) || [];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, name, email').in('user_id', userIds)
      : { data: [] };
    setMembers((profiles || []).map(p => ({ userId: p.user_id, name: p.name, email: p.email })));
    const enrichedTeams: Team[] = (teamsData || []).map(teamRow => {
      const tMembers = (teamMembersData || [])
        .filter(tm => tm.team_id === teamRow.id)
        .map(tm => {
          const prof = profiles?.find(p => p.user_id === tm.user_id);
          return { id: tm.id, user_id: tm.user_id, name: prof?.name || '', email: prof?.email || '' };
        });
      return { ...teamRow, description: teamRow.description, color: teamRow.color || '#6B7280', members: tMembers };
    });
    setTeams(enrichedTeams);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const handleCreate = async () => {
    if (!companyId || !newTeam.name.trim()) return;
    setSaving('new');
    const { error } = await supabase.from('teams').insert({
      company_id: companyId,
      name: newTeam.name.trim(),
      description: newTeam.description.trim() || null,
      color: newTeam.color,
    });
    if (error) toast({ title: t.settingsTeams.errorCreating, description: error.message, variant: 'destructive' });
    else {
      toast({ title: t.settingsTeams.teamCreated });
      setNewTeam({ name: '', description: '', color: '#3B82F6' });
      setDialogOpen(false);
      await loadTeams();
    }
    setSaving(null);
  };

  const handleDelete = async (teamId: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) toast({ title: t.settingsTeams.errorDeleting, description: error.message, variant: 'destructive' });
    else { toast({ title: t.settingsTeams.teamDeleted }); await loadTeams(); }
  };

  const handleAddMember = async (teamId: string, userId: string) => {
    if (!companyId) return;
    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userId, company_id: companyId });
    if (error) toast({ title: t.settingsTeams.errorAddMember, description: error.message, variant: 'destructive' });
    else await loadTeams();
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) toast({ title: t.settingsTeams.errorRemoveMember, description: error.message, variant: 'destructive' });
    else await loadTeams();
  };

  if (!isAdmin) return <p className="text-sm text-muted-foreground">{t.settingsTeams.adminOnly}</p>;
  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> {t.settingsTeams.loadingTeams}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t.settingsTeams.title}</h3>
          <p className="text-xs text-muted-foreground">{t.settingsTeams.description}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> {t.settingsTeams.newTeam}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.settingsTeams.createTeam}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.settingsTeams.teamName} *</Label>
                <Input value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))} placeholder={t.settingsTeams.teamNamePlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{t.settingsTeams.teamDescription}</Label>
                <Input value={newTeam.description} onChange={e => setNewTeam(p => ({ ...p, description: e.target.value }))} placeholder={t.settingsTeams.teamDescPlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{t.settingsTeams.color}</Label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'].map(c => (
                    <button key={c} onClick={() => setNewTeam(p => ({ ...p, color: c }))} className={`w-8 h-8 rounded-full border-2 ${newTeam.color === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={saving === 'new' || !newTeam.name.trim()} className="w-full">
                {saving === 'new' && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t.settingsTeams.createBtn}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">{t.settingsTeams.noTeams}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {teams.map(team => (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                    <CardTitle className="text-sm">{team.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{team.members.length} {t.settingsTeams.members}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(team.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {team.description && <CardDescription className="text-xs">{team.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {team.members.map(m => (
                    <Badge key={m.id} variant="outline" className="gap-1 pr-1">
                      {m.name}
                      <button onClick={() => handleRemoveMember(m.id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 max-w-xs">
                  <Select onValueChange={v => handleAddMember(team.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t.settingsTeams.addMember} /></SelectTrigger>
                    <SelectContent>
                      {members.filter(m => !team.members.some(tm => tm.user_id === m.userId)).map(m => (
                        <SelectItem key={m.userId} value={m.userId} className="text-xs">{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        }
        </div>
      )}
    </div>
  );
}
