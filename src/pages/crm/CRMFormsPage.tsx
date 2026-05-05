import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Check, Share2, Pencil, Trash2, ToggleLeft, ToggleRight, ClipboardList, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import type { CRMFormWithCount } from '@/types/crm-forms';

// ---------------------------------------------------------------------------
// Share Dialog
// ---------------------------------------------------------------------------
function ShareDialog({ form, open, onClose }: { form: CRMFormWithCount; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const publicUrl = `${window.location.origin}/form/${form.public_token}`;
  const embedCode = `<iframe src="${publicUrl}" width="100%" height="640" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  const copy = (text: string, type: 'link' | 'embed') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.crmForms.shareTitle}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1">{t.crmForms.publicLink}</TabsTrigger>
            <TabsTrigger value="embed" className="flex-1">{t.crmForms.embedCode}</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <code className="flex-1 bg-muted rounded px-3 py-2 text-sm break-all font-mono">{publicUrl}</code>
              <Button size="icon" variant="outline" onClick={() => copy(publicUrl, 'link')}>
                {copiedLink ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button className="w-full" onClick={() => window.open(publicUrl, '_blank')}>
              {t.crmForms.publicLink}
            </Button>
          </TabsContent>

          <TabsContent value="embed" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">{t.crmForms.embedInstructions}</p>
            <div className="flex gap-2 items-start">
              <code className="flex-1 bg-muted rounded px-3 py-2 text-xs break-all font-mono leading-relaxed">{embedCode}</code>
              <Button size="icon" variant="outline" onClick={() => copy(embedCode, 'embed')} className="flex-shrink-0 mt-0">
                {copiedEmbed ? <Check className="w-4 h-4 text-success" /> : <Code className="w-4 h-4" />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Form Card
// ---------------------------------------------------------------------------
function FormCard({
  form,
  onEdit,
  onShare,
  onToggle,
  onDelete,
  canDelete,
}: {
  form: CRMFormWithCount;
  onEdit: () => void;
  onShare: () => void;
  onToggle: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const submissionCount = form.crm_form_submissions?.[0]?.count ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{form.name}</h3>
          {form.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{form.description}</p>
          )}
        </div>
        <Badge variant={form.is_active ? 'default' : 'secondary'} className="shrink-0">
          {form.is_active ? t.crmForms.active : t.crmForms.inactive}
        </Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{form.fields.length} {t.crmForms.fields}</span>
        <span>·</span>
        <span>{submissionCount} {t.crmForms.submissions}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/60">
        <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          {t.crmForms.editFormBtn}
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={onShare}>
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          {t.crmForms.shareForm}
        </Button>
        <Button size="icon" variant="ghost" className="w-8 h-8" onClick={onToggle} title={form.is_active ? t.crmForms.inactive : t.crmForms.active}>
          {form.is_active
            ? <ToggleRight className="w-4 h-4 text-success" />
            : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
        </Button>
        {canDelete && (
          <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRMFormsPage
// ---------------------------------------------------------------------------
export default function CRMFormsPage() {
  const navigate = useNavigate();
  const { currentCompany, supabaseUser, role } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();

  const [shareForm, setShareForm] = useState<CRMFormWithCount | null>(null);
  const [deleteForm, setDeleteForm] = useState<CRMFormWithCount | null>(null);

  // Fetch forms
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['crm-forms', currentCompany?.id],
    enabled: !!currentCompany,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_forms')
        .select('*, crm_form_submissions(count)')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CRMFormWithCount[];
    },
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async (form: CRMFormWithCount) => {
      const { error } = await supabase
        .from('crm_forms')
        .update({ is_active: !form.is_active })
        .eq('id', form.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-forms'] }),
    onError: () => toast.error(t.crmForms.saveError),
  });

  // Delete form
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.crmForms.formDeleted);
      qc.invalidateQueries({ queryKey: ['crm-forms'] });
      setDeleteForm(null);
    },
    onError: () => toast.error(t.crmForms.saveError),
  });

  const canDelete = (form: CRMFormWithCount) =>
    role === 'admin' || role === 'super_admin' || form.created_by === supabaseUser?.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.crmForms.title}
        actions={
          <Button onClick={() => navigate('/crm/forms/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t.crmForms.newForm}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-10 h-10" />}
          title={t.crmForms.noForms}
          description={t.crmForms.noFormsDesc}
          action={
            <Button onClick={() => navigate('/crm/forms/new')}>
              <Plus className="w-4 h-4 mr-2" />
              {t.crmForms.newForm}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              onEdit={() => navigate(`/crm/forms/${form.id}`)}
              onShare={() => setShareForm(form)}
              onToggle={() => toggleMutation.mutate(form)}
              onDelete={() => setDeleteForm(form)}
              canDelete={canDelete(form)}
            />
          ))}
        </div>
      )}

      {/* Share Dialog */}
      {shareForm && (
        <ShareDialog form={shareForm} open={!!shareForm} onClose={() => setShareForm(null)} />
      )}

      {/* Delete Alert */}
      <AlertDialog open={!!deleteForm} onOpenChange={open => !open && setDeleteForm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.crmForms.deleteForm}</AlertDialogTitle>
            <AlertDialogDescription>{t.crmForms.deleteFormDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common?.cancel ?? 'Cancelar'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteForm && deleteMutation.mutate(deleteForm.id)}
            >
              {t.crmForms.deleteForm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
