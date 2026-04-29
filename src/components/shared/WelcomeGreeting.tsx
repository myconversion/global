import { useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Quote as QuoteIcon, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDailyQuote, getQuotes, Quote } from '@/lib/motivationalQuotes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getDateFnsLocaleString } from '@/i18n/date-locale';

const QUOTE_PREF_KEY = 'dashboard-show-quote';

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

function getRandomQuote(exclude: Quote, lang: import('@/i18n').SupportedLanguage): Quote {
  const quotes = getQuotes(lang);
  const others = quotes.filter((q) => q.text !== exclude.text);
  return others[Math.floor(Math.random() * others.length)];
}

export function WelcomeGreeting() {
  const { user } = useAuth();
  const { t, language } = useI18n();

  const localeStr = getDateFnsLocaleString(language);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t.greeting.goodMorning;
    if (hour >= 12 && hour < 18) return t.greeting.goodAfternoon;
    return t.greeting.goodEvening;
  }, [t]);

  const firstName = getFirstName(user) || t.greeting.guest;
  const dailyQuote = useMemo(() => getDailyQuote(language), [language]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(localeStr, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, [localeStr]);

  // Quote OFF by default — opt-in via localStorage
  const [showQuote, setShowQuote] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(QUOTE_PREF_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(QUOTE_PREF_KEY, String(showQuote));
  }, [showQuote]);

  const [tempQuote, setTempQuote] = useState<Quote | null>(null);
  const [quoteKey, setQuoteKey] = useState(0);

  const currentQuote = tempQuote ?? dailyQuote;

  const handleRefreshQuote = useCallback(() => {
    const next = getRandomQuote(currentQuote, language);
    setTempQuote(next);
    setQuoteKey((k) => k + 1);
  }, [currentQuote, language]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-1.5"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
        {greeting},{' '}
        <span className="text-primary">{firstName}</span>!{' '}
        <motion.span
          className="inline-block origin-[70%_70%]"
          animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
          transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.4 }}
        >
          👋
        </motion.span>
      </h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-sm text-muted-foreground capitalize flex items-center gap-2"
      >
        <span>{formattedDate}</span>
        {!showQuote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowQuote(true)}
                className="opacity-40 hover:opacity-100 transition-opacity"
                aria-label={t.greeting.anotherQuote}
              >
                <QuoteIcon className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{t.greeting.anotherQuote}</TooltipContent>
          </Tooltip>
        )}
      </motion.div>

      {showQuote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-start gap-2 max-w-xl"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-muted-foreground italic"
            >
              "{currentQuote.text}"
              <span className="not-italic text-xs text-muted-foreground/70 ml-1.5">
                — {currentQuote.author}
              </span>
            </motion.p>
          </AnimatePresence>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleRefreshQuote}
                className="mt-0.5 shrink-0 opacity-40 hover:opacity-100 transition-opacity duration-200"
                aria-label={t.greeting.anotherQuote}
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t.greeting.anotherQuote}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowQuote(false)}
                className="mt-0.5 shrink-0 opacity-40 hover:opacity-100 transition-opacity duration-200"
                aria-label="Hide quote"
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Hide</TooltipContent>
          </Tooltip>
        </motion.div>
      )}
    </motion.div>
  );
}
