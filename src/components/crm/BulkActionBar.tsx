import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trash2, UserCheck, UserPlus, Download, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface BulkActionBarProps {
  count: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  onChangeStatus: (status: 'lead' | 'client') => void;
  onExport: () => void;
}

export function BulkActionBar({ count, totalCount, onSelectAll, onClear, onDelete, onChangeStatus, onExport }: BulkActionBarProps) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{count} {t.crm.selected}</span>
            {count < totalCount && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onSelectAll}>
                {t.crm.selectAllCount} ({totalCount})
              </Button>
            )}
          </div>
          <div className="h-5 w-px bg-border" />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => onChangeStatus('client')}>
            <UserCheck className="w-3.5 h-3.5" /> {t.crm.markClient}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => onChangeStatus('lead')}>
            <UserPlus className="w-3.5 h-3.5" /> {t.crm.markLead}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onExport}>
            <Download className="w-3.5 h-3.5" /> {t.crm.exportLabel}
          </Button>
          <Button variant="destructive" size="sm" className="gap-1.5 text-xs h-8" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" /> {t.crm.deleteLabel}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
