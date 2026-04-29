import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, CheckSquare, FolderKanban, Plus,
  ChevronLeft, ChevronRight, Search, X, RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';

import { ProjectStatus } from '@/types/index';

export function ProjectsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { projects, createProject, members } = useProjectsContext();
  const { currentCompany } = useAuth();
  const { t } = useI18n();

  const MAIN_NAV = [
    { label: t.projectsLayoutNav.dashboard, icon: LayoutDashboard, path: '/projects' },
    { label: t.projectsLayoutNav.automations, icon: Zap, path: '/projects/automations' },
    { label: t.projectsLayoutNav.tasks, icon: CheckSquare, path: '/projects/tasks' },
  ];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formStartDate, setFormStartDate] = useState<Date | undefined>();
  const [formEndDate, setFormEndDate] = useState<Date | undefined>();

  const isActive = (path: string) => {
    if (path === '/projects') return location.pathname === '/projects';
    return location.pathname.startsWith(path);
  };

  const isWorkspaceActive = (projectId: string) =>
    location.pathname.startsWith(`/projects/workspace/${projectId}`);

  const activeProjects = projects.filter(p => p.status !== 'archived');

  const filteredProjects = search
    ? activeProjects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : activeProjects;

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormOwner('');
    setFormStartDate(undefined);
    setFormEndDate(undefined);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    const project = await createProject({
      name: formName.trim(),
      clientId: '',
      description: formDescription,
      ownerId: formOwner || undefined,
      startDate: formStartDate ? format(formStartDate, 'yyyy-MM-dd') : undefined,
      endDate: formEndDate ? format(formEndDate, 'yyyy-MM-dd') : undefined,
    });
    if (project) {
      navigate(`/projects/workspace/${project.id}`);
    }
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="flex h-full -m-6">
      <motion.aside
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
        className="h-full bg-card border-r border-border flex flex-col relative flex-shrink-0"
      >
        <div className="flex items-center gap-2 px-3 h-12 border-b border-border overflow-hidden">
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm font-bold text-foreground tracking-tight">
              {t.projectsLayoutNav.projects}
            </motion.span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {MAIN_NAV.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150 relative group',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {active && (
                  <motion.div layoutId="projects-nav-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate flex-1">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          <div className="pt-3 pb-1 px-2">
            {!collapsed ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.projectsLayoutNav.spaces}
                </span>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-px bg-border mx-1" />
            )}
          </div>

          {!collapsed && activeProjects.length > 5 && (
            <div className="px-1.5 pb-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder={t.projectsLayoutNav.searchSpace}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>
            </div>
          )}

          {filteredProjects.map(project => {
            const active = isWorkspaceActive(project.id);
            return (
              <Link
                key={project.id}
                to={`/projects/workspace/${project.id}`}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150 relative group',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {active && (
                  <motion.div layoutId="projects-workspace-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                )}
                <FolderKanban className="w-4 h-4 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate flex-1">
                      {project.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          {filteredProjects.length === 0 && !collapsed && (
            <div className="text-center py-4 px-2">
              <p className="text-xs text-muted-foreground mb-2">
                {search ? t.projectsLayoutNav.noSpaceFound : t.projectsLayoutNav.noSpaceCreated}
              </p>
              {!search && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-3 h-3" /> {t.projectsLayoutNav.createSpace}
                </Button>
              )}
            </div>
          )}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronLeft className="w-3 h-3 text-muted-foreground" />}
        </button>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.projectsLayoutNav.newWorkspace}</DialogTitle>
            <DialogDescription>{t.projectsLayoutNav.newWorkspaceDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.projectsLayoutNav.nameLabel}</Label>
              <Input placeholder={t.projectsLayoutNav.namePlaceholder} value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.projectsLayoutNav.descriptionLabel}</Label>
              <Textarea placeholder={t.projectsLayoutNav.descriptionPlaceholder} value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t.projectsLayoutNav.ownerLabel}</Label>
              <Select value={formOwner} onValueChange={setFormOwner}>
                <SelectTrigger><SelectValue placeholder={t.projectsLayoutNav.selectOwner} /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.projectsLayoutNav.startLabel}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !formStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {formStartDate ? format(formStartDate, "dd/MM/yyyy") : t.projectsLayoutNav.selectDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formStartDate} onSelect={setFormStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t.projectsLayoutNav.endLabel}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !formEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {formEndDate ? format(formEndDate, "dd/MM/yyyy") : t.projectsLayoutNav.selectDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formEndDate} onSelect={setFormEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreate} disabled={!formName.trim()}>{t.projectsLayoutNav.createSpace}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
