// ===== Conversion. ERP + CRM — Tipos Globais =====

export type ID = string;

// ── Empresa ──
export interface Company {
  id: ID;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  createdAt: string;
}

// ── Usuário ──
export type UserRole = 'super_admin' | 'admin' | 'collaborator';

export interface User {
  id: ID;
  companyId: ID;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// ── Cliente ──
export interface Client {
  id: ID;
  companyId: ID;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  createdAt: string;
}

// ── Projeto ──
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: ID;
  companyId: ID;
  clientId: ID;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId: ID;
  startDate?: string;
  endDate?: string;
  laborCost: number;
  suppliesCost: number;
  totalCost: number;
  revenue: number;
  sourceDealId?: ID;
  createdAt: string;
  updatedAt: string;
}

// ── Entregável (checklist dentro da tarefa) ──
export interface Deliverable {
  id: ID;
  taskId: ID;
  title: string;
  done: boolean;
  dueDate?: string;
  order: number;
}

// ── Entregável de Projeto (agrupador de tarefas — ex: SEO, Social Media) ──
export interface ProjectDeliverable {
  id: ID;
  projectId: ID;
  name: string;
  order: number;
}

// ── Tarefa ──
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: ID;
  projectDeliverableId: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: ID;
  tags: string[];
  startDate?: string;
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ── CRM — Legacy types removed (now using crm_pipeline_deals + crm_pipelines) ──

// ── Financeiro — Transação ──
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type RecurrenceFrequency = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: ID;
  companyId: ID;
  type: TransactionType;
  category: string;
  description: string;
  value: number;
  date: string;
  dueDate?: string;
  status: TransactionStatus;
  clientId?: ID;
  projectId?: ID;
  recurrence: RecurrenceFrequency;
  createdAt: string;
}

// ── Fiscal — Nota Fiscal ──
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';

export interface Invoice {
  id: ID;
  companyId: ID;
  transactionId?: ID;
  clientId?: ID;
  number: string;
  value: number;
  status: InvoiceStatus;
  issuedAt?: string;
  description?: string;
  createdAt: string;
}

// ── Compras — Fornecedor ──
export interface Supplier {
  id: ID;
  companyId: ID;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  category?: string;
  notes?: string;
  createdAt: string;
}

// ── Compras — Pedido de Compra ──
export type PurchaseOrderStatus = 'pending' | 'approved' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: ID;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: ID;
  companyId: ID;
  supplierId: ID;
  items: PurchaseOrderItem[];
  totalValue: number;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  notes?: string;
  createdAt: string;
}

// ── RH — Colaborador ──
export type EmploymentType = 'clt' | 'pj' | 'intern' | 'freelancer';

export interface Employee {
  id: ID;
  companyId: ID;
  userId?: ID;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  employmentType: EmploymentType;
  salary?: number;
  hireDate: string;
  isActive: boolean;
  createdAt: string;
}

// ── Log de Atividade (centralizado) ──
export type ActivityLogAction = 'create' | 'update' | 'delete' | 'archive' | 'move' | 'assign' | 'comment';
export type ActivityLogEntity = 'project' | 'task' | 'deal' | 'client' | 'transaction' | 'invoice' | 'employee' | 'supplier' | 'purchase_order';

export interface ActivityLog {
  id: ID;
  companyId: ID;
  userId: ID;
  action: ActivityLogAction;
  entity: ActivityLogEntity;
  entityId: ID;
  entityName: string;
  details?: string;
  createdAt: string;
}

// ── Constantes ──
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em progresso',
  review: 'Em revisão',
  done: 'Concluído',
  blocked: 'Bloqueado',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};


export const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];
