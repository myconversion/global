import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { MoreHorizontal, Pencil, Trash2, UserPlus, Settings, Loader2, Mail, KeyRound } from 'lucide-react';

interface CompanyCardProps {
  company: { id: string; name: string; created_at: string };
  onModulesClick: (companyId: string) => void;
  onCompanyUpdated: () => void;
  companies: { id: string; name: string }[];
}

export function CompanyCard({ company, onModulesClick, onCompanyUpdated, companies }: CompanyCardProps) {
  const { toast } = useToast();
  const { t, language } = useI18n();

  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(company.name);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ cnpj: '', email: '', phone: '', address: '' });
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMethod, setAdminMethod] = useState<'invite' | 'direct'>('direct');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const handleRename = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({ name: newName.trim() }).eq('id', company.id);
    if (error) {
      toast({ title: t.companyCard.errorRenaming, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.companyCard.companyRenamed });
      setRenameOpen(false);
      onCompanyUpdated();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== t.companyCard.confirmWord) return;
    setDeleting(true);
    await supabase.from('company_modules').delete().eq('company_id', company.id);
    await supabase.from('company_memberships').delete().eq('company_id', company.id);
    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) {
      toast({ title: t.companyCard.errorDeleting, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.companyCard.companyDeleted });
      setDeleteOpen(false);
      onCompanyUpdated();
    }
    setDeleting(false);
  };

  const loadEditData = async () => {
    setLoadingEdit(true);
    const { data } = await supabase.from('companies').select('cnpj, email, phone, address').eq('id', company.id).maybeSingle();
    if (data) {
      setEditData({
        cnpj: data.cnpj ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
      });
    }
    setLoadingEdit(false);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    const { error } = await supabase.from('companies').update({
      cnpj: editData.cnpj || null,
      email: editData.email || null,
      phone: editData.phone || null,
      address: editData.address || null,
    }).eq('id', company.id);
    if (error) {
      toast({ title: t.companyCard.errorSavingData, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.companyCard.dataUpdated });
      setEditOpen(false);
    }
    setSavingEdit(false);
  };

  const handleCreateAdmin = async () => {
    if (!adminName.trim() || !adminEmail.trim()) return;
    if (adminMethod === 'direct' && (!adminPassword || adminPassword.length < 6)) {
      toast({ title: t.companyCard.minPasswordChars, variant: 'destructive' });
      return;
    }
    setCreatingAdmin(true);

    const res = await supabase.functions.invoke('create-user', {
      body: {
        email: adminEmail.trim(),
        password: adminMethod === 'direct' ? adminPassword : undefined,
        name: adminName.trim(),
        company_id: company.id,
        role: 'admin',
        method: adminMethod,
      },
    });

    if (res.error) {
      toast({ title: t.companyCard.errorCreatingAdmin, description: res.error.message, variant: 'destructive' });
    } else {
      toast({
        title: t.companyCard.adminLinked,
        description: adminMethod === 'invite' ? t.companyCard.inviteSent : t.companyCard.userCreated,
      });
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminOpen(false);
    }
    setCreatingAdmin(false);
  };

  const dateStr = new Date(company.created_at).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es' : 'pt-BR');

  return (
    <>
      <div className="flex items-center justify-between p-3 border rounded-lg border-border hover:bg-muted/50 transition-colors">
        <div>
          <p className="font-medium text-sm">{company.name}</p>
          <p className="text-xs text-muted-foreground">{t.companyCard.createdAt} {dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setAdminOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-1" /> {t.companyCard.linkAdmin}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onModulesClick(company.id)}>
            <Settings className="w-4 h-4 mr-1" /> {t.companyCard.modules}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { loadEditData(); setEditOpen(true); }}>
                <Pencil className="w-4 h-4 mr-2" /> {t.companyCard.editData}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewName(company.name); setRenameOpen(true); }}>
                <Pencil className="w-4 h-4 mr-2" /> {t.companyCard.rename}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setDeleteConfirm(''); setDeleteOpen(true); }} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> {t.companyCard.deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.companyCard.renameCompany}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.companyCard.newName}</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <Button onClick={handleRename} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.companyCard.editCompanyTitle} — {company.name}</DialogTitle></DialogHeader>
          {loadingEdit ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t.companyCard.loading}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.companyCard.cnpj}</Label>
                <Input value={editData.cnpj} onChange={e => setEditData(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>{t.companyCard.email}</Label>
                <Input type="email" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t.companyCard.phone}</Label>
                <Input value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t.companyCard.address}</Label>
                <Input value={editData.address} onChange={e => setEditData(p => ({ ...p, address: e.target.value }))} />
              </div>
              <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full">
                {savingEdit && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.common.save}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.companyCard.deleteCompanyTitle} "{company.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t.companyCard.deleteCompanyDesc}
              <br /><br />
              {t.companyCard.typeConfirm} <strong>{t.companyCard.confirmWord}</strong> {t.companyCard.toConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={t.companyCard.confirmWord} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirm !== t.companyCard.confirmWord || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.companyCard.linkAdminTitle} — {company.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.companyCard.fullName}</Label>
              <Input value={adminName} onChange={e => setAdminName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.companyCard.email}</Label>
              <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.companyCard.creationMethod}</Label>
              <div className="flex gap-2">
                <Button type="button" variant={adminMethod === 'direct' ? 'default' : 'outline'} size="sm" onClick={() => setAdminMethod('direct')} className="flex-1">
                  <KeyRound className="w-4 h-4 mr-1" /> {t.companyCard.directPassword}
                </Button>
                <Button type="button" variant={adminMethod === 'invite' ? 'default' : 'outline'} size="sm" onClick={() => setAdminMethod('invite')} className="flex-1">
                  <Mail className="w-4 h-4 mr-1" /> {t.companyCard.emailInvite}
                </Button>
              </div>
            </div>
            {adminMethod === 'direct' && (
              <div className="space-y-2">
                <Label>{t.companyCard.passwordLabel}</Label>
                <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder={t.companyCard.minChars} minLength={6} />
              </div>
            )}
            <Button onClick={handleCreateAdmin} disabled={creatingAdmin} className="w-full">
              {creatingAdmin && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t.companyCard.linkAdminBtn}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
