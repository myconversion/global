export type AppRole = 'super_admin' | 'admin' | 'collaborator';

export type Sector =
  | 'crm'
  | 'projects'
  | 'tasks'
  | 'financial'
  | 'fiscal'
  | 'purchases'
  | 'hr'
  | 'communication'
  | 'bi';

export interface SectorPermission {
  sector: Sector;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserPermissions {
  role: AppRole;
  company_id: string;
  sectors: SectorPermission[];
}

export const SECTOR_LABELS: Record<Sector, string> = {
  crm: 'CRM',
  projects: 'Projetos',
  tasks: 'Tarefas',
  financial: 'Financeiro',
  fiscal: 'Fiscal',
  purchases: 'Compras',
  hr: 'RH',
  communication: 'Comunicação',
  bi: 'BI & Relatórios',
};

export const SECTOR_ICONS: Record<Sector, string> = {
  crm: 'Users',
  projects: 'FolderKanban',
  tasks: 'CheckSquare',
  financial: 'DollarSign',
  fiscal: 'FileText',
  purchases: 'ShoppingCart',
  hr: 'UserCog',
  communication: 'MessageCircle',
  bi: 'BarChart3',
};

export const ALL_SECTORS: Sector[] = [
  'crm', 'projects', 'tasks', 'financial', 'fiscal',
  'purchases', 'hr', 'communication', 'bi',
];
