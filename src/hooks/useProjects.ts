import { useState, useCallback, useEffect } from 'react';
import {
  Project, ProjectDeliverable, Task, Deliverable, ActivityLog,
  TaskStatus, TaskPriority, ProjectStatus, ActivityLogAction,
  ID, KANBAN_COLUMNS
} from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Members type ──
export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

// ── Map DB rows to app types ──
function mapProject(row: any): Project {
  return {
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id ?? '',
    name: row.name,
    description: row.description ?? '',
    status: row.status as ProjectStatus,
    ownerId: row.owner_id ?? '',
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    laborCost: Number(row.labor_cost ?? 0),
    suppliesCost: Number(row.supplies_cost ?? 0),
    totalCost: Number(row.total_cost ?? 0),
    revenue: Number(row.revenue ?? 0),
    sourceDealId: row.source_deal_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeliverable(row: any): ProjectDeliverable {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    order: row.sort_order,
  };
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    projectDeliverableId: row.project_deliverable_id,
    title: row.title,
    description: row.description ?? '',
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    assigneeId: row.assignee_id ?? undefined,
    tags: row.tags ?? [],
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivityLog(row: any): ActivityLog {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id ?? '',
    action: row.action as ActivityLogAction,
    entity: row.entity as ActivityLog['entity'],
    entityId: row.entity_id ?? '',
    entityName: row.entity_name ?? '',
    details: row.details ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Hook ──
export function useProjects() {
  const { currentCompany, supabaseUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<Deliverable[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = currentCompany?.id;

  // ── Fetch data ──
  const fetchAll = useCallback(async () => {
    if (!companyId) {
      setProjects([]); setDeliverables([]); setTasks([]); setActivityLogs([]); setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [projRes, delRes, taskRes, logRes, membRes] = await Promise.all([
      supabase.from('projects').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('project_deliverables').select('*'),
      supabase.from('tasks').select('*').eq('company_id', companyId).order('position', { ascending: true }),
      supabase.from('activity_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('company_memberships').select('user_id').eq('company_id', companyId),
    ]);

    if (projRes.data) setProjects(projRes.data.map(mapProject));
    if (delRes.data) {
      // Filter deliverables to only those belonging to company projects
      const projectIds = new Set((projRes.data ?? []).map((p: any) => p.id));
      setDeliverables(delRes.data.filter((d: any) => projectIds.has(d.project_id)).map(mapDeliverable));
    }
    if (taskRes.data) setTasks(taskRes.data.map(mapTask));
    if (logRes.data) setActivityLogs(logRes.data.map(mapActivityLog));

    // Fetch real members
    if (membRes.data && membRes.data.length > 0) {
      const userIds = membRes.data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar_url').in('user_id', userIds);
      if (profiles) {
        setMembers(profiles.map((p: any) => ({ id: p.user_id, name: p.name, avatar: p.avatar_url ?? '' })));
      }
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Realtime subscriptions for tasks & activity_logs ──
  useEffect(() => {
    if (!companyId) return;

    const tasksChannel = supabase
      .channel(`tasks-realtime-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `company_id=eq.${companyId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = mapTask(payload.new);
          setTasks(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]);
        } else if (payload.eventType === 'UPDATE') {
          const t = mapTask(payload.new);
          setTasks(prev => prev.map(x => x.id === t.id ? t : x));
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as any)?.id;
          if (id) setTasks(prev => prev.filter(x => x.id !== id));
        }
      })
      .subscribe();

    const logsChannel = supabase
      .channel(`logs-realtime-${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `company_id=eq.${companyId}` }, (payload) => {
        const log = mapActivityLog(payload.new);
        setActivityLogs(prev => prev.some(x => x.id === log.id) ? prev : [log, ...prev.slice(0, 49)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [companyId]);

  // ── Activity Log (persisted) ──
  const log = useCallback(async (action: ActivityLogAction, entity: ActivityLog['entity'], entityId: ID, entityName: string, details?: string) => {
    if (!companyId) return;
    const { data: row, error } = await supabase
      .from('activity_logs')
      .insert({
        company_id: companyId,
        user_id: supabaseUser?.id ?? null,
        action,
        entity,
        entity_id: entityId,
        entity_name: entityName,
        details: details ?? null,
      })
      .select()
      .single();
    if (!error && row) {
      setActivityLogs(prev => [mapActivityLog(row), ...prev.slice(0, 49)]);
    }
  }, [companyId, supabaseUser]);

  // ══════════════════════════════════
  // ── Projects CRUD ──
  // ══════════════════════════════════

  const createProject = useCallback(async (data: Pick<Project, 'name' | 'clientId'> & Partial<Pick<Project, 'description' | 'status' | 'ownerId' | 'startDate' | 'endDate' | 'laborCost' | 'suppliesCost' | 'revenue' | 'sourceDealId'>>) => {
    if (!companyId || !supabaseUser) return null;
    const { data: row, error } = await supabase
      .from('projects')
      .insert({
        company_id: companyId,
        name: data.name,
        client_id: data.clientId || null,
        description: data.description ?? null,
        status: data.status ?? 'active',
        owner_id: data.ownerId || supabaseUser.id,
        start_date: data.startDate ?? new Date().toISOString().split('T')[0],
        end_date: data.endDate ?? null,
        labor_cost: data.laborCost ?? 0,
        supplies_cost: data.suppliesCost ?? 0,
        revenue: data.revenue ?? 0,
        source_deal_id: data.sourceDealId ?? null,
        created_by: supabaseUser.id,
      } as any)
      .select()
      .single();
    if (error) { console.error('Error creating project:', error); return null; }
    const project = mapProject(row);
    setProjects(prev => [project, ...prev]);
    log('create', 'project', project.id, project.name);
    return project;
  }, [companyId, supabaseUser, log]);

  const updateProject = useCallback(async (id: ID, data: Partial<Pick<Project, 'name' | 'description' | 'status' | 'ownerId' | 'startDate' | 'endDate' | 'clientId' | 'laborCost' | 'suppliesCost' | 'revenue'>>) => {
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.ownerId !== undefined) updates.owner_id = data.ownerId;
    if (data.startDate !== undefined) updates.start_date = data.startDate;
    if (data.endDate !== undefined) updates.end_date = data.endDate;
    if (data.clientId !== undefined) updates.client_id = data.clientId || null;
    if (data.laborCost !== undefined) updates.labor_cost = data.laborCost;
    if (data.suppliesCost !== undefined) updates.supplies_cost = data.suppliesCost;
    if (data.revenue !== undefined) updates.revenue = data.revenue;

    const { data: row, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (error) { console.error('Error updating project:', error); return; }
    const updated = row ? mapProject(row) : null;
    setProjects(prev => prev.map(p => p.id === id ? (updated ?? { ...p, ...data, updatedAt: new Date().toISOString() }) : p));
    const project = projects.find(p => p.id === id);
    log('update', 'project', id, project?.name ?? id, JSON.stringify(data));
  }, [projects, log]);

  const archiveProject = useCallback(async (id: ID) => {
    const { error } = await supabase.from('projects').update({ status: 'archived' as ProjectStatus }).eq('id', id);
    if (error) { console.error('Error archiving project:', error); return; }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'archived' as ProjectStatus, updatedAt: new Date().toISOString() } : p));
    const project = projects.find(p => p.id === id);
    log('archive', 'project', id, project?.name ?? id);
  }, [projects, log]);

  const deleteProject = useCallback(async (id: ID) => {
    const projDeliverables = deliverables.filter(d => d.projectId === id);
    const projTaskCount = tasks.filter(t => projDeliverables.some(d => d.id === t.projectDeliverableId)).length;
    if (projTaskCount > 0) {
      return { success: false, reason: 'Projetos com tarefas não podem ser excluídos. Arquive o projeto.' };
    }
    const project = projects.find(p => p.id === id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { console.error('Error deleting project:', error); return { success: false, reason: error.message }; }
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeliverables(prev => prev.filter(d => d.projectId !== id));
    log('delete', 'project', id, project?.name ?? id);
    return { success: true };
  }, [projects, deliverables, tasks, log]);

  // ── Backward compat alias ──
  const addProject = useCallback(async (data: { name: string; clientName: string }) => {
    return createProject({ name: data.name, clientId: '' });
  }, [createProject]);

  // ══════════════════════════════════
  // ── Deliverables CRUD ──
  // ══════════════════════════════════

  const addDeliverable = useCallback(async (projectId: ID, name: string) => {
    const order = deliverables.filter(d => d.projectId === projectId).length;
    const { data: row, error } = await supabase
      .from('project_deliverables')
      .insert({ project_id: projectId, name, sort_order: order })
      .select()
      .single();
    if (error) { console.error('Error creating deliverable:', error); return null; }
    const del = mapDeliverable(row);
    setDeliverables(prev => [...prev, del]);
    log('create', 'project', projectId, name, `Deliverable "${name}" created`);
    return del;
  }, [deliverables, log]);

  const updateDeliverable = useCallback(async (id: ID, name: string) => {
    const { error } = await supabase.from('project_deliverables').update({ name }).eq('id', id);
    if (error) { console.error('Error updating deliverable:', error); return; }
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  }, []);

  const deleteDeliverable = useCallback(async (id: ID) => {
    // Delete tasks first (cascade not automatic via RLS)
    await supabase.from('tasks').delete().eq('project_deliverable_id', id);
    const { error } = await supabase.from('project_deliverables').delete().eq('id', id);
    if (error) { console.error('Error deleting deliverable:', error); return; }
    setDeliverables(prev => prev.filter(d => d.id !== id));
    setTasks(prev => prev.filter(t => t.projectDeliverableId !== id));
  }, []);

  // ══════════════════════════════════
  // ── Tasks CRUD ──
  // ══════════════════════════════════

  const createTask = useCallback(async (data: {
    projectDeliverableId: ID;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: ID;
    tags?: string[];
    startDate?: string;
    dueDate?: string;
  }) => {
    if (!companyId || !supabaseUser) return null;
    const status = data.status ?? 'todo';
    const position = tasks.filter(t => t.projectDeliverableId === data.projectDeliverableId && t.status === status).length;

    const { data: row, error } = await supabase
      .from('tasks')
      .insert({
        company_id: companyId,
        project_deliverable_id: data.projectDeliverableId,
        title: data.title,
        description: data.description ?? null,
        status,
        priority: data.priority ?? 'medium',
        assignee_id: data.assigneeId ?? null,
        tags: data.tags ?? [],
        start_date: data.startDate ?? null,
        due_date: data.dueDate ?? null,
        position,
        created_by: supabaseUser.id,
      })
      .select()
      .single();
    if (error) { console.error('Error creating task:', error); return null; }
    const task = mapTask(row);
    setTasks(prev => [...prev, task]);
    log('create', 'task', task.id, task.title);
    return task;
  }, [companyId, supabaseUser, tasks, log]);

  // Backward compat: addTask accepts old shape
  const addTask = useCallback(async (data: any) => {
    return createTask({
      projectDeliverableId: data.deliverableId ?? data.projectDeliverableId,
      title: data.title,
      description: data.description,
      status: data.status === 'A fazer' ? 'todo'
        : data.status === 'Em progresso' ? 'in_progress'
        : data.status === 'Em revisão' ? 'review'
        : data.status === 'Concluído' ? 'done'
        : (data.status as TaskStatus) ?? 'todo',
      priority: data.priority ?? 'medium',
      assigneeId: data.assignee ?? data.assigneeId,
      tags: data.tags ?? [],
      startDate: data.startDate,
      dueDate: data.dueDate,
    });
  }, [createTask]);

  const updateTask = useCallback(async (id: ID, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    const updates: any = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.assigneeId !== undefined) updates.assignee_id = data.assigneeId;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.startDate !== undefined) updates.start_date = data.startDate;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.position !== undefined) updates.position = data.position;
    if (data.projectDeliverableId !== undefined) updates.project_deliverable_id = data.projectDeliverableId;

    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) { console.error('Error updating task:', error); return; }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t));
    const task = tasks.find(t => t.id === id);
    log('update', 'task', id, task?.title ?? id);
  }, [tasks, log]);

  const deleteTask = useCallback(async (id: ID) => {
    const task = tasks.find(t => t.id === id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { console.error('Error deleting task:', error); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    log('delete', 'task', id, task?.title ?? id);
  }, [tasks, log]);

  const moveTask = useCallback(async (taskId: ID, newStatus: TaskStatus, newPosition?: number) => {
    // Optimistic update
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      const delId = task.projectDeliverableId;
      const oldStatus = task.status;

      let result = prev.map(t => ({ ...t }));

      const oldColumn = result
        .filter(t => t.projectDeliverableId === delId && t.status === oldStatus && t.id !== taskId)
        .sort((a, b) => a.position - b.position);
      oldColumn.forEach((t, i) => {
        const target = result.find(r => r.id === t.id);
        if (target) target.position = i;
      });

      const newColumn = result
        .filter(t => t.projectDeliverableId === delId && t.status === newStatus && t.id !== taskId)
        .sort((a, b) => a.position - b.position);
      const insertAt = newPosition ?? newColumn.length;

      newColumn.forEach((t, i) => {
        const target = result.find(r => r.id === t.id);
        if (target) target.position = i >= insertAt ? i + 1 : i;
      });

      const movedTask = result.find(t => t.id === taskId);
      if (movedTask) {
        movedTask.status = newStatus;
        movedTask.position = insertAt;
        movedTask.updatedAt = new Date().toISOString();
      }

      return result;
    });

    // Persist
    const { error } = await supabase.from('tasks').update({ status: newStatus, position: newPosition ?? 0 }).eq('id', taskId);
    if (error) {
      console.error('Error moving task:', error);
      await fetchAll();
    }
    log('move', 'task', taskId, '', `Moved to ${newStatus}`);
  }, [log, fetchAll]);

  // ══════════════════════════════════
  // ── Checklist (kept in-memory for now — no DB table) ──
  // ══════════════════════════════════

  let nextChecklistId = 1000;
  const genChecklistId = (): ID => String(++nextChecklistId);

  const getTaskChecklist = useCallback((taskId: ID) =>
    checklists.filter(c => c.taskId === taskId).sort((a, b) => a.order - b.order),
  [checklists]);

  const addChecklistItem = useCallback((taskId: ID, title: string) => {
    const order = checklists.filter(c => c.taskId === taskId).length;
    const item: Deliverable = { id: genChecklistId(), taskId, title, done: false, order };
    setChecklists(prev => [...prev, item]);
    return item;
  }, [checklists]);

  const toggleChecklistItem = useCallback((id: ID) => {
    setChecklists(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  }, []);

  const deleteChecklistItem = useCallback((id: ID) => {
    setChecklists(prev => prev.filter(c => c.id !== id));
  }, []);

  // ══════════════════════════════════
  // ── Queries ──
  // ══════════════════════════════════

  const getProjectDeliverables = useCallback((projectId: ID) =>
    deliverables.filter(d => d.projectId === projectId).sort((a, b) => a.order - b.order),
  [deliverables]);

  const getDeliverableTasks = useCallback((deliverableId: ID) =>
    tasks.filter(t => t.projectDeliverableId === deliverableId).sort((a, b) => a.position - b.position),
  [tasks]);

  const getProjectById = useCallback((id: ID) => projects.find(p => p.id === id), [projects]);
  const getDeliverableById = useCallback((id: ID) => deliverables.find(d => d.id === id), [deliverables]);

  const getProjectProgress = useCallback((projectId: ID) => {
    const projDeliverables = deliverables.filter(d => d.projectId === projectId);
    const projTasks = tasks.filter(t => projDeliverables.some(d => d.id === t.projectDeliverableId));
    if (projTasks.length === 0) return 0;
    const done = projTasks.filter(t => t.status === 'done').length;
    return Math.round((done / projTasks.length) * 100);
  }, [deliverables, tasks]);

  const getProjectTasks = useCallback((projectId: ID) => {
    const projDeliverables = deliverables.filter(d => d.projectId === projectId);
    return tasks.filter(t => projDeliverables.some(d => d.id === t.projectDeliverableId));
  }, [deliverables, tasks]);

  const getAllTasks = useCallback(() => tasks, [tasks]);

  return {
    // Projects
    projects, createProject, updateProject, archiveProject, deleteProject, addProject,
    // Deliverables
    deliverables, addDeliverable, updateDeliverable, deleteDeliverable,
    // Tasks
    tasks, createTask, addTask, updateTask, deleteTask, moveTask,
    // Checklist
    checklists, getTaskChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    // Queries
    getProjectDeliverables, getDeliverableTasks, getProjectById, getDeliverableById,
    getProjectProgress, getProjectTasks, getAllTasks,
    // Members
    members,
    // Activity Log
    activityLogs,
    // Loading
    loading,
  };
}
