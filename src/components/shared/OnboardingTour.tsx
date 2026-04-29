import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard, Users, FolderKanban, DollarSign, BarChart3, Rocket
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'conversion_onboarding_done';

const STEP_DEFS: { icon: React.ElementType; titleKey: string; descKey: string }[] = [
  { icon: Rocket, titleKey: 'welcomeToConversion', descKey: 'welcomeDesc' },
  { icon: LayoutDashboard, titleKey: 'dashboardStep', descKey: 'dashboardStepDesc' },
  { icon: Users, titleKey: 'crmStep', descKey: 'crmStepDesc' },
  { icon: FolderKanban, titleKey: 'projectsStep', descKey: 'projectsStepDesc' },
  { icon: DollarSign, titleKey: 'financialStep', descKey: 'financialStepDesc' },
  { icon: BarChart3, titleKey: 'biStep', descKey: 'biStepDesc' },
];

export function OnboardingTour() {
  const { t } = useI18n();
  const { supabaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [checked, setChecked] = useState(false);

  // Verify against backend profile.onboarding_completed (fallback to localStorage).
  useEffect(() => {
    if (checked) return;
    if (!supabaseUser) return;

    const localDone = localStorage.getItem(ONBOARDING_KEY) === 'true';
    if (localDone) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();
      if (cancelled) return;
      const done = (data as any)?.onboarding_completed === true;
      if (done) {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } else {
        setOpen(true);
      }
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [supabaseUser, checked]);

  const persistCompleted = async () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    if (supabaseUser) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('user_id', supabaseUser.id);
    }
  };

  const handleClose = () => {
    void persistCompleted();
    setOpen(false);
    setStep(0);
  };

  const handleFinish = () => {
    void persistCompleted();
    setOpen(false);
    setStep(0);
  };

  if (!open) return null;

  const current = STEP_DEFS[step];
  const Icon = current.icon;
  const isLast = step === STEP_DEFS.length - 1;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-lg">{(t.shared as any)[current.titleKey]}</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {(t.shared as any)[current.descKey]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 py-2">
          {STEP_DEFS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex items-center justify-between w-full gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              {t.shared.skip}
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                  {t.shared.previous}
                </Button>
              )}
              {isLast ? (
                <Button size="sm" onClick={handleFinish}>
                  {t.shared.startUsing}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStep(s => s + 1)}>
                  {t.common.next}
                </Button>
              )}
            </div>
          </div>
          {step === 0 && (
            <div className="flex items-center gap-2 w-full">
              <Checkbox
                id="dont-show"
                checked={dontShow}
                onCheckedChange={v => setDontShow(v === true)}
              />
              <Label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer">
                {t.shared.dontShowAgain}
              </Label>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
