import React, { useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { useProjectForm } from '@/hooks/useProjectForm';
import { Project, ProjectStatus } from '@/types/index';

const STATUS_KEYS: ProjectStatus[] = ['active', 'paused', 'completed', 'archived'];

// ── Date picker field ────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  label: string;
  value?: Date;
  onSelect: (date?: Date) => void;
  placeholder: string;
}

const DatePickerField = React.memo(function DatePickerField({
  label, value, onSelect, placeholder,
}: DatePickerFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'dd/MM/yyyy') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

// ── Dialog ───────────────────────────────────────────────────────────────────

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog is in edit mode; otherwise create mode. */
  editingProject?: Project | null;
  /** Show the Status field (edit + full-create flow in ProjectsPage). */
  showStatusField?: boolean;
  /** Show the Client Name field (create flow in ProjectsPage). */
  showClientNameField?: boolean;
  /** Called after a successful create/update. Receives the new project on create. */
  onSuccess?: (project?: Project | null) => void;
}

export const ProjectFormDialog = React.memo(function ProjectFormDialog({
  open,
  onOpenChange,
  editingProject,
  showStatusField = false,
  showClientNameField = false,
  onSuccess,
}: ProjectFormDialogProps) {
  const { createProject, updateProject, members } = useProjectsContext();
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useProjectForm();

  const STATUS_LABELS = useMemo<Record<ProjectStatus, string>>(() => ({
    active: t.projects.active,
    paused: t.projects.paused,
    completed: t.projects.completed,
    archived: t.projects.archived,
  }), [t]);

  // Load or reset the form whenever the dialog is opened
  const { loadFromProject, reset } = form;
  useEffect(() => {
    if (open) {
      if (editingProject) {
        loadFromProject(editingProject);
      } else {
        reset();
      }
    }
  }, [open, editingProject, loadFromProject, reset]);

  const handleSubmit = async () => {
    if (!form.isValid) return;
    if (editingProject) {
      await updateProject(editingProject.id, form.toUpdatePayload());
      toast({ title: t.projects.projectUpdated });
      onOpenChange(false);
      onSuccess?.();
    } else {
      const project = await createProject(form.toCreatePayload());
      toast({ title: t.projects.projectCreated });
      onOpenChange(false);
      onSuccess?.(project);
    }
    reset();
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingProject ? t.projects.editProject : t.projects.newProject}
          </DialogTitle>
          <DialogDescription>{t.projects.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t.projects.projectName}</Label>
            <Input
              placeholder={t.projects.projectName}
              value={form.name}
              onChange={e => form.setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t.common.description}</Label>
            <Textarea
              value={form.description}
              onChange={e => form.setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Client name (create only, optional) */}
          {showClientNameField && !editingProject && (
            <div className="space-y-2">
              <Label>{t.projects.clientName}</Label>
              <Input
                value={form.clientName}
                onChange={e => form.setClientName(e.target.value)}
              />
            </div>
          )}

          {/* Status + Owner row */}
          <div className={cn('grid gap-3', showStatusField ? 'grid-cols-2' : 'grid-cols-1')}>
            {showStatusField && (
              <div className="space-y-2">
                <Label>{t.common.status}</Label>
                <Select
                  value={form.status}
                  onValueChange={v => form.setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_KEYS.map(k => (
                      <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.projects.owner}</Label>
              <Select value={form.ownerId} onValueChange={form.setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.projects.selectOwner} />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start + End date row */}
          <div className="grid grid-cols-2 gap-3">
            <DatePickerField
              label={t.projects.startDate}
              value={form.startDate}
              onSelect={form.setStartDate}
              placeholder={t.projects.selectOwner}
            />
            <DatePickerField
              label={t.projects.endDate}
              value={form.endDate}
              onSelect={form.setEndDate}
              placeholder={t.projects.selectOwner}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!form.isValid}>
            {editingProject ? t.common.save : t.projects.newProject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
