import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

const ROUTE_KEYS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/my-tasks': 'myTasks',
  '/crm': 'crm',
  '/crm/people': 'people',
  '/crm/companies': 'companies',
  '/crm/pipeline': 'pipeline',
  '/crm/automations': 'automations',
  '/crm/followups': 'followups',
  '/crm/tasks': 'tasks',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/financial': 'financial',
  '/fiscal': 'fiscal',
  '/purchases': 'purchases',
  '/hr': 'hr',
  '/communication': 'communication',
  '/bi': 'bi',
  '/settings': 'settings',
  '/super-admin': 'superAdmin',
  '/users': 'users',
};

function getBreadcrumbs(pathname: string, labels: Record<string, string>) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const key = ROUTE_KEYS[currentPath];
    const label = key ? labels[key] : undefined;
    if (label) {
      crumbs.push({ label, path: currentPath });
    }
  }

  return crumbs;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  const location = useLocation();
  const { t } = useI18n();
  const breadcrumbs = getBreadcrumbs(location.pathname, t.pageRoutes);

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}