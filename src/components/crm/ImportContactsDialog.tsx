import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

type FieldKey = 'name' | 'email' | 'phone' | 'cpf' | 'position' | 'origin' | 'tags';

const ORIGIN_MAP: Record<string, string> = {
  indicação: 'indicacao', indicacao: 'indicacao', inbound: 'inbound', outbound: 'outbound',
  'social media': 'social_media', social_media: 'social_media', evento: 'evento', other: 'other', outro: 'other', outros: 'other',
  facebook: 'facebook', fb: 'facebook',
  instagram: 'instagram', ig: 'instagram',
  site: 'site', website: 'site',
  'prospecção ativa': 'prospeccao_ativa', prospeccao_ativa: 'prospeccao_ativa', 'prospeccão ativa': 'prospeccao_ativa',
  'mídia offline': 'midia_offline', midia_offline: 'midia_offline', 'midia offline': 'midia_offline',
  'indicação gestor': 'indicacao_gestor', indicacao_gestor: 'indicacao_gestor', 'indicacão gestor': 'indicacao_gestor', 'manager referral': 'indicacao_gestor',
  parcerias: 'parcerias', parceria: 'parcerias', partnerships: 'parcerias', partnership: 'parcerias',
  'indicação cliente': 'indicacao_cliente', indicacao_cliente: 'indicacao_cliente', 'indicacão cliente': 'indicacao_cliente', 'client referral': 'indicacao_cliente',
};

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

