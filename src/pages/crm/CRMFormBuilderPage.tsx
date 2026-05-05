import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DragDropContext, Droppable, Draggable, DropResult
} from '@hello-pangea/dnd';
import {
  GripVertical, X, Settings2, Plus, Trash2, Save, ArrowLeft,
  Type, Mail, Phone, AlignLeft, List, Hash, SquareCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { FormField, FormFieldType, FieldMapping, CRMForm } from '@/types/crm-forms';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FIELD_ICONS: Record<FormFieldType, React.ElementType> = {
  text: Type, email: Mail, phone: Phone,
  textarea: AlignLeft, select: List, number: Hash, checkbox: SquareCheck,
};

const MAPPING_OPTIONS: { value: FieldMapping; labelKey: string }[] = [
  { value: 'contact.name',          labelKey: 'mappingContactName' },
  { value: 'contact.email',         labelKey: 'mappingContactEmail' },
  { value: 'contact.phone',         labelKey: 'mappingContactPhone' },
  { value: 'contact.cpf',           labelKey: 'mappingContactCpf' },
  { value: 'contact.position',      labelKey: 'mappingContactPosition' },
  { value: 'company.razao_social',  labelKey: 'mappingCompanyRazaoSocial' },
  { value: 'company.nome_fantasia', labelKey: 'mappingCompanyNomeFantasia' },
  { value: 'company.cnpj',          labelKey: 'mappingCompanyCnpj' },
  { value: 'company.email',         labelKey: 'mappingCompanyEmail' },
  { value: 'company.phone',         labelKey: 'mappingCompanyPhone' },
  { value: 'deal.title',            labelKey: 'mappingDealTitle' },
  { value: 'deal.value',            labelKey: 'mappingDealValue' },
  { value: 'custom_field',          labelKey: 'mappingCustomField' },
];

// ---------------------------------------------------------------------------
// Field config sheet
// ---------------------------------------------------------------------------
function FieldConfigSheet({
  field,
  open,
  onClose,
  onChange,
}: {
  field: FormField;
  open: boolean;
  onClose: () => void;
  onChange: (updated: FormField) => void;
}) {
  const { t } = useI18n();

  const update = (patch: Partial<FormField>) => onChange({ ...field, ...patch });

  const addOption = () =>
    update({ options: [...(field.options ?? []), ''] });

  const updateOption = (idx: number, val: string) => {
    const opts = [...(field.options ?? [])];
    opts[idx] = val;
    update({ options: opts });
  };

  const removeOption = (idx: number) => {
    const opts = [...(field.options ?? [])];
    opts.splice(idx, 1);
    update({ options: opts });
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[340px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.crmForms.fieldConfig}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-4">
          {/* Label */}
          <div className="space-y-1.5">
            <Label>{t.crmForms.fieldLabel}</Label>
            <Input value={field.label} onChange={e => update({ label: e.target.value })} />
          </div>

          {/* Placeholder */}
          {field.type !== 'checkbox' && (
            <div className="space-y-1.5">
              <Label>{t.crmForms.fieldPlaceholder}</Label>
              <Input
                value={field.placeholder ?? ''}
                onChange={e => update({ placeholder: e.target.value })}
              />
            </div>
          )}

          {/* Required */}
          <div className="flex items-center justify-between">
            <Label>{t.crmForms.fieldRequired}</Label>
            <Switch checked={field.required} onCheckedChange={v => update({ required: v })} />
          </div>

          {/* Mapping */}
          <div className="space-y-1.5">
            <Label>{t.crmForms.fieldMapping}</Label>
            <Select value={field.mapping} onValueChange={v => update({ mapping: v as FieldMapping })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAPPING_OPTIONS.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {(t.crmForms as Record<string, string>)[m.labelKey] ?? m.labelKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom field key */}
          {field.mapping === 'custom_field' && (
            <div className="space-y-1.5">
              <Label>{t.crmForms.customFieldKey}</Label>
              <Input
                value={field.customFieldKey ?? ''}
                onChange={e => update({ customFieldKey: e.target.value })}
                placeholder="ex: utm_source"
              />
            </div>
          )}

          {/* Options (select only) */}
          {field.type === 'select' && (
            <div className="space-y-2">
              <Label>{t.crmForms.fieldOptions}</Label>
              {(field.options ?? []).map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`Opção ${idx + 1}`}
                  />
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => removeOption(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={addOption}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t.crmForms.addOption}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Canvas field row
// ---------------------------------------------------------------------------
function FieldRow({
  field,
  index,
  onConfig,
  onRemove,
}: {
  field: FormField;
  index: number;
  onConfig: () => void;
  onRemove: () => void;
}) {
  const Icon = FIELD_ICONS[field.type];
  return (
    <Draggable draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 group transition-shadow',
            snapshot.isDragging && 'shadow-md ring-1 ring-primary/30'
          )}
        >
          <span {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="w-4 h-4" />
          </span>
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-sm font-medium truncate">{field.label}</span>
          {field.required && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">*</Badge>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onConfig}>
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={onRemove}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </Draggable>
  );
}

// ---------------------------------------------------------------------------
// Submissions tab
// ---------------------------------------------------------------------------
function SubmissionsTab({ formId }: { formId: string }) {
  const { t } = useI18n();
  const { currentCompany } = useAuth();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['crm-form-submissions', formId],
    enabled: !!formId && !!currentCompany,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_form_submissions')
        .select('id, data, submitted_at, contact_id, crm_company_id, deal_id')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">{t.crmForms.noSubmissions}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.crmForms.submittedAt}</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.crmForms.linkedContact}</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub: { id: string; submitted_at: string; contact_id: string | null; data: Record<string, unknown> }) => (
            <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                {new Date(sub.submitted_at).toLocaleString()}
              </td>
              <td className="py-2.5 px-3">
                {sub.contact_id
                  ? <a href={`/crm/people/${sub.contact_id}`} className="text-primary hover:underline text-xs">{t.crmForms.viewContact}</a>
                  : '—'}
              </td>
              <td className="py-2.5 px-3 text-muted-foreground text-xs max-w-[300px] truncate">
                {Object.entries(sub.data as Record<string, unknown>).slice(0, 3).map(([, v]) => String(v)).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CRMFormBuilderPage() {
  const { id: formId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentCompany, supabaseUser } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const isNew = !formId;

  // Form config state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pipelineId, setPipelineId] = useState<string>('none');
  const [primaryEntity, setPrimaryEntity] = useState<'contact' | 'company'>('contact');
  const [successMessage, setSuccessMessage] = useState('Obrigado! Entraremos em contato em breve.');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);

  // Config sheet
  const [configField, setConfigField] = useState<FormField | null>(null);

  // Load existing form
  const { data: existingForm } = useQuery({
    queryKey: ['crm-form-detail', formId],
    enabled: !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_forms')
        .select('*')
        .eq('id', formId!)
        .single<CRMForm>();
      if (error) throw error;
      return data;
    },
  });

  // Load pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ['crm-pipelines-list', currentCompany?.id],
    enabled: !!currentCompany,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('id, name')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Populate state from existing form
  useEffect(() => {
    if (existingForm) {
      setName(existingForm.name);
      setDescription(existingForm.description ?? '');
      setPipelineId(existingForm.pipeline_id ?? 'none');
      setPrimaryEntity(existingForm.primary_entity);
      setSuccessMessage(existingForm.success_message);
      setRedirectUrl(existingForm.redirect_url ?? '');
      setIsActive(existingForm.is_active);
      setFields(existingForm.fields);
    }
  }, [existingForm]);

  // Add field from palette
  const addField = useCallback((type: FormFieldType) => {
    const labelMap: Record<FormFieldType, string> = {
      text: t.crmForms.fieldText,
      email: t.crmForms.fieldEmail,
      phone: t.crmForms.fieldPhone,
      textarea: t.crmForms.fieldTextarea,
      select: t.crmForms.fieldSelect,
      number: t.crmForms.fieldNumber,
      checkbox: t.crmForms.fieldCheckbox,
    };
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: labelMap[type],
      required: false,
      mapping: 'custom_field',
    };
    setFields(prev => [...prev, newField]);
  }, [t]);

  // Reorder on drag
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    setFields(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(result.source.index, 1);
      copy.splice(result.destination!.index, 0, moved);
      return copy;
    });
  }, []);

  // Update field
  const updateField = useCallback((updated: FormField) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
    setConfigField(updated);
  }, []);

  // Remove field
  const removeField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (configField?.id === id) setConfigField(null);
  }, [configField]);

  // Save
  const handleSave = async () => {
    if (!name.trim()) { toast.error(t.crmForms.formName + ' é obrigatório'); return; }
    if (fields.length === 0) { toast.error(t.crmForms.noFieldsWarning); return; }
    if (!currentCompany || !supabaseUser) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        pipeline_id: pipelineId === 'none' ? null : pipelineId,
        primary_entity: primaryEntity,
        fields,
        success_message: successMessage.trim() || 'Obrigado!',
        redirect_url: redirectUrl.trim() || null,
        is_active: isActive,
        company_id: currentCompany.id,
        owner_id: supabaseUser.id,
        created_by: supabaseUser.id,
      };

      if (isNew) {
        const { data, error } = await supabase.from('crm_forms').insert(payload).select('id').single();
        if (error) throw error;
        toast.success(t.crmForms.formCreated);
        qc.invalidateQueries({ queryKey: ['crm-forms'] });
        navigate(`/crm/forms/${data.id}`);
      } else {
        const { error } = await supabase.from('crm_forms').update(payload).eq('id', formId!);
        if (error) throw error;
        toast.success(t.crmForms.saved);
        qc.invalidateQueries({ queryKey: ['crm-forms'] });
        qc.invalidateQueries({ queryKey: ['crm-form-detail', formId] });
      }
    } catch {
      toast.error(t.crmForms.saveError);
    } finally {
      setSaving(false);
    }
  };

  const PALETTE_TYPES: FormFieldType[] = ['text', 'email', 'phone', 'textarea', 'select', 'number', 'checkbox'];

  return (
    <div className="flex flex-col gap-0 h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm/forms')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isNew ? t.crmForms.newForm : t.crmForms.editForm}</h1>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? t.crmForms.save + '...' : t.crmForms.save}
        </Button>
      </div>

      <Tabs defaultValue="builder" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="builder">{t.crmForms.builderTab}</TabsTrigger>
          {!isNew && <TabsTrigger value="responses">{t.crmForms.responsesTab}</TabsTrigger>}
        </TabsList>

        {/* ── BUILDER TAB ── */}
        <TabsContent value="builder" className="flex-1 overflow-hidden mt-4">
          <div className="flex gap-4 h-full">
            {/* Left panel: palette + settings */}
            <div className="w-60 shrink-0 flex flex-col gap-4 overflow-y-auto">
              {/* Palette */}
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t.crmForms.fieldTypes}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PALETTE_TYPES.map(type => {
                    const Icon = FIELD_ICONS[type];
                    const labels: Record<FormFieldType, string> = {
                      text: t.crmForms.fieldText,
                      email: t.crmForms.fieldEmail,
                      phone: t.crmForms.fieldPhone,
                      textarea: t.crmForms.fieldTextarea,
                      select: t.crmForms.fieldSelect,
                      number: t.crmForms.fieldNumber,
                      checkbox: t.crmForms.fieldCheckbox,
                    };
                    return (
                      <button
                        key={type}
                        onClick={() => addField(type)}
                        className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/30 transition-all text-xs font-medium cursor-pointer"
                      >
                        <Icon className="w-4 h-4" />
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Form settings */}
              <div className="bg-card border border-border rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Configurações
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.crmForms.formName} *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Formulário de Contato" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.crmForms.formDescription}</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.crmForms.pipeline}</Label>
                  <Select value={pipelineId} onValueChange={setPipelineId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.crmForms.selectPipeline} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.crmForms.noPipeline}</SelectItem>
                      {pipelines.map((p: { id: string; name: string }) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.crmForms.primaryEntity}</Label>
                  <Select value={primaryEntity} onValueChange={v => setPrimaryEntity(v as 'contact' | 'company')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">{t.crmForms.primaryEntityContact}</SelectItem>
                      <SelectItem value="company">{t.crmForms.primaryEntityCompany}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.crmForms.successMessage}</Label>
                  <Textarea value={successMessage} onChange={e => setSuccessMessage(e.target.value)} rows={2} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t.crmForms.redirectUrl}</Label>
                  <Input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://..." />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t.crmForms.isActive}</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            {/* Right panel: canvas */}
            <div className="flex-1 bg-card border border-border rounded-xl overflow-y-auto p-4">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="form-canvas">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'min-h-[200px] flex flex-col gap-2 transition-colors rounded-lg',
                        snapshot.isDraggingOver && 'bg-primary/5'
                      )}
                    >
                      {fields.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-center py-16">
                          <p className="text-muted-foreground text-sm">{t.crmForms.emptyCanvas}</p>
                        </div>
                      ) : (
                        fields.map((field, index) => (
                          <FieldRow
                            key={field.id}
                            field={field}
                            index={index}
                            onConfig={() => setConfigField(field)}
                            onRemove={() => removeField(field.id)}
                          />
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </TabsContent>

        {/* ── RESPONSES TAB ── */}
        {!isNew && (
          <TabsContent value="responses" className="flex-1 overflow-y-auto mt-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <SubmissionsTab formId={formId!} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Field config sheet */}
      {configField && (
        <FieldConfigSheet
          field={configField}
          open={!!configField}
          onClose={() => setConfigField(null)}
          onChange={updateField}
        />
      )}
    </div>
  );
}
