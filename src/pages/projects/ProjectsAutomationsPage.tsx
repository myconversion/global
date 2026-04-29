import { Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useI18n } from '@/contexts/I18nContext';

export default function ProjectsAutomationsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader
        title={t.sectors.projects}
        description={t.projects.description}
        icon={<Zap className="w-5 h-5 text-primary" />}
      />
      <div className="text-center py-20">
        <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-1">{t.common.loading.replace('...', '')}</h3>
        <p className="text-sm text-muted-foreground">{t.projects.description}</p>
      </div>
    </div>
  );
}
