import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  FolderKanban, Plus, Trash2, Archive, Search, Filter,
  Pencil, X, LayoutGrid, Clock, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';

import { Project, ProjectStatus } from '@/types/index';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-primary/10 text-primary',
  paused: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  archived: 'bg-muted text-muted-foreground',
};

// ── Reusable confirm dialog for archive / delete ─────────────────────────────

interface ProjectConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onClose: () => void;
}

const ProjectConfirmDialog = React.memo(function ProjectConfirmDialog({
  open, title, description, confirmLabel, confirmClassName, onConfirm, onClose,
}: ProjectConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction className={confirmClassName} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const {
    projects, createProject, updateProject, archiveProject, deleteProject,
    getProjectDeliverables, getProjectProgress, members,
  } = useProjectsContext();

  const STATUS_LABELS = useMemo<Record<ProjectStatus, string>>(() => ({
    active: t.projects.active,
    paused: t.projects.paused,
    completed: t.projects.completed,
    archived: t.projects.archived,
  }), [t]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && p.ownerId !== ownerFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, ownerFilter, search]);

  const selectedProject = selectedId ? projects.find(p => p.id === selectedId) : null;

  const openCreate = useCallback(() => {
    setEditingProject(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  }, []);

  const handleArchive = useCallback(() => {
    if (!archiveTarget) return;
    archiveProject(archiveTarget.id);
    if (selectedId === archiveTarget.id) setSelectedId(null);
    setArchiveTarget(null);
    toast({ title: t.projects.projectArchived });
  }, [archiveTarget, archiveProject, selectedId, toast, t]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const result = await deleteProject(deleteTarget.id);
    if (result && !result.success) {
      toast({ title: t.common.error, description: result.reason, variant: 'destructive' });
    } else {
      if (selectedId === deleteTarget.id) setSelectedId(null);
      toast({ title: t.projects.projectDeleted });
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteProject, selectedId, toast, t]);

  const getMemberName = useCallback(
    (id: string) => members.find(m => m.id === id)?.name ?? '—',
    [members],
  );

  return (
    <div>
      <PageHeader
        title={t.projects.title}
        description={t.projects.description}
        icon={<FolderKanban className="w-5 h-5 text-primary" />}
        actions={<Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> {t.projects.newProject}</Button>}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.projects.searchProject} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.common.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.projects.allStatuses}</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]">
            <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.projects.owner} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.projects.allOwners}</SelectItem>
            {members.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || ownerFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setOwnerFilter('all'); }}>
            <X className="w-3.5 h-3.5 mr-1" /> {t.common.clear}
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        <div className={cn("flex-1 min-w-0 space-y-3 transition-all", selectedProject && "lg:max-w-[55%]")}>
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">
                {projects.length === 0 ? t.projects.noProjects : t.projects.noResults}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {projects.length === 0 ? t.projects.addFirstProject : t.projects.adjustFilters}
              </p>
              {projects.length === 0 && (
                <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> {t.projects.newProject}</Button>
              )}
            </div>
          ) : (
            filtered.map(project => {
              const deliverableCount = getProjectDeliverables(project.id).length;
              const progress = getProjectProgress(project.id);
              const isSelected = selectedId === project.id;
              return (
                <Card key={project.id} className={cn("cursor-pointer transition-all group", isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md")} onClick={() => setSelectedId(isSelected ? null : project.id)}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                          <Badge className={`text-xs shrink-0 ${STATUS_COLORS[project.status] || ''}`} variant="secondary">{STATUS_LABELS[project.status]}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{deliverableCount} {t.projects.deliverables.toLowerCase()}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{getMemberName(project.ownerId)}</span>
                          {project.endDate && (
                            <><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(project.endDate), "dd MMM yyyy", { locale: dateLocale })}</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(project); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          {project.status !== 'archived' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setArchiveTarget(project); }}><Archive className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setDeleteTarget(project); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </div>
                    <Progress value={progress} className="mt-3 h-1.5" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <AnimatePresence>
          {selectedProject && (
            <motion.div initial={{ opacity: 0, x: 20, width: 0 }} animate={{ opacity: 1, x: 0, width: '45%' }} exit={{ opacity: 0, x: 20, width: 0 }} transition={{ duration: 0.2 }} className="hidden lg:block">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold truncate">{selectedProject.name}</h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedId(null)}><X className="w-4 h-4" /></Button>
                  </div>
                  <Badge className={`text-xs mb-4 ${STATUS_COLORS[selectedProject.status]}`} variant="secondary">{STATUS_LABELS[selectedProject.status]}</Badge>
                  {selectedProject.description && <p className="text-sm text-muted-foreground mb-4">{selectedProject.description}</p>}
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-xs text-muted-foreground">{t.projects.owner}</span><p className="font-medium">{getMemberName(selectedProject.ownerId)}</p></div>
                    <div><span className="text-xs text-muted-foreground">{t.projects.deliverables}</span><p className="font-medium">{getProjectDeliverables(selectedProject.id).length}</p></div>
                    {selectedProject.startDate && <div><span className="text-xs text-muted-foreground">{t.projects.startDate}</span><p className="font-medium">{format(new Date(selectedProject.startDate), "dd/MM/yyyy")}</p></div>}
                    {selectedProject.endDate && <div><span className="text-xs text-muted-foreground">{t.projects.endDate}</span><p className="font-medium">{format(new Date(selectedProject.endDate), "dd/MM/yyyy")}</p></div>}
                  </div>
                  <Separator className="my-4" />
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{t.projects.progress}</span>
                      <span className="font-semibold">{getProjectProgress(selectedProject.id)}%</span>
                    </div>
                    <Progress value={getProjectProgress(selectedProject.id)} className="h-2" />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2" onClick={() => navigate(`/projects/${selectedProject.id}`)}><LayoutGrid className="w-4 h-4" /> {t.common.viewAll}</Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(selectedProject)}><Pencil className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProject={editingProject}
        showStatusField
        showClientNameField
      />

      <ProjectConfirmDialog
        open={!!archiveTarget}
        title={t.projects.archiveProject}
        description={`"${archiveTarget?.name}" ${t.projects.archiveProjectDesc}`}
        confirmLabel={t.projects.archive}
        onConfirm={handleArchive}
        onClose={() => setArchiveTarget(null)}
      />

      <ProjectConfirmDialog
        open={!!deleteTarget}
        title={t.projects.deleteProject}
        description={`"${deleteTarget?.name}" ${t.projects.deleteProjectDesc}`}
        confirmLabel={t.common.delete}
        confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
