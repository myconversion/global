import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Edit2 } from 'lucide-react';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  permissions: Record<string, Record<string, boolean>>;
}

export default function RolesTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const MODULES = [
    { key: 'crm', label: t.settingsRoles.moduleCRM },
    { key: 'projects', label: t.settingsRoles.moduleProjects },
    { key: 'financial', label: t.settingsRoles.moduleFinancial },
    { key: 'hr', label: t.settingsRoles.moduleHR },
    { key: 'purchases', label: t.settingsRoles.modulePurchases },
    { key: 'communication', label: t.settingsRoles.moduleCommunication },
  ];

  const ACTIONS = [
    { key: 'view', label: t.settingsRoles.viewAction },
    { key: 'create', label: t.settingsRoles.createAction },
    { key: 'edit', label: t.settingsRoles.editAction },
    { key: 'delete', label: t.settingsRoles.deleteAction },
  ];

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6B7280', permissions: {} as Record<string, Record<string, boolean>> });
  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const loadRoles = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from('custom_roles').select('*').eq('company_id', companyId);
    setRoles((data || []).map((r: any) => ({ ...r, permissions: (r.permissions as Record<string, Record<string, boolean>>) || {} })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const openNew = () => {
    setEditingRole(null);
    const perms: Record<string, Record<string, boolean>> = {};
    MODULES.forEach(m => { perms[m.key] = {}; ACTIONS.forEach(a => { perms[m.key][a.key] = false; }); });
    setForm({ name: '', description: '', color: '#6B7280', permissions: perms });
    setDialogOpen(true);
  };

  const openEdit = (r: CustomRole) => {
    setEditingRole(r);
    const perms: Record<string, Record<string, boolean>> = {};
    MODULES.forEach(m => { perms[m.key] = {}; ACTIONS.forEach(a => { perms[m.key][a.key] = r.permissions?.[m.key]?.[a.key] ?? false; }); });
    setForm({ name: r.name, description: r.description || '', color: r.color, permissions: perms });
    setDialogOpen(true);
  };

  const togglePerm = (mod: string, action: string) => {
    setForm(p => ({
      ...p,
      permissions: { ...p.permissions, [mod]: { ...p.permissions[mod], [action]: !p.permissions[mod]?.[action] } },
    }));
  };

  const handleSave = async () => {
    if (!companyId || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
      permissions: form.permissions,
    };

    if (editingRole) {
      const { error } = await supabase.from('custom_roles').update(payload).eq('id', editingRole.id);
      if (error) toast({ title: t.settingsRoles.errorSaving, description: error.message, variant: 'destructive' });
      else toast({ title: t.settingsRoles.roleUpdated });
    } else {
      const { error } = await supabase.from('custom_roles').insert(payload);
      if (error) toast({ title: t.settingsRoles.errorSaving, description: error.message, variant: 'destructive' });
      else toast({ title: t.settingsRoles.roleCreated });
    }
    setSaving(false);
    setDialogOpen(false);
    await loadRoles();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('custom_roles').delete().eq('id', id);
    if (error) toast({ title: t.settingsRoles.errorDeleting, description: error.message, variant: 'destructive' });
    else { toast({ title: t.settingsRoles.roleDeleted }); await loadRoles(); }
  };

  if (!isAdmin) return <p className="text-sm text-muted-foreground">{t.settingsRoles.adminOnly}</p>;
  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> {t.settingsRoles.loadingRoles}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
        <h3 className="text-sm font-medium flex items-center gap-1">{t.settingsRoles.title} <InfoTooltip text={t.settingsRoles.titleTooltip} /></h3>
          <p className="text-xs text-muted-foreground">{t.settingsRoles.description}</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> {t.settingsRoles.newRole}</Button>
      </div>

      {roles.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">{t.settingsRoles.noRoles}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {roles.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                    <CardTitle className="text-sm">{r.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {MODULES.map(m => {
                    const perms = r.permissions?.[m.key];
                    const activeActions = perms ? ACTIONS.filter(a => perms[a.key]).map(a => a.label) : [];
                    if (activeActions.length === 0) return null;
                    return <Badge key={m.key} variant="secondary" className="text-xs">{m.label}: {activeActions.join(', ')}</Badge>;
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingRole ? t.settingsRoles.editRole : t.settingsRoles.newRole}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.settingsRoles.roleName} *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t.settingsRoles.roleNamePlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{t.settingsRoles.roleDescription}</Label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={t.settingsRoles.roleDescPlaceholder} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.settingsRoles.color}</Label>
              <div className="flex gap-2">
                {['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} className={`w-7 h-7 rounded-full border-2 ${form.color === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">{t.settingsRoles.permissions} <InfoTooltip text={t.settingsRoles.permissionsTooltip} /></Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">{t.settingsRoles.moduleCol}</th>
                      {ACTIONS.map(a => <th key={a.key} className="text-center p-2 font-medium">{a.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map(m => (
                      <tr key={m.key} className="border-t border-border">
                        <td className="p-2">{m.label}</td>
                        {ACTIONS.map(a => (
                          <td key={a.key} className="text-center p-2">
                            <Checkbox checked={form.permissions[m.key]?.[a.key] ?? false} onCheckedChange={() => togglePerm(m.key, a.key)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {editingRole ? t.settingsRoles.saveBtn : t.settingsRoles.createRoleBtn}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}