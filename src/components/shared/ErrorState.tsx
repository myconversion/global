import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t.errors.somethingWentWrong;
  const resolvedDesc = description ?? t.errors.couldNotLoadData;
  const resolvedRetry = retryLabel ?? t.errors.tryAgain;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
        <AlertTriangle className="w-9 h-9 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{resolvedTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{resolvedDesc}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {resolvedRetry}
        </Button>
      )}
    </motion.div>
  );
}
