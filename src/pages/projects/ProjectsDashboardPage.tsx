import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LayoutDashboard, FolderKanban, CheckSquare, Clock, User } from 'lucide-react';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProjectStatus } from '@/types/index';

export default function ProjectsDashboardPage() {
  const navigate = useNavigate();
  const { projects, getProjectDeliverables, getProjectProgress, tasks, members } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);

  const STATUS_LABELS: Record<ProjectStatus, string> = {
    active: t.projectsDashboard.statusActive,
    paused: t.projectsDashboard.statusPaused,
    completed: t.projectsDashboard.statusCompleted,
    archived: t.projectsDashboard.statusArchived,
  };

  const STATUS_COLORS: Record<ProjectStatus, string> = {
    active: 'bg-primary/10 text-primary',
    paused: 'bg-warning/10 text-warning',
    completed: 'bg-success/10 text-success',
    archived: 'bg-muted text-muted-foreground',
  };

  const activeProjects = projects.filter(p => p.status !== 'archived');
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name ?? '—';

  return (
    <div>
      <PageHeader
        title={t.projectsDashboard.title}
        description={t.projectsDashboard.description}
        icon={<LayoutDashboard className="w-5 h-5 text-primary" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t.projectsDashboard.activeWorkspaces}</p>
            <p className="text-2xl font-bold">{activeProjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t.projectsDashboard.totalTasks}</p>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t.projectsDashboard.completedTasks}</p>
            <p className="text-2xl font-bold text-success">{doneTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t.projectsDashboard.overdueTasks}</p>
            <p className="text-2xl font-bold text-destructive">{overdueTasks}</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.projectsDashboard.workspaces}</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeProjects.map(project => {
          const deliverableCount = getProjectDeliverables(project.id).length;
          const progress = getProjectProgress(project.id);
          return (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => navigate(`/projects/workspace/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm truncate flex-1">{project.name}</h3>
                  <Badge className={cn("text-xs shrink-0", STATUS_COLORS[project.status])} variant="secondary">
                    {STATUS_LABELS[project.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{deliverableCount} {t.projectsDashboard.deliverables}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {getMemberName(project.ownerId)}
                  </span>
                  {project.endDate && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(project.endDate), "dd MMM", { locale: dateLocale })}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeProjects.length === 0 && (
        <div className="text-center py-16">
          <FolderKanban className="w-14 h-14 mx-auto mb-3 text-muted-foreground/20" />
          <h3 className="font-semibold text-muted-foreground mb-1">{t.projectsDashboard.noWorkspaces}</h3>
          <p className="text-sm text-muted-foreground">{t.projectsDashboard.noWorkspacesDesc}</p>
        </div>
      )}
    </div>
  );
}
