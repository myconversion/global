import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Upload, AlertTriangle, CheckCircle2, Loader2, Info, FileJson, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { importConversionBackup, type ConversionBackup, type ImportResult } from '@/lib/backup-import';
import { exportWorkspaceBackup, downloadBackupFile } from '@/lib/backup-export';
import { supabase } from '@/integrations/supabase/client';

export default function BackupRestoreTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [companyMembers, setCompanyMembers] = useState<{ user_id: string; name: string; email: string }[]>([]);
  const companyId = currentCompany?.id;
  const companyName = currentCompany?.name || 'workspace';
  const isAdmin = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    if (!companyId) return;
    const fetchMembers = async () => {
      const { data: memberships } = await supabase
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', companyId);
      if (!memberships?.length) return;

      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);
      if (profiles) setCompanyMembers(profiles);
    };
    fetchMembers();
  }, [companyId]);

  const handleExport = async () => {
    if (!companyId) return;
    setExporting(true);
    try {
      const data = await exportWorkspaceBackup(companyId, companyName);
      downloadBackupFile(data, companyName);
      toast({ title: t.settingsBackup.exportSuccess });
    } catch (err: any) {
      toast({ title: t.settingsBackup.exportError, description: err.message, variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast({ title: t.settingsBackup.invalidFormat, description: t.settingsBackup.selectJson, variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !companyId) return;
    setImporting(true);
    setImportResult(null);
    setImportProgress(t.settingsBackup.readingFile);

    try {
      const text = await selectedFile.text();
      const backup = JSON.parse(text) as ConversionBackup;

      if (!backup.data) {
        throw new Error(t.settingsBackup.invalidBackupFormat);
      }

      const result = await importConversionBackup(backup, companyId, selectedUserId || undefined, (step, count) => {
        setImportProgress(`${step} (${count})`);
      });

      setImportResult(result);
      setImportProgress('');

      if (result.errors.length === 0) {
        toast({ title: t.settingsBackup.importCompletedSuccess });
      } else {
        toast({ title: t.settingsBackup.importWithWarnings, description: `${result.errors.length} ${t.settingsBackup.errorsFound}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: t.settingsBackup.importError, description: err.message, variant: 'destructive' });
      setImportProgress('');
    }
    setImporting(false);
  };

  const handleResetWorkspace = async () => {
    if (!companyId || resetConfirmText !== 'RESETAR') return;
    setResetting(true);
    try {
      const tables = [
        'crm_flow_logs', 'crm_flows', 'crm_automations', 'crm_campaigns',
        'crm_activities', 'crm_interactions', 'crm_followups',
        'crm_pipeline_deals', 'crm_pipelines',
        'crm_contact_company', 'crm_contacts', 'crm_companies',
        'crm_cadence_settings',
        'tasks', 'project_deliverables', 'projects',
        'invoices', 'transactions',
        'purchase_orders', 'suppliers',
        'deals', 'clients', 'employees',
        'custom_field_definitions', 'custom_roles',
        'team_members', 'teams',
        'integration_configs', 'activity_logs',
        'user_sector_permissions',
      ];

      for (const table of tables) {
        await supabase.from(table as any).delete().eq('company_id', companyId);
      }

      toast({ title: t.settingsBackup.resetSuccess, description: t.settingsBackup.resetSuccessDesc });
      setResetDialogOpen(false);
      setResetConfirmText('');
    } catch (err: any) {
      toast({ title: t.settingsBackup.resetError, description: err.message, variant: 'destructive' });
    }
    setResetting(false);
  };

  if (!isAdmin) return <p className="text-sm text-muted-foreground">{t.settingsBackup.adminOnlyBackup}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">{t.settingsBackup.title}</h3>
        <p className="text-xs text-muted-foreground">{t.settingsBackup.description}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm">{t.settingsBackup.important}</AlertTitle>
        <AlertDescription className="text-xs">
          {t.settingsBackup.importantDesc}
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
             <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4 text-primary" /> {t.settingsBackup.exportBackup}</CardTitle>
             <CardDescription className="text-xs">{t.settingsBackup.exportDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
               <p className="text-xs font-medium text-muted-foreground">{t.settingsBackup.whatIncluded}</p>
               <ul className="text-xs text-muted-foreground space-y-1">
                 <li>• {t.settingsBackup.contactsAndCompanies}</li>
                 <li>• {t.settingsBackup.dealsAndPipelines}</li>
                 <li>• {t.settingsBackup.followupsAndInteractions}</li>
                 <li>• {t.settingsBackup.teamsAndRoles}</li>
                 <li>• {t.settingsBackup.customFields}</li>
               </ul>
            </div>
            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {t.settingsBackup.exportBtn}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
             <CardTitle className="text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> {t.settingsBackup.importBackup}</CardTitle>
             <CardDescription className="text-xs">{t.settingsBackup.importDesc}</CardDescription>
           </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
               <AlertDescription className="text-xs">
                 {t.settingsBackup.importWarning}
               </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full" disabled={importing}>
                <FileJson className="w-4 h-4 mr-2" />
                {selectedFile ? selectedFile.name : t.settingsBackup.selectFile}
              </Button>
            </div>

            {selectedFile && (
              <div className="space-y-1.5">
               <Label className="text-xs">{t.settingsBackup.assignResponsible}</Label>
                 <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                   <SelectTrigger>
                     <SelectValue placeholder={t.settingsBackup.selectUser} />
                  </SelectTrigger>
                  <SelectContent>
                    {companyMembers.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.name} ({m.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedFile && !importing && !importResult && (
              <Button onClick={handleImport} className="w-full">
                <Upload className="w-4 h-4 mr-2" /> {t.settingsBackup.startImport}
              </Button>
            )}

            {importing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> {importProgress}
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {importResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{t.settingsBackup.importCompleted}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="text-xs"><Badge variant="secondary">{importResult.contacts}</Badge> {t.settingsBackup.contactsLabel}</div>
                   <div className="text-xs"><Badge variant="secondary">{importResult.pipelines}</Badge> {t.settingsBackup.pipelinesLabel}</div>
                   <div className="text-xs"><Badge variant="secondary">{importResult.deals}</Badge> {t.settingsBackup.dealsLabel}</div>
                   <div className="text-xs"><Badge variant="secondary">{importResult.followups}</Badge> {t.settingsBackup.followupsLabel}</div>
                   <div className="text-xs"><Badge variant="secondary">{importResult.notes}</Badge> {t.settingsBackup.notesLabel}</div>
                   <div className="text-xs"><Badge variant="secondary">{importResult.teams}</Badge> {t.settingsBackup.teamsLabel}</div>
                   <div className="text-xs"><Badge variant="secondary">{importResult.roles}</Badge> {t.settingsBackup.rolesLabel}</div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                     <p className="text-xs font-medium text-destructive">{importResult.errors.length} {t.settingsBackup.errorsLabel}:</p>
                     <div className="max-h-32 overflow-y-auto text-xs text-destructive space-y-0.5">
                       {importResult.errors.slice(0, 10).map((e, i) => <p key={i}>• {e}</p>)}
                       {importResult.errors.length > 10 && <p>... {t.settingsBackup.andMore} {importResult.errors.length - 10} {t.settingsBackup.errors}</p>}
                     </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div className="space-y-1">
           <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
             <AlertTriangle className="w-4 h-4" /> {t.settingsBackup.dangerZone}
           </h3>
           <p className="text-xs text-muted-foreground">{t.settingsBackup.dangerDesc}</p>
        </div>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
             <p className="text-sm font-medium">{t.settingsBackup.resetWorkspace}</p>
             <p className="text-xs text-muted-foreground">
               {t.settingsBackup.resetDesc}
             </p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0"
            onClick={() => setResetDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> {t.settingsBackup.resetWorkspace}
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle className="text-destructive flex items-center gap-2">
               <AlertTriangle className="w-5 h-5" /> {t.settingsBackup.resetConfirmTitle}
             </DialogTitle>
             <DialogDescription>
               {t.settingsBackup.resetConfirmDesc}
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm">{t.settingsBackup.typeResetConfirm} <strong>{t.settingsBackup.resetConfirmWord}</strong>:</p>
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
               placeholder={t.settingsBackup.resetConfirmWord}
             />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => { setResetDialogOpen(false); setResetConfirmText(''); }}>
               {t.common.cancel}
             </Button>
            <Button
              variant="destructive"
              onClick={handleResetWorkspace}
               disabled={resetConfirmText !== t.settingsBackup.resetConfirmWord || resetting}
             >
               {resetting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
               {t.settingsBackup.resetPermanently}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}