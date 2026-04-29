import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Camera, Lock, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { DetailPageSkeleton } from '@/components/shared/PageSkeletons';

export default function ProfilePage() {
  const { user, supabaseUser } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabaseUser) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*').eq('user_id', supabaseUser.id).single();
      if (data) {
        const nameParts = (data.name || '').split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || null);
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp && factors.totp.length > 0) {
        setTwoFAEnabled(factors.totp.some(f => f.status === 'verified'));
      }
      setLoading(false);
    })();
  }, [supabaseUser]);

  const handleSaveProfile = async () => {
    if (!supabaseUser) return;
    setSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } = await supabase.from('profiles').update({ name: fullName, phone }).eq('user_id', supabaseUser.id);
    if (error) {
      toast({ title: t.profile.profileSaveError, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.profile.profileUpdated });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: t.profile.fillAllPasswordFields, variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t.profile.minPasswordLength, variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t.profile.passwordsDontMatch, variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: t.profile.passwordChangeError, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.profile.passwordChanged });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    }
    setSavingPassword(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUser) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t.profile.selectImage, variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t.profile.maxImageSize, variant: 'destructive' });
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${supabaseUser.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: t.profile.uploadError, description: uploadError.message, variant: 'destructive' });
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', supabaseUser.id);
    setAvatarUrl(publicUrl);
    toast({ title: t.profile.photoUpdated });
    setUploadingAvatar(false);
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (enabled) {
      toast({ title: t.profile.twoFA, description: t.profile.twoFAComingSoon });
    } else {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const factor of factors.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
        setTwoFAEnabled(false);
        toast({ title: t.profile.twoFADisabled });
      }
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  if (loading) return <DetailPageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={t.profile.title}
        description={t.profile.description}
        icon={<User className="w-5 h-5 text-primary" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> {t.profile.photo}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {firstName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{firstName} {lastName}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              {uploadingAvatar ? t.profile.uploading : t.profile.changePhoto}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {t.profile.personalInfo}
          </CardTitle>
          <CardDescription>{t.profile.personalInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t.profile.firstName}</Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t.profile.firstNamePlaceholder} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t.profile.lastName}</Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t.profile.lastNamePlaceholder} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.common.email}</Label>
            <Input id="email" type="email" value={email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">{t.profile.emailNoChange}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t.profile.phoneWithDDD}</Label>
            <Input id="phone" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder={t.profile.phonePlaceholder} maxLength={15} />
          </div>
          <Button onClick={handleSaveProfile} loading={saving} loadingText={t.common.saving}>
            {t.profile.saveChanges}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> {t.profile.changePassword}
          </CardTitle>
          <CardDescription>{t.profile.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t.profile.newPassword}</Label>
            <div className="relative">
              <Input id="newPassword" type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t.profile.minChars} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowNewPw(!showNewPw)}>
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.profile.confirmPassword}</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t.profile.repeatPassword} />
          </div>
          <Button onClick={handleChangePassword} loading={savingPassword} loadingText={t.common.saving}>
            {t.profile.changePassword}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> {t.profile.twoFA}
          </CardTitle>
          <CardDescription>{t.profile.twoFADesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {twoFAEnabled ? t.profile.twoFAActive : t.profile.twoFAInactive}
              </p>
              <p className="text-xs text-muted-foreground">
                {twoFAEnabled ? t.profile.twoFAProtected : t.profile.twoFAEnable}
              </p>
            </div>
            <Switch checked={twoFAEnabled} onCheckedChange={handleToggle2FA} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
