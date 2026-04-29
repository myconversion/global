import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FolderKanban, Handshake, UserRound, ListTodo } from 'lucide-react';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';

interface SearchResult { id: string; title: string; subtitle?: string; route: string; }
interface GroupedResults { clients: SearchResult[]; projects: SearchResult[]; deals: SearchResult[]; contacts: SearchResult[]; tasks: SearchResult[]; }

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults>({ clients: [], projects: [], deals: [], contacts: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const { currentCompany } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(prev => !prev); }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const search = useCallback(async (term: string) => {
    if (!term || term.length < 2 || !currentCompany) {
      setResults({ clients: [], projects: [], deals: [], contacts: [], tasks: [] });
      return;
    }
    setLoading(true);
    const companyId = currentCompany.id;
    const pattern = `%${term}%`;
    const [clientsRes, projectsRes, dealsRes, contactsRes, tasksRes] = await Promise.all([
      supabase.from('clients').select('id, name, email').eq('company_id', companyId).ilike('name', pattern).limit(5),
      supabase.from('projects').select('id, name, status').eq('company_id', companyId).ilike('name', pattern).limit(5),
      supabase.from('crm_pipeline_deals').select('id, title, stage_name, value').eq('company_id', companyId).ilike('title', pattern).limit(5),
      supabase.from('crm_contacts').select('id, name, email').eq('company_id', companyId).ilike('name', pattern).limit(5),
      supabase.from('tasks').select('id, title, status, priority').eq('company_id', companyId).ilike('title', pattern).limit(5),
    ]);
    setResults({
      clients: (clientsRes.data ?? []).map(c => ({ id: c.id, title: c.name, subtitle: c.email ?? undefined, route: `/clients/${c.id}` })),
      projects: (projectsRes.data ?? []).map(p => ({ id: p.id, title: p.name, subtitle: p.status, route: `/projects/${p.id}` })),
      deals: (dealsRes.data ?? []).map(d => ({ id: d.id, title: d.title, subtitle: `${d.stage_name} · ${Number(d.value).toLocaleString()}`, route: `/crm/pipeline` })),
      contacts: (contactsRes.data ?? []).map(c => ({ id: c.id, title: c.name, subtitle: c.email ?? undefined, route: `/crm/people/${c.id}` })),
      tasks: (tasksRes.data ?? []).map(t => ({ id: t.id, title: t.title, subtitle: t.status, route: `/my-tasks` })),
    });
    setLoading(false);
  }, [currentCompany]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (route: string) => { setOpen(false); setQuery(''); navigate(route); };
  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  const groups: { key: keyof GroupedResults; label: string; icon: React.ReactNode }[] = [
    { key: 'clients', label: t.globalSearch.clients, icon: <Users className="mr-2 h-4 w-4 text-muted-foreground" /> },
    { key: 'projects', label: t.globalSearch.projects, icon: <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" /> },
    { key: 'deals', label: t.globalSearch.deals, icon: <Handshake className="mr-2 h-4 w-4 text-muted-foreground" /> },
    { key: 'contacts', label: t.globalSearch.contacts, icon: <UserRound className="mr-2 h-4 w-4 text-muted-foreground" /> },
    { key: 'tasks', label: t.globalSearch.tasks, icon: <ListTodo className="mr-2 h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative hidden md:flex items-center h-9 w-56 rounded-lg pl-9 pr-3 text-sm bg-topbar-input-bg text-muted-foreground border border-border hover:bg-muted transition-colors duration-150 cursor-pointer"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <span>{t.header.search}</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.globalSearch.placeholder} value={query} onValueChange={setQuery} />
        <CommandList>
          {query.length < 2 && <CommandEmpty>{t.globalSearch.minChars}</CommandEmpty>}
          {query.length >= 2 && !loading && totalResults === 0 && <CommandEmpty>{t.globalSearch.noResults}</CommandEmpty>}
          {groups.map((group, i) => {
            const items = results[group.key];
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {items.map(item => (
                    <CommandItem key={item.id} value={`${group.key}-${item.title}`} onSelect={() => handleSelect(item.route)} className="cursor-pointer">
                      {group.icon}
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}