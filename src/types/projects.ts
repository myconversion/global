export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface ProjectTask {
  id: string;
  deliverableId: string;
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  assignee: string;
  status: string;
  order: number;
}

export const DEFAULT_KANBAN_COLUMNS = ['A fazer', 'Em progresso', 'Em revisão', 'Concluído'];

