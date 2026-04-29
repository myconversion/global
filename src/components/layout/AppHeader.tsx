import { Moon, Sun, ChevronDown, Building2, Store, Menu } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const { user, role, currentCompany, companies, setCurrentCompany, currentBusinessUnit, businessUnits, setCurrentBusinessUnit, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const roleLabel = role === 'super_admin' ? t.header.superAdmin : role === 'admin' ? t.header.admin : t.header.collaborator;

  return (
    <header className="h-14 md:h-16 border-b border-topbar-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-20 bg-topbar gap-2">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onMobileMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {(role === 'super_admin' || companies.length > 1) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 md:gap-2 text-xs md:text-sm border-border bg-topbar-input-bg text-foreground hover:bg-muted transition-colors duration-150 max-w-[140px] md:max-w-none"
              >
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{currentCompany?.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-muted-foreground">{t.header.companies}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => setCurrentCompany(c)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isMobile && businessUnits.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-sm border-border bg-topbar-input-bg text-foreground hover:bg-muted transition-colors duration-150"
              >
                <Store className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{currentBusinessUnit?.name ?? t.header.allUnits}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-muted-foreground">{t.header.businessUnit}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentBusinessUnit(null)}>
                {t.header.allUnits}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {businessUnits.map(u => (
                <DropdownMenuItem key={u.id} onClick={() => setCurrentBusinessUnit(u)}>
                  {u.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isMobile && <GlobalSearch />}
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {!isMobile && (
          <Badge variant="secondary" className="text-xs font-medium">
            {roleLabel}
          </Badge>
        )}

        <NotificationBell />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
        >
          {theme === 'light' ? (
            <Moon className="w-4.5 h-4.5" />
          ) : (
            <Sun className="w-4.5 h-4.5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 md:gap-2 ml-0.5 md:ml-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline text-foreground">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-muted-foreground">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>{t.header.myProfile}</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await signOut(); navigate('/auth'); }}>{t.header.signOut}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
