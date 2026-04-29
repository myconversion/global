import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Kanban, Plus, List, LayoutGrid, AlertTriangle, BarChart3, GripVertical, Pencil, Trash2, Trophy, Calendar as CalendarIcon, FolderKanban, X } from 'lucide-react';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format-utils';
import { CRMPipelineAnalysis } from '@/components/crm/CRMPipelineAnalysis';
import { ConvertDealToProjectDialog } from '@/components/crm/ConvertDealToProjectDialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Pipeline {
  id: string;
  name: string;
  product_service: string | null;
  stages: { name: string; probability: number; order: number; max_days?: number }[];
  is_default: boolean;
}

interface PipelineDeal {
  id: string;
  pipeline_id: string;
  stage_name: string;
  title: string;
  value: number;
  responsible_id: string | null;
  contact_id: string | null;
  crm_company_id: string | null;
  expected_close_date: string | null;
  loss_reason: string | null;
  entered_stage_at: string;
  created_at: string;
  converted_project_id: string | null;
}

export default function CRMPipelinePage() {
  const { currentCompany, supabaseUser } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const initialView = searchParams.get('view');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(initialView === 'list' ? 'list' : 'kanban');
  const [showAnalysis, setShowAnalysis] = useState(initialView === 'analysis');
  const [quickFilter, setQuickFilter] = useState<'all' | 'in_progress' | 'won' | 'lost' | 'overdue'>(
    (searchParams.get('filter') as any) || 'all'
  );
  const [loading, setLoading] = useState(true);

  // Create pipeline dialog
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [formPipelineName, setFormPipelineName] = useState('');
  const [formProductService, setFormProductService] = useState('');
  const defaultStages = useMemo(() => [
    { name: 'Lead', probability: 10 },
    { name: t.crmPipeline.defaultStageContact || 'Contact', probability: 25 },
    { name: t.crmPipeline.defaultStageProposal || 'Proposal', probability: 50 },
    { name: t.crmPipeline.defaultStageNegotiation || 'Negotiation', probability: 75 },
    { name: t.crmPipeline.defaultStageWon || 'Won', probability: 100 },
    { name: t.crmPipeline.defaultStageLost || 'Lost', probability: 0 },
  ], [t]);
  const [formStages, setFormStages] = useState<{ name: string; probability: number; max_days?: number }[]>(defaultStages);

  // Create deal dialog
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [formDealTitle, setFormDealTitle] = useState('');
  const [formDealValue, setFormDealValue] = useState('');
  const [formDealStage, setFormDealStage] = useState('');

  // Edit deal dialog
  const [editDeal, setEditDeal] = useState<PipelineDeal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editExpectedClose, setEditExpectedClose] = useState('');

  // Loss reason dialog
  const [lossReasonDeal, setLossReasonDeal] = useState<{ dealId: string; stageName: string } | null>(null);
  const [lossReason, setLossReason] = useState('');

  // Convert-to-project dialog
  const [convertState, setConvertState] = useState<{ deal: PipelineDeal; targetStage: string | null } | null>(null);

  // Delete pipeline dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Contacts & companies for linking
  const [contacts, setContacts] = useState<{ id: string; name: string; temperature?: string | null }[]>([]);
  const [crmCompanies, setCrmCompanies] = useState<{ id: string; razao_social: string }[]>([]);
  const [formContactId, setFormContactId] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [editContactId, setEditContactId] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const sortedStages = useMemo(() =>
    selectedPipeline?.stages?.sort((a, b) => a.order - b.order) ?? [],
    [selectedPipeline]
  );

  // Check if a stage is the "lost" stage (probability === 0)
  const isLostStage = useCallback((stageName: string) => {
    const stage = sortedStages.find(s => s.name === stageName);
    return stage?.probability === 0;
  }, [sortedStages]);

  const isWonStage = useCallback((stageName: string) => {
    const stage = sortedStages.find(s => s.name === stageName);
    return stage?.probability === 100;
  }, [sortedStages]);

  // Apply quick filter to deals
  const filteredDeals = useMemo(() => {
    if (quickFilter === 'all') return deals;
    return deals.filter(d => {
      const stage = sortedStages.find(s => s.name === d.stage_name);
      const prob = stage?.probability ?? 50;
      if (quickFilter === 'won') return prob === 100;
      if (quickFilter === 'lost') return prob === 0;
      if (quickFilter === 'in_progress') return prob > 0 && prob < 100;
      if (quickFilter === 'overdue') {
        const days = Math.floor((Date.now() - new Date(d.entered_stage_at).getTime()) / 86400000);
        return stage?.max_days ? days > stage.max_days : false;
      }
      return true;
    });
  }, [deals, quickFilter, sortedStages]);

  // Sync filter to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (quickFilter === 'all') params.delete('filter');
    else params.set('filter', quickFilter);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickFilter]);

  const fetchPipelines = async () => {
    if (!currentCompany) return;
    const { data } = await supabase
      .from('crm_pipelines')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('created_at');
    if (data) {
      const mapped = data.map((p: any) => ({ ...p, stages: p.stages ?? [] })) as Pipeline[];
      setPipelines(mapped);
      if (mapped.length > 0 && !selectedPipelineId) {
        const def = mapped.find(p => p.is_default) || mapped[0];
        setSelectedPipelineId(def.id);
      }
    }
    setLoading(false);
  };

  const fetchDeals = async () => {
    if (!currentCompany || !selectedPipelineId) return;
    const { data } = await supabase
      .from('crm_pipeline_deals')
      .select('*')
      .eq('company_id', currentCompany.id)
      .eq('pipeline_id', selectedPipelineId)
      .order('created_at');
    if (data) setDeals(data as PipelineDeal[]);
  };

  const fetchLinkedEntities = async () => {
    if (!currentCompany) return;
    const [{ data: c }, { data: co }] = await Promise.all([
      supabase.from('crm_contacts').select('id, name, temperature').eq('company_id', currentCompany.id).order('name').limit(500),
      supabase.from('crm_companies').select('id, razao_social').eq('company_id', currentCompany.id).order('razao_social').limit(500),
    ]);
    if (c) setContacts(c);
    if (co) setCrmCompanies(co);
  };

  useEffect(() => { fetchPipelines(); fetchLinkedEntities(); }, [currentCompany]);
  useEffect(() => { if (selectedPipelineId) fetchDeals(); }, [selectedPipelineId]);

  // ── Drag and Drop ──
  const moveDealToStage = async (dealId: string, newStageName: string) => {
    // Snapshot for rollback
    const previousDeals = deals;
    const newTimestamp = new Date().toISOString();
    // Optimistic update FIRST
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_name: newStageName, entered_stage_at: newTimestamp } : d));
    const { error } = await supabase
      .from('crm_pipeline_deals')
      .update({ stage_name: newStageName, entered_stage_at: newTimestamp })
      .eq('id', dealId);
    if (error) {
      // Rollback on error
      setDeals(previousDeals);
      toast({ title: t.crmPipeline.errorMoving, variant: 'destructive' });
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const oldStage = result.source.droppableId;
    if (newStage === oldStage) return;

    if (isLostStage(newStage)) {
      setLossReasonDeal({ dealId, stageName: newStage });
      setLossReason('');
      return;
    }

    if (isWonStage(newStage)) {
      const deal = deals.find(d => d.id === dealId);
      if (deal && !deal.converted_project_id) {
        setConvertState({ deal, targetStage: newStage });
        return;
      }
    }

    moveDealToStage(dealId, newStage);
    toast({ title: `${t.crmPipeline.movedTo} ${newStage}` });
  };

  const handleConfirmLoss = async () => {
    if (!lossReasonDeal) return;
    await supabase
      .from('crm_pipeline_deals')
      .update({
        stage_name: lossReasonDeal.stageName,
        entered_stage_at: new Date().toISOString(),
        loss_reason: lossReason || null,
      })
      .eq('id', lossReasonDeal.dealId);
    setDeals(prev => prev.map(d => d.id === lossReasonDeal.dealId
      ? { ...d, stage_name: lossReasonDeal.stageName, loss_reason: lossReason || null, entered_stage_at: new Date().toISOString() }
      : d));
    toast({ title: `${t.crmPipeline.movedTo} ${lossReasonDeal.stageName}` });
    setLossReasonDeal(null);
  };

  // ── CRUD ──
  const handleCreatePipeline = async () => {
    if (!formPipelineName.trim() || !currentCompany) return;
    const stages = formStages.map((s, i) => ({ ...s, order: i }));
    const { error } = await supabase.from('crm_pipelines').insert({
      company_id: currentCompany.id,
      name: formPipelineName.trim(),
      product_service: formProductService || null,
      stages: stages as any,
      is_default: pipelines.length === 0,
      created_by: supabaseUser?.id,
    });
    if (error) {
      toast({ title: t.crmPipeline.errorCreatingFunnel, variant: 'destructive' });
    } else {
      toast({ title: t.crmPipeline.funnelCreated });
      setPipelineDialogOpen(false);
      setFormPipelineName('');
      setFormProductService('');
      setFormStages(defaultStages);
      fetchPipelines();
    }
  };

  const handleDeletePipeline = async () => {
    if (!selectedPipelineId || !currentCompany) return;
    const { count } = await supabase
      .from('crm_pipeline_deals')
      .select('id', { count: 'exact', head: true })
      .eq('pipeline_id', selectedPipelineId)
      .eq('company_id', currentCompany.id);
    if (count && count > 0) {
      toast({ title: t.crmPipeline.cannotDeleteFunnelWithDeals, variant: 'destructive' });
      setDeleteDialogOpen(false);
      return;
    }
    const { error } = await supabase.from('crm_pipelines').delete().eq('id', selectedPipelineId);
    if (error) {
      toast({ title: t.crmPipeline.errorDeletingFunnel, variant: 'destructive' });
    } else {
      toast({ title: t.crmPipeline.funnelDeleted });
      setSelectedPipelineId('');
      setDeals([]);
      fetchPipelines();
    }
    setDeleteDialogOpen(false);
  };

  const handleCreateDeal = async () => {
    if (!formDealTitle.trim() || !currentCompany || !selectedPipelineId) return;
    const stage = formDealStage || sortedStages[0]?.name || '';
    const { error } = await supabase.from('crm_pipeline_deals').insert({
      company_id: currentCompany.id,
      pipeline_id: selectedPipelineId,
      stage_name: stage,
      title: formDealTitle.trim(),
      value: Number(formDealValue) || 0,
      responsible_id: supabaseUser?.id,
      created_by: supabaseUser?.id,
      contact_id: formContactId || null,
      crm_company_id: formCompanyId || null,
    });
    if (error) {
      toast({ title: t.crmPipeline.errorCreatingDeal, variant: 'destructive' });
    } else {
      toast({ title: t.crmPipeline.dealCreated });
      setDealDialogOpen(false);
      setFormDealTitle('');
      setFormDealValue('');
      setFormDealStage('');
      setFormContactId('');
      setFormCompanyId('');
      fetchDeals();
    }
  };

  const openEditDeal = (deal: PipelineDeal) => {
    setEditDeal(deal);
    setEditTitle(deal.title);
    setEditValue(String(deal.value));
    setEditExpectedClose(deal.expected_close_date || '');
    setEditContactId(deal.contact_id || '');
    setEditCompanyId(deal.crm_company_id || '');
  };

  const handleUpdateDeal = async () => {
    if (!editDeal) return;
    const { error } = await supabase.from('crm_pipeline_deals').update({
      title: editTitle.trim(),
      value: Number(editValue) || 0,
      expected_close_date: editExpectedClose || null,
      contact_id: editContactId || null,
      crm_company_id: editCompanyId || null,
    }).eq('id', editDeal.id);
    if (error) {
      toast({ title: t.crmPipeline.errorUpdatingDeal, variant: 'destructive' });
    } else {
      toast({ title: t.crmPipeline.dealUpdated });
      setEditDeal(null);
      fetchDeals();
    }
  };

  const handleDeleteDeal = async (id: string) => {
    const { error } = await supabase.from('crm_pipeline_deals').delete().eq('id', id);
    if (!error) {
      setDeals(prev => prev.filter(d => d.id !== id));
      setEditDeal(null);
      toast({ title: t.crmPipeline.dealRemoved });
    }
  };

  const getDaysInStage = (enteredAt: string) => {
    return Math.floor((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40 mb-1" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[180px]" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px] space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Kanban className="w-6 h-6 text-primary" /> {t.crmPipeline.title} <InfoTooltip text={t.crmPipeline.tooltip} />
          </h1>
          <p className="text-sm text-muted-foreground">{t.crmPipeline.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {pipelines.length > 0 && (
            <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <SelectTrigger className="w-[220px] h-8 text-sm" title={pipelines.find(p => p.id === selectedPipelineId)?.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={p.id} title={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex border rounded-md">
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="rounded-r-none h-8" onClick={() => setViewMode('kanban')}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-l-none h-8" onClick={() => setViewMode('list')}>
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPipelineDialogOpen(true); }} aria-label={t.crmPipeline.createFunnel}>
            <Plus className="w-3.5 h-3.5" /> {t.crmPipeline.funnel}
          </Button>
          {selectedPipeline && (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {selectedPipeline && (
            <>
              <Button size="sm" variant={showAnalysis ? 'default' : 'outline'} className="gap-1.5" onClick={() => setShowAnalysis(!showAnalysis)}>
                <BarChart3 className="w-3.5 h-3.5" /> {t.crmPipeline.analysis}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => { setFormDealStage(sortedStages[0]?.name || ''); setDealDialogOpen(true); }}>
                <Plus className="w-3.5 h-3.5" /> {t.crmPipeline.deal}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      {pipelines.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{t.crmPipeline.quickFilters}:</span>
          {([
            { key: 'all', label: t.crmPipeline.filterAll },
            { key: 'in_progress', label: t.crmPipeline.filterInProgress },
            { key: 'won', label: t.crmPipeline.filterWon },
            { key: 'lost', label: t.crmPipeline.filterLost },
            { key: 'overdue', label: t.crmPipeline.filterOverdue },
          ] as const).map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={quickFilter === f.key ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setQuickFilter(f.key)}
            >
              {f.label}
              {quickFilter === f.key && (
                <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">{filteredDeals.length}</Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {showAnalysis && selectedPipeline && (
        <CRMPipelineAnalysis stages={sortedStages} deals={filteredDeals} allDeals={deals} />
      )}

      {/* Won Deals Section — shown when filter=won */}
      {quickFilter === 'won' && selectedPipeline && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-semibold">{t.crmPipeline.wonSection}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t.crmPipeline.totalWonValue}</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatCurrency(filteredDeals.reduce((s, d) => s + d.value, 0), language)}
                </p>
              </div>
            </div>
            {filteredDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t.crmPipeline.noDealInFunnel}</p>
            ) : (
              <div className="space-y-2">
                {filteredDeals.map(deal => {
                  const days = Math.floor((new Date(deal.entered_stage_at).getTime() - new Date(deal.created_at).getTime()) / 86400000);
                  const contact = contacts.find(c => c.id === deal.contact_id);
                  const company = crmCompanies.find(c => c.id === deal.crm_company_id);
                  return (
                    <div
                      key={deal.id}
                      onClick={() => openEditDeal(deal)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{deal.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[contact?.name, company?.razao_social].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(deal.value, language)}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                          <CalendarIcon className="w-3 h-3" />
                          {Math.max(days, 0)} {t.crmPipeline.durationDays}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lost Deals Section — shown when filter=lost */}
      {quickFilter === 'lost' && selectedPipeline && (
        <Card className="border-destructive/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-destructive" />
                <h2 className="text-base font-semibold">{t.crmPipeline.lostSection}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t.crmPipeline.totalLostValue}</p>
                <p className="text-lg font-bold text-destructive">
                  {formatCurrency(filteredDeals.reduce((s, d) => s + d.value, 0), language)}
                </p>
              </div>
            </div>
            {filteredDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t.crmPipeline.noDealInFunnel}</p>
            ) : (
              <div className="space-y-2">
                {filteredDeals.map(deal => {
                  const days = Math.floor((new Date(deal.entered_stage_at).getTime() - new Date(deal.created_at).getTime()) / 86400000);
                  const contact = contacts.find(c => c.id === deal.contact_id);
                  const company = crmCompanies.find(c => c.id === deal.crm_company_id);
                  return (
                    <div
                      key={deal.id}
                      onClick={() => openEditDeal(deal)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-destructive/5 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{deal.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[contact?.name, company?.razao_social].filter(Boolean).join(' · ') || '—'}
                        </p>
                        {deal.loss_reason && (
                          <p className="text-xs text-destructive truncate mt-0.5">{t.crmPipeline.reasonPrefix}: {deal.loss_reason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-destructive">{formatCurrency(deal.value, language)}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                          <CalendarIcon className="w-3 h-3" />
                          {Math.max(days, 0)} {t.crmPipeline.durationDays}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Kanban className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">{t.crmPipeline.noFunnels}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.crmPipeline.createFirstFunnel}</p>
            <Button type="button" size="sm" className="mt-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPipelineDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> {t.crmPipeline.createFunnel}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' && quickFilter !== 'won' && quickFilter !== 'lost' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {sortedStages.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage_name === stage.name);
              const totalValue = stageDeals.reduce((s, d) => s + d.value, 0);
              return (
                <Droppable droppableId={stage.name} key={stage.name}>
                  {(provided, snapshot) => (
                    <div
                      className={`flex-shrink-0 w-[280px] transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5 rounded-lg' : ''}`}
                    >
                      <div className={`rounded-lg p-2 ${stage.probability === 100 ? 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-800' : 'bg-muted/50'}`}>
                        <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                          <span className={`text-sm font-semibold ${stage.probability === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>{stage.name}</span>
                          <div className="flex flex-col items-end">
                            <Badge variant="secondary" className="text-xs">
                              {stageDeals.length} {stageDeals.length !== 1 ? t.crmPipeline.dealPlural : t.crmPipeline.dealSingular}
                            </Badge>
                            <span className="text-xs font-semibold text-primary mt-0.5">{formatCurrency(totalValue, language)}</span>
                          </div>
                        </div>
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 min-h-[200px] h-full"
                        >
                          {stageDeals.map((deal, index) => {
                            const days = getDaysInStage(deal.entered_stage_at);
                            const overdue = stage.max_days && days > stage.max_days;
                            const daysToClose = deal.expected_close_date
                              ? Math.ceil((new Date(deal.expected_close_date).getTime() - Date.now()) / 86400000)
                              : null;
                            const closingSoon = daysToClose !== null && daysToClose >= 0 && daysToClose <= 3 && stage.probability !== 100 && stage.probability !== 0;
                            const isUrgent = overdue || closingSoon;
                            return (
                              <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    style={{
                                      ...dragProvided.draggableProps.style,
                                      cursor: dragSnapshot.isDragging ? 'grabbing' : 'grab',
                                    }}
                                    className={dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 rounded-lg' : ''}
                                  >
                                    <Card
                                      className="hover:shadow-md transition-all hover:border-primary/30 select-none"
                                      onClick={() => {
                                        if (dragSnapshot.isDragging) return;
                                        openEditDeal(deal);
                                      }}
                                    >
                                      <CardContent className="p-3">
                                        <div className="flex items-start gap-2">
                                          <div className="mt-0.5 text-muted-foreground/40 pointer-events-none">
                                            <GripVertical className="w-3.5 h-3.5" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              {(() => {
                                                const contact = deal.contact_id ? contacts.find(c => c.id === deal.contact_id) : null;
                                                const temp = contact?.temperature;
                                                const tempColors: Record<string, string> = { hot: 'bg-destructive', warm: 'bg-amber-500', cold: 'bg-blue-500' };
                                                return temp ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tempColors[temp] ?? 'bg-muted-foreground'}`} /> : null;
                                              })()}
                                              <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                                              {isUrgent && (
                                                <span className="ml-auto flex-shrink-0 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                                                  <AlertTriangle className="w-2.5 h-2.5" />
                                                  {overdue ? t.crmPipeline.filterOverdue : t.crmPipeline.urgent}
                                                </span>
                                              )}
                                            </div>
                                            {(deal.contact_id || deal.crm_company_id) && (
                                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {deal.contact_id && contacts.find(c => c.id === deal.contact_id)?.name}
                                                {deal.contact_id && deal.crm_company_id && ' · '}
                                                {deal.crm_company_id && crmCompanies.find(c => c.id === deal.crm_company_id)?.razao_social}
                                              </p>
                                            )}
                                            <p className="text-xs text-primary font-semibold mt-1">{formatCurrency(deal.value, language)}</p>
                                            <div className="flex items-center justify-between mt-2">
                                              <span className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                                {overdue && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                                                {days}{t.crmPipeline.daysInStage}
                                              </span>
                                              {isWonStage(deal.stage_name) && (
                                                deal.converted_project_id ? (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/projects/workspace/${deal.converted_project_id}`); }}
                                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                                                  >
                                                    <FolderKanban className="w-2.5 h-2.5" />
                                                    {t.crmPipeline.viewProject}
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setConvertState({ deal, targetStage: null }); }}
                                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 hover:bg-primary/20 transition-colors"
                                                  >
                                                    <FolderKanban className="w-2.5 h-2.5" />
                                                    {t.crmPipeline.convertToProject}
                                                  </button>
                                                )
                                              )}
                                            </div>
                                            {deal.loss_reason && (
                                              <p className="text-xs text-destructive mt-1 truncate">{t.crmPipeline.reasonPrefix}: {deal.loss_reason}</p>
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
                          {stageDeals.length === 0 && (
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground pointer-events-none">
                              {t.crmPipeline.dragDealsHere}
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      ) : viewMode === 'list' && quickFilter !== 'won' && quickFilter !== 'lost' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">{t.crmPipeline.titleCol}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{t.crmPipeline.stageCol}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{t.crmPipeline.valueCol}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{t.crmPipeline.daysCol}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{t.crmPipeline.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map(d => (
                  <tr key={d.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => openEditDeal(d)}>
                    <td className="p-3 font-medium">{d.title}</td>
                    <td className="p-3"><Badge variant={isWonStage(d.stage_name) ? 'default' : 'secondary'} className={isWonStage(d.stage_name) ? 'bg-emerald-500' : ''}>{d.stage_name}</Badge></td>
                    <td className="p-3 text-right">{formatCurrency(d.value, language)}</td>
                    <td className="p-3 text-right">{getDaysInStage(d.entered_stage_at)}d</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        {isWonStage(d.stage_name) && (
                          d.converted_project_id ? (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); navigate(`/projects/workspace/${d.converted_project_id}`); }}>
                              <FolderKanban className="w-3.5 h-3.5 mr-1" />{t.crmPipeline.viewProject}
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={(e) => { e.stopPropagation(); setConvertState({ deal: d, targetStage: null }); }}>
                              <FolderKanban className="w-3.5 h-3.5 mr-1" />{t.crmPipeline.convertToProject}
                            </Button>
                          )
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditDeal(d); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDeals.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.crmPipeline.noDealInFunnel}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Loss Reason Dialog */}
      <Dialog open={!!lossReasonDeal} onOpenChange={(open) => { if (!open) setLossReasonDeal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.crmPipeline.lossReason}</DialogTitle>
            <DialogDescription>{t.crmPipeline.lossReasonDesc}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={lossReason}
            onChange={e => setLossReason(e.target.value)}
            placeholder={t.crmPipeline.lossReasonPlaceholder}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossReasonDeal(null)}>{t.common.cancel}</Button>
            <Button variant="destructive" onClick={handleConfirmLoss}>{t.crmPipeline.confirmLoss}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Deal Dialog */}
      <Dialog open={!!editDeal} onOpenChange={(open) => { if (!open) setEditDeal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.crmPipeline.editDeal}</DialogTitle>
            <DialogDescription>{t.crmPipeline.editDealDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.dealTitle} *</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.dealValue}</Label>
              <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.expectedClose}</Label>
              <Input type="date" value={editExpectedClose} onChange={e => setEditExpectedClose(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.contactLabel}</Label>
              <Select value={editContactId} onValueChange={setEditContactId}>
                <SelectTrigger><SelectValue placeholder={t.crmPipeline.noneM} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.crmPipeline.noneM}</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.companyLabel}</Label>
              <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                <SelectTrigger><SelectValue placeholder={t.crmPipeline.noneF} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.crmPipeline.noneF}</SelectItem>
                  {crmCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editDeal?.loss_reason && (
              <div className="space-y-1.5">
                <Label>{t.crmPipeline.lossReasonLabel}</Label>
                <p className="text-sm text-destructive">{editDeal.loss_reason}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={() => editDeal && handleDeleteDeal(editDeal.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> {t.common.delete}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDeal(null)}>{t.common.cancel}</Button>
              <Button onClick={handleUpdateDeal} disabled={!editTitle.trim()}>{t.common.save}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Pipeline Dialog */}
      <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.crmPipeline.newFunnel}</DialogTitle>
            <DialogDescription>{t.crmPipeline.newFunnelDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.funnelName} *</Label>
              <Input value={formPipelineName} onChange={e => setFormPipelineName(e.target.value)} placeholder={t.placeholders.funnelName} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.productService}</Label>
              <Input value={formProductService} onChange={e => setFormProductService(e.target.value)} placeholder={t.placeholders.productService} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.stages}</Label>
              {formStages.map((stage, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={stage.name} onChange={e => { const c = [...formStages]; c[i] = { ...c[i], name: e.target.value }; setFormStages(c); }} className="flex-1 h-8 text-sm" placeholder={t.crmPipeline.stagePlaceholder} />
                  <Input type="number" min="0" max="100" value={stage.probability} onChange={e => { const c = [...formStages]; c[i] = { ...c[i], probability: Number(e.target.value) }; setFormStages(c); }} className="w-20 h-8 text-sm" placeholder="%" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreatePipeline} disabled={!formPipelineName.trim()}>{t.crmPipeline.createFunnel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Deal Dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.crmPipeline.newDeal}</DialogTitle>
            <DialogDescription>{t.crmPipeline.newDealDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.dealTitle} *</Label>
              <Input value={formDealTitle} onChange={e => setFormDealTitle(e.target.value)} placeholder={t.crmPipeline.opportunityName} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.dealValue}</Label>
              <Input type="number" value={formDealValue} onChange={e => setFormDealValue(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.initialStage}</Label>
              <Select value={formDealStage} onValueChange={setFormDealStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sortedStages.map(s => <SelectItem key={s.name} value={s.name}>{s.name} ({s.probability}%)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.contactLabel}</Label>
              <Select value={formContactId} onValueChange={setFormContactId}>
                <SelectTrigger><SelectValue placeholder={t.crmPipeline.noneM} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.crmPipeline.noneM}</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.companyLabel}</Label>
              <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                <SelectTrigger><SelectValue placeholder={t.crmPipeline.noneF} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.crmPipeline.noneF}</SelectItem>
                  {crmCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateDeal} disabled={!formDealTitle.trim()}>{t.crmPipeline.newDeal}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete pipeline confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.crmPipeline.deleteFunnel}</AlertDialogTitle>
            <AlertDialogDescription>{t.crmPipeline.confirmDeleteFunnel}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePipeline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert deal to project dialog */}
      <ConvertDealToProjectDialog
        deal={convertState?.deal ?? null}
        targetStageName={convertState?.targetStage ?? null}
        contactName={convertState?.deal?.contact_id ? contacts.find(c => c.id === convertState.deal.contact_id)?.name : undefined}
        companyName={convertState?.deal?.crm_company_id ? crmCompanies.find(c => c.id === convertState.deal.crm_company_id)?.razao_social : undefined}
        open={!!convertState}
        onOpenChange={(o) => { if (!o) setConvertState(null); }}
        onSuccess={({ dealId, projectId, newStageName }) => {
          setDeals(prev => prev.map(d => d.id === dealId ? {
            ...d,
            converted_project_id: projectId,
            ...(newStageName ? { stage_name: newStageName, entered_stage_at: new Date().toISOString() } : {}),
          } : d));
          toast({
            title: t.crmPipeline.dealConverted,
            description: t.crmPipeline.viewProject,
            action: (
              <Button size="sm" variant="outline" onClick={() => navigate(`/projects/workspace/${projectId}`)}>
                {t.crmPipeline.viewProject}
              </Button>
            ) as any,
          });
        }}
      />
    </div>
  );
}
