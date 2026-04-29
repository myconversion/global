import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderKanban, LayoutGrid, List, CalendarDays, GanttChart,
  CheckCircle2, Plus, Settings, Trash2, Pencil, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import WorkspaceKanbanView from '@/components/projects/WorkspaceKanbanView';
import WorkspaceListView from '@/components/projects/WorkspaceListView';
import WorkspaceCalendarView from '@/components/projects/WorkspaceCalendarView';
import WorkspaceTimelineView from '@/components/projects/WorkspaceTimelineView';
import WorkspaceApprovalsView from '@/components/projects/WorkspaceApprovalsView';

interface WorkspaceColumn {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

const DEFAULT_COLUMNS = [
  { name: 'Solicitado', color: '#6B7280' },
  { name: 'Produzindo', color: '#3B82F6' },
  { name: 'Aguardando Aprovação', color: '#F59E0B' },
  { name: 'Aprovado', color: '#10B981' },
  { name: 'Programado', color: '#8B5CF6' },
];

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProjectById, getProjectDeliverables, addDeliverable, deleteDeliverable, updateDeliverable } = useProjectsContext();
  const { currentCompany } = useAuth();
  const { t } = useI18n();

  const project = getProjectById(projectId!);
  const deliverables = getProjectDeliverables(projectId!);

  const [activeTab, setActiveTab] = useState('board');
  const [columns, setColumns] = useState<WorkspaceColumn[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(true);

  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<WorkspaceColumn | null>(null);
  const [columnName, setColumnName] = useState('');
  const [columnColor, setColumnColor] = useState('#6B7280');

  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null);

  const [addDelOpen, setAddDelOpen] = useState(false);
  const [newDelName, setNewDelName] = useState('');

  const companyId = currentCompany?.id;

  const fetchColumns = useCallback(async () => {
    if (!projectId || !companyId) return;
    setLoadingColumns(true);
    const { data } = await supabase
      .from('workspace_columns')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (data && data.length > 0) {
      setColumns(data.map(d => ({ id: d.id, name: d.name, color: d.color ?? '#6B7280', sort_order: d.sort_order })));
    } else {
      const rows = DEFAULT_COLUMNS.map((col, i) => ({
        project_id: projectId, company_id: companyId,
        name: col.name, color: col.color, sort_order: i,
      }));
      const { data: created } = await supabase.from('workspace_columns').insert(rows).select();
      if (created) {
        setColumns(created.map(d => ({ id: d.id, name: d.name, color: d.color ?? '#6B7280', sort_order: d.sort_order })));
      }
    }
    setLoadingColumns(false);
  }, [projectId, companyId]);

  useEffect(() => { fetchColumns(); }, [fetchColumns]);

  useEffect(() => {
    if (deliverables.length > 0 && !selectedDeliverableId) {
      setSelectedDeliverableId(deliverables[0].id);
    }
  }, [deliverables, selectedDeliverableId]);

  const handleAddColumn = async () => {
    if (!columnName.trim() || !companyId || !projectId) return;
    if (editingColumn) {
      await supabase.from('workspace_columns').update({ name: columnName.trim(), color: columnColor }).eq('id', editingColumn.id);
    } else {
      await supabase.from('workspace_columns').insert({
        project_id: projectId, company_id: companyId,
        name: columnName.trim(), color: columnColor, sort_order: columns.length,
      });
    }
    setColumnDialogOpen(false); setEditingColumn(null);
    setColumnName(''); setColumnColor('#6B7280');
    fetchColumns();
  };

  const handleDeleteColumn = async (colId: string) => {
    await supabase.from('workspace_columns').delete().eq('id', colId);
    fetchColumns();
  };

  const handleAddDeliverable = async () => {
    if (!newDelName.trim()) return;
    const del = await addDeliverable(projectId!, newDelName.trim());
    if (del) setSelectedDeliverableId(del.id);
    setNewDelName(''); setAddDelOpen(false);
  };

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t.workspace.workspaceNotFound}</p>
        <Button variant="link" onClick={() => navigate('/projects')}>{t.workspace.backToProject}</Button>
      </div>
    );
  }

  const COLUMN_COLORS_PALETTE = [
    '#6B7280', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6',
    '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <FolderKanban className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">{project.name}</h1>
        <Badge variant="secondary" className="text-xs">
          {project.status === 'active' ? t.workspace.active : project.status === 'paused' ? t.workspace.paused : project.status === 'completed' ? t.workspace.completed : t.workspace.archived}
        </Badge>
      </div>
      {project.description && (
        <p className="text-sm text-muted-foreground mb-4 ml-8">{project.description}</p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> {t.workspace.board}</TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5"><List className="w-3.5 h-3.5" /> {t.workspace.list}</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {t.workspace.calendar}</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5"><GanttChart className="w-3.5 h-3.5" /> {t.workspace.timeline}</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {t.workspace.approvals}</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {deliverables.length > 0 && (
              <Select value={selectedDeliverableId ?? ''} onValueChange={setSelectedDeliverableId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder={t.workspace.deliverable} />
                </SelectTrigger>
                <SelectContent>
                  {deliverables.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setAddDelOpen(true)}>
              <Plus className="w-3 h-3" /> {t.workspace.deliverable}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => setColumnDialogOpen(true)}>
              <Settings className="w-3 h-3" /> {t.workspace.columns}
            </Button>
          </div>
        </div>

        <TabsContent value="board">
          {selectedDeliverableId && !loadingColumns ? (
            <WorkspaceKanbanView
              deliverableId={selectedDeliverableId}
              columns={columns}
              onEditColumn={(col) => {
                setEditingColumn(col); setColumnName(col.name); setColumnColor(col.color); setColumnDialogOpen(true);
              }}
              onDeleteColumn={handleDeleteColumn}
            />
          ) : deliverables.length === 0 ? (
            <div className="text-center py-16">
              <LayoutGrid className="w-14 h-14 mx-auto mb-3 text-muted-foreground/20" />
              <h3 className="font-semibold text-muted-foreground mb-1">{t.workspace.createDeliverableFirst}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t.workspace.deliverablesOrganize}</p>
              <Button size="sm" className="gap-1" onClick={() => setAddDelOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> {t.workspace.createDeliverable}
              </Button>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">{t.workspace.loadingColumns}</div>
          )}
        </TabsContent>

        <TabsContent value="list">
          {selectedDeliverableId ? <WorkspaceListView deliverableId={selectedDeliverableId} /> : (
            <div className="text-center py-16 text-muted-foreground">{t.workspace.selectDeliverable}</div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {selectedDeliverableId ? <WorkspaceCalendarView deliverableId={selectedDeliverableId} /> : (
            <div className="text-center py-16 text-muted-foreground">{t.workspace.selectDeliverable}</div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          {selectedDeliverableId ? <WorkspaceTimelineView deliverableId={selectedDeliverableId} /> : (
            <div className="text-center py-16 text-muted-foreground">{t.workspace.selectDeliverable}</div>
          )}
        </TabsContent>

        <TabsContent value="approvals">
          {selectedDeliverableId ? <WorkspaceApprovalsView deliverableId={selectedDeliverableId} /> : (
            <div className="text-center py-16 text-muted-foreground">{t.workspace.selectDeliverable}</div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={columnDialogOpen} onOpenChange={v => { if (!v) { setEditingColumn(null); setColumnName(''); setColumnColor('#6B7280'); } setColumnDialogOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColumn ? t.workspace.editColumn : t.workspace.manageColumns}</DialogTitle>
            <DialogDescription>
              {editingColumn ? t.workspace.editColumnDesc : t.workspace.manageColumnsDesc}
            </DialogDescription>
          </DialogHeader>

          {!editingColumn && (
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-muted-foreground">{t.workspace.currentColumns}</Label>
              {columns.map(col => (
                <div key={col.id} className="flex items-center gap-2 group">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-sm flex-1">{col.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => {
                    setEditingColumn(col); setColumnName(col.name); setColumnColor(col.color);
                  }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteColumn(col.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{editingColumn ? t.workspace.columnName : t.workspace.newColumn}</Label>
              <Input placeholder={t.workspace.columnPlaceholder} value={columnName} onChange={e => setColumnName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.workspace.color}</Label>
              <div className="flex gap-2 flex-wrap">
                {COLUMN_COLORS_PALETTE.map(c => (
                  <button
                    key={c}
                    className={cn("w-7 h-7 rounded-full border-2 transition-all", columnColor === c ? 'border-foreground scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                    onClick={() => setColumnColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setColumnDialogOpen(false); setEditingColumn(null); }}>{t.workspace.close}</Button>
            <Button onClick={handleAddColumn} disabled={!columnName.trim()}>
              {editingColumn ? t.common.save : t.workspace.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDelOpen} onOpenChange={setAddDelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.workspace.newDeliverable}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t.workspace.deliverableName}</Label>
            <Input placeholder={t.workspace.deliverableNamePlaceholder} value={newDelName} onChange={e => setNewDelName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDeliverable()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDelOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddDeliverable} disabled={!newDelName.trim()}>{t.workspace.add}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
