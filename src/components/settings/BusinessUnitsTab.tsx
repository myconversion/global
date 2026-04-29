import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, Loader2, MapPin, Building2, Users, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface BusinessUnit {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

interface MemberOption {
  userId: string;
  name: string;
  email: string;
}

interface UserBuLink {
  id: string;
  user_id: string;
  business_unit_id: string;
}

export default function BusinessUnitsTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessUnit | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [userBuLinks, setUserBuLinks] = useState<UserBuLink[]>([]);
  const [selectedBuForUsers, setSelectedBuForUsers] = useState<string | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const fetchUnits = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('business_units')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    setUnits((data as BusinessUnit[]) ?? []);
    setLoading(false);
  }, [companyId]);

  const fetchMembers = useCallback(async () => {
    if (!companyId) return;
    const { data: membershipData } = await supabase
      .from('company_memberships')
      .select('user_id')
      .eq('company_id', companyId);
    if (!membershipData) return;
    const userIds = membershipData.map(m => m.user_id);
    if (userIds.length === 0) return;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);
    setMembers((profiles || []).map(p => ({ userId: p.user_id, name: p.name, email: p.email })));
  }, [companyId]);

  const fetchUserBuLinks = useCallback(async () => {
    if (!companyId) return;
    setLoadingLinks(true);
    const { data } = await supabase
      .from('user_business_units')
      .select('id, user_id, business_unit_id')
      .eq('company_id', companyId);
    setUserBuLinks((data as UserBuLink[]) ?? []);
    setLoadingLinks(false);
  }, [companyId]);

  useEffect(() => {
    fetchUnits();
    fetchMembers();
    fetchUserBuLinks();
  }, [fetchUnits, fetchMembers, fetchUserBuLinks]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setAddress('');
    setDialogOpen(true);
  };

  const openEdit = (unit: BusinessUnit) => {
    setEditing(unit);
    setName(unit.name);
    setCode(unit.code ?? '');
    setAddress(unit.address ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !name.trim()) return;
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from('business_units')
        .update({ name: name.trim(), code: code.trim() || null, address: address.trim() || null })
        .eq('id', editing.id);
      if (error) {
        toast({ title: t.settingsBusinessUnits.errorUpdating, description: error.message, variant: 'destructive' });
      } else {
        toast({ title: t.settingsBusinessUnits.unitUpdated });
      }
    } else {
      const { error } = await supabase
        .from('business_units')
        .insert({ company_id: companyId, name: name.trim(), code: code.trim() || null, address: address.trim() || null });
      if (error) {
        toast({ title: t.settingsBusinessUnits.errorCreating, description: error.message, variant: 'destructive' });
      } else {
        toast({ title: t.settingsBusinessUnits.unitCreated });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchUnits();
  };

  const toggleActive = async (unit: BusinessUnit) => {
    await supabase.from('business_units').update({ is_active: !unit.is_active }).eq('id', unit.id);
    fetchUnits();
  };

  const handleDelete = async (unit: BusinessUnit) => {
    if (!confirm(`${t.settingsBusinessUnits.deleteConfirm} "${unit.name}"?`)) return;
    const { error } = await supabase.from('business_units').delete().eq('id', unit.id);
    if (error) {
      toast({ title: t.settingsBusinessUnits.errorDeleting, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.settingsBusinessUnits.unitDeleted });
      fetchUnits();
    }
  };

  const handleAddUserToBu = async (buId: string, userId: string) => {
    if (!companyId) return;
    const { error } = await supabase.from('user_business_units').insert({
      user_id: userId,
      business_unit_id: buId,
      company_id: companyId,
    });
    if (error) {
      toast({ title: t.settingsBusinessUnits.errorLinking, description: error.message, variant: 'destructive' });
    } else {
      fetchUserBuLinks();
    }
  };

  const handleRemoveUserFromBu = async (linkId: string) => {
    const { error } = await supabase.from('user_business_units').delete().eq('id', linkId);
    if (error) {
      toast({ title: t.settingsBusinessUnits.errorUnlinking, description: error.message, variant: 'destructive' });
    } else {
      fetchUserBuLinks();
    }
  };

  const getLinkedUsersForBu = (buId: string) => {
    return userBuLinks
      .filter(l => l.business_unit_id === buId)
      .map(l => {
        const member = members.find(m => m.userId === l.user_id);
        return { linkId: l.id, userId: l.user_id, name: member?.name ?? t.settingsBusinessUnits.noName, email: member?.email ?? '' };
      });
  };

  const getUnlinkedUsersForBu = (buId: string) => {
    const linkedUserIds = new Set(userBuLinks.filter(l => l.business_unit_id === buId).map(l => l.user_id));
    return members.filter(m => !linkedUserIds.has(m.userId));
  };

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">{t.settingsBusinessUnits.adminOnly}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t.settingsBusinessUnits.description}
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> {t.settingsBusinessUnits.newUnit}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? t.settingsBusinessUnits.editUnit : t.settingsBusinessUnits.newUnitTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t.settingsBusinessUnits.unitName} *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.settingsBusinessUnits.unitNamePlaceholder} />
                </div>
                <div>
                  <Label>{t.settingsBusinessUnits.unitCode}</Label>
                  <Input value={code} onChange={e => setCode(e.target.value)} placeholder={t.settingsBusinessUnits.unitCodePlaceholder} />
                </div>
                <div>
                  <Label>{t.settingsBusinessUnits.unitAddress}</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t.settingsBusinessUnits.unitAddressPlaceholder} />
                </div>
                <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? t.settingsBusinessUnits.saveBtn : t.settingsBusinessUnits.createBtn}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t.settingsBusinessUnits.noUnits}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.settingsBusinessUnits.nameCol}</TableHead>
                <TableHead>{t.settingsBusinessUnits.codeCol}</TableHead>
                <TableHead>{t.settingsBusinessUnits.addressCol}</TableHead>
                <TableHead>{t.settingsBusinessUnits.statusCol}</TableHead>
                <TableHead className="text-right">{t.settingsBusinessUnits.actionsCol}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map(unit => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.code || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {unit.address ? (
                      <span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3" />{unit.address}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={unit.is_active} onCheckedChange={() => toggleActive(unit)} />
                      <Badge variant={unit.is_active ? 'default' : 'secondary'} className="text-xs">
                        {unit.is_active ? t.settingsBusinessUnits.activeStatus : t.settingsBusinessUnits.inactiveStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(unit)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {units.length > 0 && (
        <div className="border-t pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> {t.settingsBusinessUnits.linkUsers}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t.settingsBusinessUnits.linkUsersDesc}
            </p>
          </div>

          <div className="max-w-sm">
            <Select value={selectedBuForUsers ?? ''} onValueChange={setSelectedBuForUsers}>
              <SelectTrigger>
                <SelectValue placeholder={t.settingsBusinessUnits.selectUnit} />
              </SelectTrigger>
              <SelectContent>
                {units.filter(u => u.is_active).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBuForUsers && (
            <div className="space-y-3">
              {loadingLinks ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.common.loading}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {getLinkedUsersForBu(selectedBuForUsers).map(u => (
                      <Badge key={u.linkId} variant="outline" className="gap-1 pr-1">
                        {u.name}
                        <span className="text-[10px] text-muted-foreground ml-1">{u.email}</span>
                        <button onClick={() => handleRemoveUserFromBu(u.linkId)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {getLinkedUsersForBu(selectedBuForUsers).length === 0 && (
                      <p className="text-xs text-muted-foreground">{t.settingsBusinessUnits.noLinkedUsers}</p>
                    )}
                  </div>

                  {getUnlinkedUsersForBu(selectedBuForUsers).length > 0 && (
                    <div className="max-w-xs">
                      <Select onValueChange={v => handleAddUserToBu(selectedBuForUsers, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={t.settingsBusinessUnits.addUser} />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="max-h-48">
                            {getUnlinkedUsersForBu(selectedBuForUsers).map(m => (
                              <SelectItem key={m.userId} value={m.userId} className="text-xs">
                                {m.name} <span className="text-muted-foreground">({m.email})</span>
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
