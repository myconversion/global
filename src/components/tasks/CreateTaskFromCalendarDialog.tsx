import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TaskPriority } from '@/types/index';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

export default function CreateTaskFromCalendarDialog({ open, onOpenChange, selectedDate }: Props) {
  const { t } = useI18n();
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const { projects, deliverables, createTask } = useProjectsContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('09:00');
  const [projectId, setProjectId] = useState('');
  const [deliverableId, setDeliverableId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [clientType, setClientType] = useState<'none' | 'contact' | 'company'>('none');
  const [clientId, setClientId] = useState('');
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const activeProjects = projects.filter(p => p.status !== 'archived');
  const projectDeliverables = deliverables.filter(d => d.projectId === projectId);

  // Load CRM contacts/companies when dialog opens
  useEffect(() => {
    if (!open || !companyId) return;
    const load = async () => {
      const [cRes, coRes] = await Promise.all([
        supabase.from('crm_contacts').select('id, name').eq('company_id', companyId).order('name').limit(200),
        supabase.from('crm_companies').select('id, razao_social').eq('company_id', companyId).order('razao_social').limit(200),
      ]);
      if (cRes.data) setContacts(cRes.data.map(c => ({ id: c.id, name: c.name })));
      if (coRes.data) setCompanies(coRes.data.map(c => ({ id: c.id, name: c.razao_social })));
    };
    load();
  }, [open, companyId]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setTime('09:00');
      setProjectId('');
      setDeliverableId('');
      setPriority('medium');
      setClientType('none');
      setClientId('');
    }
  }, [open]);

  // Auto-select first deliverable
  useEffect(() => {
    if (projectDeliverables.length > 0 && !projectDeliverables.find(d => d.id === deliverableId)) {
      setDeliverableId(projectDeliverables[0].id);
    }
  }, [projectId, projectDeliverables]);

  const handleSubmit = async () => {
    if (!title.trim() || !deliverableId) return;
    setLoading(true);
    try {
      const dueDate = `${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`;
      const descParts: string[] = [];
      if (description) descParts.push(description);
      if (clientType !== 'none' && clientId) {
        const clientName = clientType === 'contact'
          ? contacts.find(c => c.id === clientId)?.name
          : companies.find(c => c.id === clientId)?.name;
        if (clientName) {
          descParts.push(`🔗 ${clientType === 'contact' ? t.crm.contact : t.crm.company}: ${clientName}`);
        }
      }
      await createTask({
        projectDeliverableId: deliverableId,
        title: title.trim(),
        description: descParts.join('\n') || undefined,
        priority,
        dueDate,
      });
      toast.success(t.tasks.taskCreated || 'Task created');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Error creating task');
    } finally {
      setLoading(false);
    }
  };

  const PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: t.tasks.low,
    medium: t.tasks.medium,
    high: t.tasks.high,
    urgent: t.tasks.urgent,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t.workspace?.newTask || 'New Task'}
          </DialogTitle>
          <DialogDescription>
            {format(selectedDate, 'PPP')} — {t.workspace?.newTaskDesc || 'Fill in the fields to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>{t.tasks.taskTitle || 'Title'}</Label>
            <Input
              placeholder={t.tasks.taskTitlePlaceholder || 'Task title...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.tasks.dueDate || 'Due Date'}</Label>
              <Input value={format(selectedDate, 'yyyy-MM-dd')} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.tasks.time || 'Time'}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* Project + Deliverable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.tasks.project}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.tasks.selectProject || 'Select project'} />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.workspace?.deliverable || 'Deliverable'}</Label>
              <Select value={deliverableId} onValueChange={setDeliverableId} disabled={!projectId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.workspace?.selectDeliverable || 'Select deliverable'} />
                </SelectTrigger>
                <SelectContent>
                  {projectDeliverables.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>{t.tasks.priority}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link client */}
          <div className="space-y-1.5">
            <Label>{t.tasks.linkClient || 'Link client'}</Label>
            <Select value={clientType} onValueChange={(v) => { setClientType(v as any); setClientId(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.tasks.noLink || 'No link'}</SelectItem>
                <SelectItem value="contact">{t.crm.contact || 'Person'}</SelectItem>
                <SelectItem value="company">{t.crm.company || 'Company'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {clientType !== 'none' && (
            <div className="space-y-1.5">
              <Label>
                {clientType === 'contact' ? (t.crm.selectContact || 'Select person') : (t.crm.selectCompany || 'Select company')}
              </Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={clientType === 'contact' ? (t.crm.selectContact || 'Select person') : (t.crm.selectCompany || 'Select company')} />
                </SelectTrigger>
                <SelectContent>
                  {(clientType === 'contact' ? contacts : companies).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t.tasks.description || 'Description'}</Label>
            <Textarea
              placeholder={t.tasks.descriptionPlaceholder || 'Optional description...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common?.cancel || 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !deliverableId || loading}>
            {loading ? '...' : (t.common?.create || 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