export function ImportContactsDialog({ open, onOpenChange, onSuccess }: ImportContactsDialogProps) {
  const { currentCompany, supabaseUser } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const CRM_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
    { key: 'name', label: t.importContacts.fieldName, required: true },
    { key: 'email', label: t.importContacts.fieldEmail },
    { key: 'phone', label: t.importContacts.fieldPhone },
    { key: 'cpf', label: t.importContacts.fieldCpf },
    { key: 'position', label: t.importContacts.fieldPosition },
    { key: 'origin', label: t.importContacts.fieldOrigin },
    { key: 'tags', label: t.importContacts.fieldTags },
  ];

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as any);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0, duplicates: 0 });
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({} as any);
    setImportProgress(0);
    setImportResult({ success: 0, errors: 0, duplicates: 0 });
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (json.length === 0) {
          toast({ title: t.importContacts.emptyFile, description: t.importContacts.emptyFileDesc, variant: 'destructive' });
          return;
        }

        const fileHeaders = Object.keys(json[0]);
        setHeaders(fileHeaders);
        setRows(json.slice(0, 5000));

        const autoMapping: Record<string, string> = {};
        const headerLower = fileHeaders.map(h => h.toLowerCase().trim());
        const matchMap: Record<string, string[]> = {
          name: ['nome', 'name', 'nome completo', 'full name', 'contato'],
          email: ['email', 'e-mail', 'mail', 'correio'],
          phone: ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'fone'],
          cpf: ['cpf', 'documento', 'document'],
          position: ['cargo', 'position', 'função', 'funcao', 'role', 'título', 'titulo'],
          origin: ['origem', 'origin', 'source', 'fonte'],
          tags: ['tags', 'etiquetas', 'labels', 'categorias'],
        };

        for (const [field, aliases] of Object.entries(matchMap)) {
          const idx = headerLower.findIndex(h => aliases.some(a => h.includes(a)));
          if (idx !== -1) autoMapping[field] = fileHeaders[idx];
        }

        setMapping(autoMapping as any);
        setStep('mapping');
      } catch {
        toast({ title: t.importContacts.errorReading, description: t.importContacts.unsupportedFormat, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const isMappingValid = !!mapping.name;

  const mappedPreview = rows.slice(0, 5).map(row => {
    const mapped: Record<string, string> = {};
    for (const field of CRM_FIELDS) {
      const col = mapping[field.key];
      mapped[field.key] = col ? String(row[col] ?? '').trim() : '';
    }
    return mapped;
  });

  const handleImport = async () => {
    if (!currentCompany || !isMappingValid) return;
    setStep('importing');
    let success = 0, errors = 0, duplicates = 0;
    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const records = batch.map(row => {
        const name = String(row[mapping.name] ?? '').trim();
        const email = mapping.email ? String(row[mapping.email] ?? '').trim() || null : null;
        const phone = mapping.phone ? String(row[mapping.phone] ?? '').trim() || null : null;
        const cpf = mapping.cpf ? String(row[mapping.cpf] ?? '').trim() || null : null;
        const position = mapping.position ? String(row[mapping.position] ?? '').trim() || null : null;
        const originRaw = mapping.origin ? String(row[mapping.origin] ?? '').trim().toLowerCase() : '';
        const origin = ORIGIN_MAP[originRaw] || 'other';
        const tagsRaw = mapping.tags ? String(row[mapping.tags] ?? '').trim() : '';
        const tags = tagsRaw ? tagsRaw.split(',').map(tg => tg.trim()).filter(Boolean) : [];

        return { company_id: currentCompany.id, name, email, phone, cpf, position, origin, tags, created_by: supabaseUser?.id, responsible_id: supabaseUser?.id };
      }).filter(r => r.name.length > 0);

      if (records.length === 0) continue;

      const emailsToCheck = records.map(r => r.email).filter(Boolean) as string[];
      let existingEmails = new Set<string>();
      if (emailsToCheck.length > 0) {
        const { data } = await supabase.from('crm_contacts').select('email').eq('company_id', currentCompany.id).in('email', emailsToCheck);
        existingEmails = new Set((data ?? []).map(d => d.email?.toLowerCase() ?? ''));
      }

      const newRecords = records.filter(r => {
        if (r.email && existingEmails.has(r.email.toLowerCase())) {
          duplicates++;
          return false;
        }
        return true;
      });

      if (newRecords.length > 0) {
        const { error, data } = await supabase.from('crm_contacts').insert(newRecords as any).select('id');
        if (error) {
          errors += newRecords.length;
        } else {
          success += data?.length ?? 0;
        }
      }

      setImportProgress(Math.min(100, Math.round(((i + batchSize) / rows.length) * 100)));
    }

    setImportResult({ success, errors, duplicates });
    setImportProgress(100);
    setStep('done');
    if (success > 0) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t.importContacts.title}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && t.importContacts.uploadDesc}
            {step === 'mapping' && t.importContacts.mappingDesc}
            {step === 'preview' && t.importContacts.previewDesc}
            {step === 'importing' && t.importContacts.importingDesc}
            {step === 'done' && t.importContacts.doneDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            {(['upload', 'mapping', 'preview', 'done'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                  step === s || (step === 'importing' && s === 'done')
                    ? 'bg-primary text-primary-foreground'
                    : ['mapping', 'preview', 'importing', 'done'].indexOf(step) >= ['upload', 'mapping', 'preview', 'done'].indexOf(s)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}>
                  {i + 1}
                </div>
                <span className="hidden sm:inline text-muted-foreground">
                  {s === 'upload' ? t.importContacts.stepFile : s === 'mapping' ? t.importContacts.stepMapping : s === 'preview' ? t.importContacts.stepReview : t.importContacts.stepResult}
                </span>
              </div>
            ))}
          </div>

          {step === 'upload' && (
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">{t.importContacts.dragOrClick}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.importContacts.formats}</p>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="secondary" className="text-xs">{rows.length} {t.importContacts.rows}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRM_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      {field.label}
                    </label>
                    <Select
                      value={mapping[field.key] || '_none'}
                      onValueChange={v => setMapping(prev => ({ ...prev, [field.key]: v === '_none' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t.importContacts.noMap}</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {!isMappingValid && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t.importContacts.nameRequired}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t.importContacts.previewFirst} {Math.min(5, rows.length)} {t.importContacts.of} <strong>{rows.length}</strong> {t.importContacts.records}:
              </p>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {CRM_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label.replace(' *', '')}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedPreview.map((row, i) => (
                      <TableRow key={i}>
                        {CRM_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <TableCell key={f.key} className="text-xs py-2 max-w-[150px] truncate">
                            {row[f.key] || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.importContacts.duplicatesIgnored}
              </p>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="text-sm font-medium">{t.importContacts.importingN} {rows.length} {t.importContacts.contacts}</p>
              <Progress value={importProgress} className="max-w-xs mx-auto" />
              <p className="text-xs text-muted-foreground">{importProgress}%</p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium">{t.importContacts.importDone}</p>
              <div className="flex justify-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.success}</p>
                  <p className="text-xs text-muted-foreground">{t.importContacts.imported}</p>
                </div>
                {importResult.duplicates > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{importResult.duplicates}</p>
                    <p className="text-xs text-muted-foreground">{t.importContacts.duplicates}</p>
                  </div>
                )}
                {importResult.errors > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{importResult.errors}</p>
                    <p className="text-xs text-muted-foreground">{t.importContacts.errors}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>{t.common.cancel}</Button>
          )}
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => { reset(); }}>{t.common.back}</Button>
              <Button disabled={!isMappingValid} onClick={() => setStep('preview')}>{t.common.next}</Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>{t.common.back}</Button>
              <Button onClick={handleImport}>{t.importContacts.importBtn} {rows.length}</Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => handleClose(false)}>{t.common.close}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
