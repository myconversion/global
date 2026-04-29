import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDailyQuote } from '@/lib/motivationalQuotes';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

function getFirstName(user: { name?: string; email?: string } | null): string {
  if (user?.name) {
    const first = user.name.trim().split(' ')[0];
    if (first) return first;
  }
  if (user?.email) {
    const local = user.email.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return '';
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DailyWelcomePopup() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t.shared.goodMorning;
    if (hour >= 12 && hour < 18) return t.shared.goodAfternoon;
    return t.shared.goodEvening;
  }, [t]);

  const firstName = getFirstName(user) || t.shared.visitor;
  const quote = useMemo(() => getDailyQuote(language), [language]);

  useEffect(() => {
    if (!user) return;
    const storageKey = `daily-welcome-${user.email || 'anon'}`;
    const lastShown = localStorage.getItem(storageKey);
    const today = getTodayKey();
    if (lastShown !== today) {
      const timer = setTimeout(() => {
        setOpen(true);
        localStorage.setItem(storageKey, today);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 gap-0">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4"
          >
            <motion.span
              className="text-4xl inline-block origin-[70%_70%]"
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.4 }}
            >
              👋
            </motion.span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white"
          >
            {greeting}, <span className="text-white/90">{firstName}</span>!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-white/70 mt-1"
          >
            {t.shared.dailyQuote}
          </motion.p>
        </div>

        <div className="px-6 py-6 bg-card">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex gap-3 items-start"
          >
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground italic leading-relaxed">
                "{quote.text}"
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                — {quote.author}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="px-6 pb-5 bg-card">
          <Button className="w-full" onClick={() => setOpen(false)}>
            {t.shared.startDay}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
