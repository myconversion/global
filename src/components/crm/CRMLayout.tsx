import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Building2, Kanban, Zap, CalendarCheck, CheckSquare,
  Search, ChevronLeft, ChevronRight, X, RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';

export function CRMLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [followupCount, setFollowupCount] = useState(0);
  const location = useLocation();
  const { currentCompany } = useAuth();
  const { t } = useI18n();

  const CRM_NAV = [
    { label: t.crmLayoutNav.dashboard, icon: LayoutDashboard, path: '/crm', badgeKey: null },
    { label: t.crmLayoutNav.people, icon: Users, path: '/crm/people', badgeKey: null },
    { label: t.crmLayoutNav.companies, icon: Building2, path: '/crm/companies', badgeKey: null },
    { label: t.crmLayoutNav.pipeline, icon: Kanban, path: '/crm/pipeline', badgeKey: null },
    { label: t.crmLayoutNav.automations, icon: Zap, path: '/crm/automations', badgeKey: null },
    { label: t.crmLayoutNav.followups, icon: CalendarCheck, path: '/crm/followups', badgeKey: 'followups' as const },
    { label: t.crmLayoutNav.tasks, icon: CheckSquare, path: '/crm/tasks', badgeKey: null },
  ];

  const isActive = (path: string) => {
    if (path === '/crm') return location.pathname === '/crm';
    return location.pathname.startsWith(path);
  };

  const fetchFollowupCount = async () => {
    if (!currentCompany) return;
    const now = new Date();
    const { count } = await supabase
      .from('crm_followups')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', currentCompany.id)
      .eq('is_completed', false)
      .lte('scheduled_at', new Date(now.setHours(23, 59, 59, 999)).toISOString());
    setFollowupCount(count ?? 0);
  };

  useEffect(() => {
    fetchFollowupCount();
  }, [currentCompany]);

  const handleRefresh = () => {
    setLastUpdated(new Date());
    fetchFollowupCount();
    window.dispatchEvent(new Event('crm-refresh'));
  };

  const timeAgo = () => {
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diff < 10) return t.crmLayoutNav.justNow;
    if (diff < 60) return `${diff}${t.crmLayoutNav.secondsAgo}`;
    return `${Math.floor(diff / 60)}${t.crmLayoutNav.minutesAgo}`;
  };

  return (
    <div className="flex h-full -m-6">
      <motion.aside
        animate={{ width: collapsed ? 56 : 220 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
        className="h-full bg-card border-r border-border flex flex-col relative flex-shrink-0"
      >
        <div className="flex items-center gap-2 px-3 h-12 border-b border-border overflow-hidden">
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm font-bold text-foreground tracking-tight">
              CRM
            </motion.span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {CRM_NAV.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const showBadge = item.badgeKey === 'followups' && followupCount > 0;
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
                  <motion.div layoutId="crm-nav-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                )}
                <div className="relative">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {showBadge && collapsed && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate flex-1">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {showBadge && !collapsed && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                    {followupCount > 99 ? '99+' : followupCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronLeft className="w-3 h-3 text-muted-foreground" />}
        </button>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-border flex items-center gap-3 px-4 flex-shrink-0 bg-background">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={t.crmLayoutNav.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground hidden sm:inline">{timeAgo()}</span>
            <button
              onClick={handleRefresh}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={t.crmLayoutNav.refresh}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
