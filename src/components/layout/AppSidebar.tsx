import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FolderKanban, CheckSquare, DollarSign, FileText,
  ShoppingCart, UserCog, MessageCircle, BarChart3, Settings,
  ChevronLeft, ChevronRight, LayoutDashboard, Shield, HelpCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoPrimary from '@/assets/logo-primary.png';
import logoMinimized from '@/assets/logo-minimized.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Sector } from '@/types/permissions';
import { useIsMobile } from '@/hooks/use-mobile';

const SECTOR_ICON_MAP: Partial<Record<Sector, React.ElementType>> = {
  crm: Users,
  projects: FolderKanban,
  tasks: CheckSquare,
  financial: DollarSign,
  fiscal: FileText,
  purchases: ShoppingCart,
  hr: UserCog,
  communication: MessageCircle,
  bi: BarChart3,
};

const SECTOR_ROUTES: Partial<Record<Sector, string>> = {
  crm: '/crm',
  projects: '/projects',
  tasks: '/tasks',
  financial: '/financial',
  fiscal: '/fiscal',
  purchases: '/purchases',
  hr: '/hr',
  communication: '/communication',
  bi: '/bi',
};

const SECTOR_I18N_KEY: Record<Sector, string> = {
  crm: 'crm',
  projects: 'projects',
  tasks: 'tasks',
  financial: 'financial',
  fiscal: 'fiscal',
  purchases: 'purchases',
  hr: 'hr',
  communication: 'communication',
  bi: 'bi',
};

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  sector?: Sector;
}

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { hasSectorAccess, role } = useAuth();
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const isCollapsed = isMobile ? false : collapsed;

  const mainNav: NavItem[] = [
    ...(role === 'admin' || role === 'super_admin'
      ? [{ label: t.nav.dashboard, icon: LayoutDashboard, path: '/dashboard' }]
      : []),
    { label: t.nav.myTasks, icon: CheckSquare, path: '/my-tasks' },
  ];

  const sectorNav: NavItem[] = Object.entries(SECTOR_ICON_MAP)
    .filter(([sector]) => {
      if (!hasSectorAccess(sector as Sector)) return false;
      if (sector === 'bi' && role !== 'admin' && role !== 'super_admin') return false;
      return true;
    })
    .map(([sector, Icon]) => ({
      label: t.sectors[SECTOR_I18N_KEY[sector as Sector]] || sector,
      icon: Icon!,
      path: SECTOR_ROUTES[sector as Sector]!,
      sector: sector as Sector,
    }));

  const bottomNav: NavItem[] = [
    ...(role === 'admin' || role === 'super_admin'
      ? [
          { label: t.nav.users, icon: UserCog, path: '/users' },
          { label: t.nav.settings, icon: Settings, path: '/settings' },
        ]
      : []),
    ...(role === 'super_admin'
      ? [{ label: t.nav.superAdmin, icon: Shield, path: '/super-admin' }]
      : []),
    { label: t.nav.help, icon: HelpCircle, path: '/help' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleClick = () => {
    if (isMobile && onNavigate) {
      onNavigate();
    }
  };

  return (
    <motion.aside
      animate={{ width: isMobile ? '100%' : isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'flex flex-col relative z-30',
        isMobile
          ? 'h-full bg-sidebar'
          : 'h-screen bg-sidebar border-r border-sidebar-border'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border overflow-hidden bg-sidebar-logo-bg">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.img
              key="collapsed"
              src={logoMinimized}
              alt="conversion."
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-9 h-9 object-contain flex-shrink-0"
            />
          ) : (
            <motion.img
              key="expanded"
              src={logoPrimary}
              alt="conversion."
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-8 object-contain"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 sidebar-scroll">
        {mainNav.map(item => (
          <SidebarLink key={item.path} item={item} collapsed={isCollapsed} active={isActive(item.path)} onClick={handleClick} />
        ))}

        <div className="pt-4 pb-2 px-3">
          {!isCollapsed ? (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {t.nav.modules}
            </span>
          ) : (
            <div className="h-px bg-sidebar-border mx-1" />
          )}
        </div>

        {sectorNav.map(item => (
          <SidebarLink key={item.path} item={item} collapsed={isCollapsed} active={isActive(item.path)} onClick={handleClick} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border py-3 px-2 space-y-1">
        {bottomNav.map(item => (
          <SidebarLink key={item.path} item={item} collapsed={isCollapsed} active={isActive(item.path)} onClick={handleClick} />
        ))}
      </div>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar-active-bg border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-colors duration-150 shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-sidebar-foreground" />
          )}
        </button>
      )}
    </motion.aside>
  );
}

function SidebarLink({ item, collapsed, active, onClick }: { item: NavItem; collapsed: boolean; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative',
        active
          ? 'bg-sidebar-active-bg text-white border-l-[3px] border-sidebar-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white border-l-[3px] border-transparent'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 transition-colors duration-150', active ? 'text-white' : 'text-sidebar-foreground group-hover:text-white')} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="truncate"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
