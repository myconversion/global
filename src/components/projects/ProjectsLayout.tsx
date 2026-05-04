import React, { useState, useCallback, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, CheckSquare, FolderKanban, Plus,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { Project } from '@/types/index';

// ── Sidebar nav item ─────────────────────────────────────────────────────────

interface SidebarNavItemProps {
  to: string;
  active: boolean;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  layoutId: string;
}

const SidebarNavItem = React.memo(function SidebarNavItem({
  to, active, icon: Icon, label, collapsed, layoutId,
}: SidebarNavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150 relative group',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className="w-4 h-4 flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="truncate flex-1"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
});

// ── Layout ───────────────────────────────────────────────────────────────────

export function ProjectsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const { t } = useI18n();

  const MAIN_NAV = useMemo(() => [
    { label: t.projectsLayoutNav.dashboard, icon: LayoutDashboard, path: '/projects' },
    { label: t.projectsLayoutNav.automations, icon: Zap, path: '/projects/automations' },
    { label: t.projectsLayoutNav.tasks, icon: CheckSquare, path: '/projects/tasks' },
  ], [t]);

  const isActive = useCallback((path: string) => {
    if (path === '/projects') return location.pathname === '/projects';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const isWorkspaceActive = useCallback(
    (projectId: string) => location.pathname.startsWith(`/projects/workspace/${projectId}`),
    [location.pathname],
  );

  const activeProjects = useMemo(
    () => projects.filter(p => p.status !== 'archived'),
    [projects],
  );

  const filteredProjects = useMemo(
    () => search
      ? activeProjects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : activeProjects,
    [activeProjects, search],
  );

  const handleCreateSuccess = useCallback((project?: Project | null) => {
    if (project) navigate(`/projects/workspace/${project.id}`);
  }, [navigate]);

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
          {MAIN_NAV.map(item => (
            <SidebarNavItem
              key={item.path}
              to={item.path}
              active={isActive(item.path)}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              layoutId="projects-nav-active"
            />
          ))}

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

          {filteredProjects.map(project => (
            <SidebarNavItem
              key={project.id}
              to={`/projects/workspace/${project.id}`}
              active={isWorkspaceActive(project.id)}
              icon={FolderKanban}
              label={project.name}
              collapsed={collapsed}
              layoutId="projects-workspace-active"
            />
          ))}

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

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
