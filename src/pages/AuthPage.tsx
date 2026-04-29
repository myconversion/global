import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Globe, ArrowRight, UserPlus } from 'lucide-react';
import conversionLogo from '@/assets/conversion-crm-erp.png';

type AuthLang = 'pt-BR' | 'en' | 'es';
type Mode = 'signin' | 'signup';

const AUTH_STRINGS: Record<AuthLang, {
  email: string; password: string; login: string; forgotPassword: string;
  forgotDesc: string; send: string; cancel: string; loginError: string;
  emailSent: string; emailSentDesc: string; error: string; showPassword: string; hidePassword: string;
  welcome: string; subtitle: string;
  noAccount: string; signUp: string; haveAccount: string; signIn: string;
  signUpTitle: string; signUpSubtitle: string;
  fullName: string; createAccount: string;
  signingIn: string; signingUp: string;
  signupSuccess: string; signupSuccessDesc: string;
  passwordMin: string;
}> = {
  'pt-BR': {
    email: 'Email', password: 'Senha', login: 'Entrar', forgotPassword: 'Esqueci minha senha',
    forgotDesc: 'Digite seu email para receber o link de recuperação:', send: 'Enviar', cancel: 'Cancelar',
    loginError: 'Erro ao entrar', emailSent: 'Email enviado!',
    emailSentDesc: 'Verifique sua caixa de entrada para redefinir a senha.',
    error: 'Erro', showPassword: 'Mostrar senha', hidePassword: 'Ocultar senha',
    welcome: 'Bem-vindo de volta', subtitle: 'Acesse sua conta para continuar',
    noAccount: 'Não tem uma conta?', signUp: 'Criar conta',
    haveAccount: 'Já tem uma conta?', signIn: 'Entrar',
    signUpTitle: 'Criar conta', signUpSubtitle: 'Preencha seus dados para começar',
    fullName: 'Nome completo', createAccount: 'Criar conta',
    signingIn: 'Entrando...', signingUp: 'Criando conta...',
    signupSuccess: 'Conta criada!', signupSuccessDesc: 'Verifique seu email para confirmar.',
    passwordMin: 'A senha deve ter no mínimo 6 caracteres.',
  },
  en: {
    email: 'Email', password: 'Password', login: 'Sign In', forgotPassword: 'Forgot password',
    forgotDesc: 'Enter your email to receive the recovery link:', send: 'Send', cancel: 'Cancel',
    loginError: 'Login error', emailSent: 'Email sent!',
    emailSentDesc: 'Check your inbox to reset your password.',
    error: 'Error', showPassword: 'Show password', hidePassword: 'Hide password',
    welcome: 'Welcome back', subtitle: 'Sign in to your account to continue',
    noAccount: "Don't have an account?", signUp: 'Sign up',
    haveAccount: 'Already have an account?', signIn: 'Sign in',
    signUpTitle: 'Create account', signUpSubtitle: 'Fill in your details to get started',
    fullName: 'Full name', createAccount: 'Create account',
    signingIn: 'Signing in...', signingUp: 'Creating account...',
    signupSuccess: 'Account created!', signupSuccessDesc: 'Check your email to confirm.',
    passwordMin: 'Password must be at least 6 characters.',
  },
  es: {
    email: 'Correo', password: 'Contraseña', login: 'Iniciar sesión', forgotPassword: 'Olvidé mi contraseña',
    forgotDesc: 'Ingresa tu correo para recibir el enlace de recuperación:', send: 'Enviar', cancel: 'Cancelar',
    loginError: 'Error al iniciar sesión', emailSent: '¡Correo enviado!',
    emailSentDesc: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
    error: 'Error', showPassword: 'Mostrar contraseña', hidePassword: 'Ocultar contraseña',
    welcome: 'Bienvenido de nuevo', subtitle: 'Inicia sesión en tu cuenta para continuar',
    noAccount: '¿No tienes una cuenta?', signUp: 'Crear cuenta',
    haveAccount: '¿Ya tienes una cuenta?', signIn: 'Iniciar sesión',
    signUpTitle: 'Crear cuenta', signUpSubtitle: 'Completa tus datos para comenzar',
    fullName: 'Nombre completo', createAccount: 'Crear cuenta',
    signingIn: 'Iniciando...', signingUp: 'Creando cuenta...',
    signupSuccess: '¡Cuenta creada!', signupSuccessDesc: 'Revisa tu correo para confirmar.',
    passwordMin: 'La contraseña debe tener al menos 6 caracteres.',
  },
};

