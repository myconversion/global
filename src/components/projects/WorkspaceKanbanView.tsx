import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, GripVertical, CalendarIcon, User, AlertTriangle,
  Trash2, ListChecks, Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { Task, TaskPriority } from '@/types/index';

interface WorkspaceColumn {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface WorkspaceKanbanViewProps {
  deliverableId: string;
  columns: WorkspaceColumn[];
  onEditColumn: (col: WorkspaceColumn) => void;
  onDeleteColumn: (colId: string) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

const STATUS_MAP: Record<number, string> = {
  0: 'todo', 1: 'in_progress', 2: 'review', 3: 'done', 4: 'blocked',
};

export default function WorkspaceKanbanView({ deliverableId, columns, onEditColumn, onDeleteColumn }: WorkspaceKanbanViewProps) {
  const {
    getDeliverableTasks, addTask, updateTask, deleteTask, moveTask,
    getTaskChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    members,
  } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);

  const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: t.workspace.priorityLow,
    medium: t.workspace.priorityMedium,
    high: t.workspace.priorityHigh,
    urgent: t.workspace.priorityUrgent,
  };

  const tasks = getDeliverableTasks(deliverableId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [createInColumn, setCreateInColumn] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tagsInput, setTagsInput] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assignee, setAssignee] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');

  const resetForm = () => {
    setTitle(''); setDescription(''); setPriority('medium');
    setTagsInput(''); setStartDate(undefined); setDueDate(undefined);
    setAssignee(''); setNewCheckItem('');
  };

  const openCreate = (columnIndex: number) => {
    resetForm(); setEditingTask(null); setCreateInColumn(String(columnIndex)); setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setTitle(task.title); setDescription(task.description ?? '');
    setPriority(task.priority); setTagsInput(task.tags.join(', '));
    setStartDate(task.startDate ? new Date(task.startDate) : undefined);
    setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
    setAssignee(task.assigneeId ?? ''); setNewCheckItem('');
    setEditingTask(task); setDialogOpen(true);
  };

  const parseTags = (input: string) => input.split(',').map(t => t.trim()).filter(Boolean);

  const handleSave = () => {
    if (!title.trim()) return;
    const tags = parseTags(tagsInput);
    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(), description, priority, tags,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        assigneeId: assignee || undefined,
      });
    } else {
      const colIdx = parseInt(createInColumn ?? '0');
      const statusKey = STATUS_MAP[colIdx] ?? 'todo';
      addTask({
        deliverableId, title: title.trim(), description, priority, tags,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : '',
        assignee, status: statusKey,
      });
    }
    setDialogOpen(false); resetForm(); setEditingTask(null); setCreateInColumn(null);
  };

  const handleDelete = () => {
    if (editingTask) { deleteTask(editingTask.id); setDialogOpen(false); setEditingTask(null); }
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim() || !editingTask) return;
    addChecklistItem(editingTask.id, newCheckItem.trim()); setNewCheckItem('');
  };

  const getColumnTasks = (colIndex: number) => {
    const statusKey = STATUS_MAP[colIndex] ?? STATUS_MAP[0];
    return tasks.filter(t => t.status === statusKey).sort((a, b) => a.position - b.position);
  };

  const onDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const colIndex = parseInt(destination.droppableId);
    const statusKey = STATUS_MAP[colIndex] ?? 'todo';
    moveTask(draggableId, statusKey as any, destination.index);
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '';

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    return isPast(due) && !isToday(due);
  };

  const checklist = editingTask ? getTaskChecklist(editingTask.id) : [];
  const checkDone = checklist.filter(c => c.done).length;

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {columns.map((column, colIndex) => {
            const columnTasks = getColumnTasks(colIndex);
            return (
              <Droppable droppableId={String(colIndex)} key={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "rounded-lg border bg-muted/30 p-3 min-w-[260px] w-[260px] flex-shrink-0 transition-colors",
                      snapshot.isDraggingOver && "bg-accent/40 ring-2 ring-primary/20"
                    )}
                    style={{ borderTopWidth: 3, borderTopColor: column.color }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{column.name}</h4>
                      <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {columnTasks.map((task, index) => {
                        const overdue = isOverdue(task);
                        const taskChecklist = getTaskChecklist(task.id);
                        const taskCheckDone = taskChecklist.filter(c => c.done).length;
                        return (
                          <Draggable draggableId={task.id} index={index} key={task.id}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <Card
                                  className={cn(
                                    "cursor-pointer hover:shadow-md transition-all",
                                    snapshot.isDragging && "shadow-lg ring-2 ring-primary/30 rotate-[2deg]",
                                    overdue && "border-destructive/50"
                                  )}
                                  onClick={() => openEdit(task)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-2">
                                      <GripVertical className="w-3 h-3 mt-1 text-muted-foreground/50 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{task.title}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                          <Badge className={cn("text-[10px] px-1.5 py-0 border-0", PRIORITY_COLORS[task.priority])}>
                                            {TASK_PRIORITY_LABELS[task.priority]}
                                          </Badge>
                                          {task.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                                          ))}
                                        </div>
                                        {overdue && (
                                          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-destructive">
                                            <AlertTriangle className="w-3 h-3" /> {t.workspace.overdue}
                                          </div>
                                        )}
                                        {task.dueDate && !overdue && (
                                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                            <CalendarIcon className="w-3 h-3" />
                                            {format(new Date(task.dueDate), "dd MMM", { locale: dateLocale })}
                                          </div>
                                        )}
                                        {taskChecklist.length > 0 && (
                                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                            <ListChecks className="w-3 h-3" /> {taskCheckDone}/{taskChecklist.length}
                                          </div>
                                        )}
                                        {task.assigneeId && (
                                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                            <User className="w-3 h-3" /> {getMemberName(task.assigneeId)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>

                    <button
                      onClick={() => openCreate(colIndex)}
                      className="flex items-center gap-1.5 w-full mt-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t.workspace.create}
                    </button>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? t.workspace.editTask : t.workspace.newTask}</DialogTitle>
            <DialogDescription>
              {editingTask ? t.workspace.editTaskDesc : t.workspace.newTaskDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.workspace.taskName}</Label>
              <Input placeholder={t.workspace.taskNamePlaceholder} value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.workspace.taskDescription}</Label>
              <Textarea placeholder={t.workspace.taskDescPlaceholder} value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.workspace.priority}</Label>
                <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.workspace.assignee}</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger><SelectValue placeholder={t.workspace.selectAssignee} /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.workspace.tagsSeparated}</Label>
              <Input placeholder={t.workspace.tagsPlaceholder} value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.workspace.startDate}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : t.workspace.selectDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t.workspace.dueDate}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "dd/MM/yyyy") : t.workspace.selectDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {editingTask && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> {t.workspace.checklist}
                    </Label>
                    {checklist.length > 0 && (
                      <span className="text-xs text-muted-foreground">{checkDone}/{checklist.length}</span>
                    )}
                  </div>
                  {checklist.length > 0 && (
                    <div className="space-y-1.5">
                      {checklist.map(item => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <Checkbox checked={item.done} onCheckedChange={() => toggleChecklistItem(item.id)} />
                          <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>{item.title}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteChecklistItem(item.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input placeholder={t.workspace.addItem} value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCheckItem()} className="h-8 text-sm" />
                    <Button size="sm" variant="outline" onClick={handleAddCheckItem} disabled={!newCheckItem.trim()}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            {editingTask && (
              <Button variant="destructive" onClick={handleDelete} className="mr-auto">{t.common.delete}</Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleSave} disabled={!title.trim()}>
                {editingTask ? t.common.save : t.common.create}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
