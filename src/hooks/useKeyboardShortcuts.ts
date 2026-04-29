import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Sector } from '@/types/permissions';

interface ShortcutDef {
  key: string;
  labelKey: string;
  path: string;
  sector?: Sector;
  adminOnly?: boolean;
}

const SHORTCUTS: ShortcutDef[] = [
  { key: 'd', labelKey: 'dashboard', path: '/dashboard' },
  { key: 't', labelKey: 'myTasks', path: '/my-tasks' },
  { key: 'c', labelKey: 'crm', path: '/crm', sector: 'crm' },
  { key: 'p', labelKey: 'projects', path: '/projects', sector: 'projects' },
  { key: 'f', labelKey: 'financial', path: '/financial', sector: 'financial' },
  { key: 'h', labelKey: 'hr', path: '/hr', sector: 'hr' },
  { key: 'r', labelKey: 'help', path: '/help' },
  { key: 'b', labelKey: 'bi', path: '/bi', sector: 'bi' },
  { key: 'm', labelKey: 'communication', path: '/communication', sector: 'communication' },
  { key: 'u', labelKey: 'purchases', path: '/purchases', sector: 'purchases' },
  { key: 'i', labelKey: 'fiscal', path: '/fiscal', sector: 'fiscal' },
  { key: 's', labelKey: 'settings', path: '/settings', adminOnly: true },
];

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { hasSectorAccess, role } = useAuth();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) return;

    if (!e.altKey || e.ctrlKey || e.metaKey) return;

    const key = e.key.toLowerCase();
    const shortcut = SHORTCUTS.find(s => s.key === key);
    if (!shortcut) return;

    if (shortcut.sector && !hasSectorAccess(shortcut.sector)) return;
    if (shortcut.adminOnly && role !== 'admin' && role !== 'super_admin') return;

    e.preventDefault();
    navigate(shortcut.path);
  }, [navigate, hasSectorAccess, role]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function getShortcutsList(shortcuts_t: Record<string, string>): { key: string; label: string }[] {
  return SHORTCUTS.map(s => ({ key: `Alt+${s.key.toUpperCase()}`, label: shortcuts_t[s.labelKey] || s.labelKey }));
}

export { SHORTCUTS };