const LANG_OPTIONS: { value: AuthLang; label: string; flag: string }[] = [
  { value: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<AuthLang>('pt-BR');
  const [authError, setAuthError] = useState<string | null>(null);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const s = AUTH_STRINGS[lang];

  const invalidCredsMsg: Record<AuthLang, string> = {
    'pt-BR': 'Email ou senha inválidos. Por favor, tente novamente.',
    en: 'Invalid email or password. Please try again.',
    es: 'Correo o contraseña inválidos. Por favor, inténtelo de nuevo.',
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: s.emailSent, description: s.emailSentDesc });
      setShowForgot(false);
    } catch (err: any) {
      toast({ title: s.error, description: err.message, variant: 'destructive' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (mode === 'signup' && password.length < 6) {
      setAuthError(s.passwordMin);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast({ title: s.signupSuccess, description: s.signupSuccessDesc });
        setMode('signin');
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(mode === 'signin' ? invalidCredsMsg[lang] : err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentLangOption = LANG_OPTIONS.find(l => l.value === lang)!;
  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      <div className="fixed top-4 right-4 z-50">
        <Select value={lang} onValueChange={(v) => setLang(v as AuthLang)}>
          <SelectTrigger className="w-auto h-9 gap-2 px-3 text-xs bg-card border-border shadow-sm hover:shadow-md transition-shadow" aria-label="Language">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{currentLangOption.flag} {currentLangOption.label}</span>
          </SelectTrigger>
          <SelectContent align="end">
            {LANG_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                <span className="mr-2">{opt.flag}</span>{opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center">
          <img src={conversionLogo} alt="Conversion ERP" className="mx-auto h-10 object-contain mb-6" />
          <h1 className="text-xl font-semibold text-foreground">{isSignup ? s.signUpTitle : s.welcome}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isSignup ? s.signUpSubtitle : s.subtitle}</p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardContent className="pt-6 pb-6 px-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="full-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {s.fullName}
                  </Label>
                  <Input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    placeholder={s.fullName}
                    className="h-11"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {s.email}
                </Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {s.password}
                  </Label>
                  {!showForgot && !isSignup && (
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      {s.forgotPassword}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-11 pr-11"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    minLength={isSignup ? 6 : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-r-md"
                    aria-label={showPassword ? s.hidePassword : s.showPassword}
                    title={showPassword ? s.hidePassword : s.showPassword}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignup ? s.signingUp : s.signingIn}
                  </>
                ) : (
                  <>
                    {isSignup ? <UserPlus className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    {isSignup ? s.createAccount : s.login}
                  </>
                )}
              </Button>

              {authError && (
                <p className="text-sm text-destructive text-center font-medium" role="alert">
                  {authError}
                </p>
              )}

              <div className="text-center text-sm text-muted-foreground pt-1">
                {isSignup ? s.haveAccount : s.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setAuthError(null); }}
                  className="text-primary font-medium hover:underline"
                >
                  {isSignup ? s.signIn : s.signUp}
                </button>
              </div>
            </form>

            {showForgot && !isSignup && (
              <form onSubmit={handleForgotPassword} className="mt-5 p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <p className="text-sm text-muted-foreground">{s.forgotDesc}</p>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="h-10"
                  aria-label={s.email}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={forgotLoading} className="flex-1">
                    {forgotLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {s.send}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowForgot(false)}>
                    {s.cancel}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
