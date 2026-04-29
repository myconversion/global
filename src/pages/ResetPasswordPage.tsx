import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { Loader2, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) setIsRecovery(true);
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t.resetPassword.passwordsDontMatch, variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: t.resetPassword.minLength, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t.resetPassword.passwordUpdated });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: t.resetPassword.errorUpdating, description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <KeyRound className="w-8 h-8 mx-auto text-muted-foreground" />
            <CardTitle>{t.resetPassword.title}</CardTitle>
            <CardDescription>
              {t.resetPassword.waitingValidation}{' '}
              <a href="/auth" className="text-primary underline">{t.resetPassword.loginPage}</a>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t.resetPassword.newPassword}</CardTitle>
          <CardDescription>{t.resetPassword.newPasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t.resetPassword.newPasswordLabel}</Label>
              <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={t.resetPassword.minChars} minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t.resetPassword.confirmPasswordLabel}</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder={t.resetPassword.repeatPassword} minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.resetPassword.updatePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
