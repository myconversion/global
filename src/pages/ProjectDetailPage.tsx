import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderKanban, Plus, ArrowLeft, Pencil, Trash2, LayoutGrid } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useToast } from '@/hooks/use-toast';
import { ProjectCostsCard } from '@/components/projects/ProjectCostsCard';
import { ProjectTransactionsCard } from '@/components/projects/ProjectTransactionsCard';

// ── Shared dialog for naming/renaming deliverables ───────────────────────────

interface DeliverableNameDialogProps {
  open: boolean;
  title: string;
  label: string;
  confirmLabel: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const DeliverableNameDialog = React.memo(function DeliverableNameDialog({
  open, title, label, confirmLabel, placeholder, value, onChange, onConfirm, onClose,
}: DeliverableNameDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && value.trim() && onConfirm()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={onConfirm} disabled={!value.trim()}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// ── Deliverable card ─────────────────────────────────────────────────────────

interface DeliverableCardProps {
  deliverable: { id: string; name: string };
  taskCount: number;
  doneCount: number;
  tasksLabel: string;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const DeliverableCard = React.memo(function DeliverableCard({
  deliverable, taskCount, doneCount, tasksLabel, onNavigate, onEdit, onDelete,
}: DeliverableCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onNavigate}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">{deliverable.name}</h3>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {doneCount}/{taskCount} {tasksLabel}
        </Badge>
      </CardContent>
    </Card>
  );
});

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    getProjectById, getProjectDeliverables,
    addDeliverable, updateDeliverable, deleteDeliverable, getDeliverableTasks,
  } = useProjectsContext();

  // All hooks must run unconditionally before any early return
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const project = getProjectById(projectId!);
  const deliverables = getProjectDeliverables(projectId!);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    addDeliverable(projectId!, newName.trim());
    setNewName('');
    setAddOpen(false);
  }, [newName, projectId, addDeliverable]);

  const handleEdit = useCallback(() => {
    if (!editId || !editName.trim()) return;
    updateDeliverable(editId, editName.trim());
    setEditId(null);
    setEditName('');
  }, [editId, editName, updateDeliverable]);

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t.projectDetail.projectNotFound}</p>
        <Button variant="link" onClick={() => navigate('/projects')}>{t.common.back}</Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate('/projects')}>
        <ArrowLeft className="w-4 h-4" /> {t.projectDetail.backToProjects}
      </Button>

      <PageHeader
        title={project.name}
        description={`${t.projectDetail.clientLabel}: ${project.clientId}`}
        icon={<FolderKanban className="w-5 h-5 text-primary" />}
        actions={<Button className="gap-2" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> {t.projectDetail.addDeliverable}</Button>}
      />

      <ProjectCostsCard project={project} />

      <ProjectTransactionsCard
        projectId={projectId!}
        project={project}
        refetchKey={`${project.laborCost}-${project.suppliesCost}-${project.revenue}`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deliverables.map(del => {
          const tasks = getDeliverableTasks(del.id);
          return (
            <DeliverableCard
              key={del.id}
              deliverable={del}
              taskCount={tasks.length}
              doneCount={tasks.filter(tk => tk.status === 'done').length}
              tasksLabel={t.projectDetail.tasksCompleted}
              onNavigate={() => navigate(`/projects/${projectId}/${del.id}`)}
              onEdit={() => { setEditId(del.id); setEditName(del.name); }}
              onDelete={() => deleteDeliverable(del.id)}
            />
          );
        })}
        {deliverables.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.projectDetail.noDeliverables}</p>
          </div>
        )}
      </div>

      <DeliverableNameDialog
        open={addOpen}
        title={t.projectDetail.newDeliverable}
        label={t.projectDetail.deliverableName}
        confirmLabel={t.common.add}
        placeholder={t.projectDetail.deliverableNamePlaceholder}
        value={newName}
        onChange={setNewName}
        onConfirm={handleAdd}
        onClose={() => { setAddOpen(false); setNewName(''); }}
      />

      <DeliverableNameDialog
        open={!!editId}
        title={t.projectDetail.editDeliverable}
        label={t.common.name}
        confirmLabel={t.common.save}
        value={editName}
        onChange={setEditName}
        onConfirm={handleEdit}
        onClose={() => { setEditId(null); setEditName(''); }}
      />
    </div>
  );
}
