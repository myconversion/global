import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  FolderKanban, Plus, Trash2, Archive, Search, Filter,
  CalendarIcon, Pencil, X, LayoutGrid, Clock, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { Project, ProjectStatus } from '@/types/index';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-primary/10 text-primary',
  paused: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  archived: 'bg-muted text-muted-foreground',
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const {
    projects, createProject, updateProject, archiveProject, deleteProject,
    getProjectDeliverables, getProjectProgress, members,
  } = useProjectsContext();

  const STATUS_LABELS: Record<ProjectStatus, string> = {
    active: t.projects.active,
    paused: t.projects.paused,
    completed: t.projects.completed,
    archived: t.projects.archived,
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('active');
  const [formOwner, setFormOwner] = useState('');
  const [formStartDate, setFormStartDate] = useState<Date | undefined>();
  const [formEndDate, setFormEndDate] = useState<Date | undefined>();
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

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormClientName(''); setFormStatus('active');
    setFormOwner(''); setFormStartDate(undefined); setFormEndDate(undefined); setEditingProject(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (project: Project) => {
    setFormName(project.name); setFormDescription(project.description ?? '');
    setFormClientName(project.clientId); setFormStatus(project.status);
    setFormOwner(project.ownerId);
    setFormStartDate(project.startDate ? new Date(project.startDate) : undefined);
    setFormEndDate(project.endDate ? new Date(project.endDate) : undefined);
    setEditingProject(project); setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingProject) {
      updateProject(editingProject.id, {
        name: formName.trim(), description: formDescription, status: formStatus,
        ownerId: formOwner || undefined,
        startDate: formStartDate ? format(formStartDate, 'yyyy-MM-dd') : undefined,
        endDate: formEndDate ? format(formEndDate, 'yyyy-MM-dd') : undefined,
      });
      toast({ title: t.projects.projectUpdated });
    } else {
      createProject({
        name: formName.trim(), clientId: '', description: formDescription, status: formStatus,
        ownerId: formOwner || undefined,
        startDate: formStartDate ? format(formStartDate, 'yyyy-MM-dd') : undefined,
        endDate: formEndDate ? format(formEndDate, 'yyyy-MM-dd') : undefined,
      });
      toast({ title: t.projects.projectCreated });
    }
    setDialogOpen(false); resetForm();
  };

  const handleArchive = () => {
    if (!archiveTarget) return;
    archiveProject(archiveTarget.id);
    if (selectedId === archiveTarget.id) setSelectedId(null);
    setArchiveTarget(null);
    toast({ title: t.projects.projectArchived });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteProject(deleteTarget.id);
    if (result && !result.success) {
      toast({ title: t.common.error, description: result.reason, variant: 'destructive' });
    } else {
      if (selectedId === deleteTarget.id) setSelectedId(null);
      toast({ title: t.projects.projectDeleted });
    }
    setDeleteTarget(null);
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name ?? '—';

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

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? t.projects.editProject : t.projects.newProject}</DialogTitle>
            <DialogDescription>{editingProject ? t.projects.description : t.projects.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t.projects.projectName}</Label><Input placeholder={t.projects.projectName} value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t.common.description}</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} /></div>
            {!editingProject && (
              <div className="space-y-2"><Label>{t.projects.clientName}</Label><Input value={formClientName} onChange={e => setFormClientName(e.target.value)} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.common.status}</Label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as ProjectStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.projects.owner}</Label>
                <Select value={formOwner} onValueChange={setFormOwner}>
                  <SelectTrigger><SelectValue placeholder={t.projects.selectOwner} /></SelectTrigger>
                  <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.projects.startDate}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{formStartDate ? format(formStartDate, "dd/MM/yyyy") : t.projects.selectOwner}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={formStartDate} onSelect={setFormStartDate} initialFocus className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t.projects.endDate}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{formEndDate ? format(formEndDate, "dd/MM/yyyy") : t.projects.selectOwner}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={formEndDate} onSelect={setFormEndDate} initialFocus className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{editingProject ? t.common.save : t.projects.newProject}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={v => { if (!v) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.projects.archiveProject}</AlertDialogTitle>
            <AlertDialogDescription>"{archiveTarget?.name}" {t.projects.archiveProjectDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>{t.projects.archive}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.projects.deleteProject}</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.name}" {t.projects.deleteProjectDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
