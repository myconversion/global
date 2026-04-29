import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';

interface FieldDef {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: any;
  is_required: boolean;
  sort_order: number;
}

export default function CustomFieldsTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const ENTITY_TYPES = [
    { value: 'contact', label: t.settingsCustomFields.entityContact },
    { value: 'company', label: t.settingsCustomFields.entityCompany },
    { value: 'deal', label: t.settingsCustomFields.entityDeal },
  ];

  const FIELD_TYPES = [
    { value: 'text', label: t.settingsCustomFields.fieldTypeText },
    { value: 'number', label: t.settingsCustomFields.fieldTypeNumber },
    { value: 'date', label: t.settingsCustomFields.fieldTypeDate },
    { value: 'select', label: t.settingsCustomFields.fieldTypeSelect },
    { value: 'boolean', label: t.settingsCustomFields.fieldTypeBoolean },
  ];

  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ entity_type: 'contact', field_name: '', field_label: '', field_type: 'text', options: '', is_required: false });
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const companyId = currentCompany?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const loadFields = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from('custom_field_definitions').select('*').eq('company_id', companyId).order('entity_type').order('sort_order');
    setFields((data || []) as FieldDef[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleCreate = async () => {
    if (!companyId || !form.field_label.trim()) return;
    setSaving(true);
    const fieldName = form.field_name.trim() || form.field_label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    const options = form.field_type === 'select' && form.options ? form.options.split(',').map(o => o.trim()).filter(Boolean) : null;
    const { error } = await supabase.from('custom_field_definitions').insert({
      company_id: companyId, entity_type: form.entity_type, field_name: fieldName,
      field_label: form.field_label.trim(), field_type: form.field_type,
      options: options ? { values: options } : null, is_required: form.is_required,
      sort_order: fields.filter(f => f.entity_type === form.entity_type).length,
    });
    if (error) toast({ title: t.settingsCustomFields.errorCreating, description: error.message, variant: 'destructive' });
    else {
      toast({ title: t.settingsCustomFields.fieldCreated });
      setForm({ entity_type: 'contact', field_name: '', field_label: '', field_type: 'text', options: '', is_required: false });
      setDialogOpen(false);
      await loadFields();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
    if (error) toast({ title: t.settingsCustomFields.errorDeleting, description: error.message, variant: 'destructive' });
    else { toast({ title: t.settingsCustomFields.fieldDeleted }); await loadFields(); }
  };

  if (!isAdmin) return <p className="text-sm text-muted-foreground">{t.settingsCustomFields.adminOnly}</p>;
  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> {t.settingsCustomFields.loadingFields}</div>;

  const filtered = filterEntity === 'all' ? fields : fields.filter(f => f.entity_type === filterEntity);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t.settingsCustomFields.title}</h3>
          <p className="text-xs text-muted-foreground">{t.settingsCustomFields.description}</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> {t.settingsCustomFields.newField}</Button>
      </div>

      <div className="flex gap-2">
        <Badge variant={filterEntity === 'all' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setFilterEntity('all')}>{t.settingsCustomFields.filterAll}</Badge>
        {ENTITY_TYPES.map(et => (
          <Badge key={et.value} variant={filterEntity === et.value ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setFilterEntity(et.value)}>{et.label}</Badge>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">{t.settingsCustomFields.noFields}{filterEntity !== 'all' ? ` ${t.settingsCustomFields.noFieldsForEntity}` : ''}.</CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">{t.settingsCustomFields.entityCol}</th>
                <th className="text-left p-3 font-medium">{t.settingsCustomFields.nameCol}</th>
                <th className="text-left p-3 font-medium">{t.settingsCustomFields.typeCol}</th>
                <th className="text-center p-3 font-medium">{t.settingsCustomFields.requiredCol}</th>
                <th className="text-right p-3 font-medium">{t.settingsCustomFields.actionsCol}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-t border-border">
                  <td className="p-3"><Badge variant="secondary" className="text-xs">{ENTITY_TYPES.find(e => e.value === f.entity_type)?.label}</Badge></td>
                  <td className="p-3">{f.field_label}</td>
                  <td className="p-3 text-muted-foreground text-xs">{FIELD_TYPES.find(ft => ft.value === f.field_type)?.label || f.field_type}</td>
                  <td className="p-3 text-center">{f.is_required ? '✓' : '—'}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.settingsCustomFields.newFieldTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.settingsCustomFields.entityLabel} *</Label>
              <Select value={form.entity_type} onValueChange={v => setForm(p => ({ ...p, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.settingsCustomFields.fieldLabel} *</Label>
              <Input value={form.field_label} onChange={e => setForm(p => ({ ...p, field_label: e.target.value }))} placeholder={t.settingsCustomFields.fieldLabelPlaceholder} />
            </div>
            <div className="space-y-2">
              <Label>{t.settingsCustomFields.fieldType}</Label>
              <Select value={form.field_type} onValueChange={v => setForm(p => ({ ...p, field_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.field_type === 'select' && (
              <div className="space-y-2">
                <Label>{t.settingsCustomFields.selectOptions}</Label>
                <Input value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))} placeholder={t.settingsCustomFields.selectOptionsPlaceholder} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_required} onCheckedChange={v => setForm(p => ({ ...p, is_required: v }))} />
              <Label className="text-sm">{t.settingsCustomFields.isRequired}</Label>
            </div>
            <Button onClick={handleCreate} disabled={saving || !form.field_label.trim()} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t.settingsCustomFields.createFieldBtn}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}