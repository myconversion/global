import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  LayoutDashboard, Users, FolderKanban, DollarSign, FileText,
  ShoppingCart, UserCog, MessageCircle, BarChart3, Briefcase,
  CheckSquare, Search, Rocket, PlayCircle, HelpCircle, Keyboard
} from 'lucide-react';
import { getShortcutsList } from '@/hooks/useKeyboardShortcuts';
import { useI18n } from '@/contexts/I18nContext';

const ONBOARDING_KEY = 'conversion_onboarding_done';

interface HelpSection {
  id: string;
  icon: React.ElementType;
  title: string;
  features: { title: string; description: string }[];
}

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  const HELP_SECTIONS: HelpSection[] = [
    {
      id: 'dashboard', icon: LayoutDashboard, title: t.help.dashboardTitle,
      features: [
        { title: t.help.dashboardKpis, description: t.help.dashboardKpisDesc },
        { title: t.help.dashboardCashflow, description: t.help.dashboardCashflowDesc },
        { title: t.help.dashboardPipeline, description: t.help.dashboardPipelineDesc },
        { title: t.help.dashboardActivity, description: t.help.dashboardActivityDesc },
      ],
    },
    {
      id: 'my-tasks', icon: CheckSquare, title: t.help.myTasksTitle,
      features: [
        { title: t.help.myTasksAssigned, description: t.help.myTasksAssignedDesc },
        { title: t.help.myTasksDeadlines, description: t.help.myTasksDeadlinesDesc },
      ],
    },
    {
      id: 'crm', icon: Users, title: t.help.crmTitle,
      features: [
        { title: t.help.crmContacts, description: t.help.crmContactsDesc },
        { title: t.help.crmCompanies, description: t.help.crmCompaniesDesc },
        { title: t.help.crmPipeline, description: t.help.crmPipelineDesc },
        { title: t.help.crmFollowups, description: t.help.crmFollowupsDesc },
        { title: t.help.crmAutomations, description: t.help.crmAutomationsDesc },
        { title: t.help.crmTasks, description: t.help.crmTasksDesc },
      ],
    },
    {
      id: 'projects', icon: FolderKanban, title: t.help.projectsTitle,
      features: [
        { title: t.help.projectsWorkspace, description: t.help.projectsWorkspaceDesc },
        { title: t.help.projectsTasksDel, description: t.help.projectsTasksDelDesc },
        { title: t.help.projectsAutomations, description: t.help.projectsAutomationsDesc },
        { title: t.help.projectsDashboard, description: t.help.projectsDashboardDesc },
      ],
    },
    {
      id: 'financial', icon: DollarSign, title: t.help.financialTitle,
      features: [
        { title: t.help.financialRevenue, description: t.help.financialRevenueDesc },
        { title: t.help.financialAccounts, description: t.help.financialAccountsDesc },
        { title: t.help.financialCashflow, description: t.help.financialCashflowDesc },
        { title: t.help.financialProfit, description: t.help.financialProfitDesc },
      ],
    },
    {
      id: 'fiscal', icon: FileText, title: t.help.fiscalTitle,
      features: [
        { title: t.help.fiscalInvoices, description: t.help.fiscalInvoicesDesc },
        { title: t.help.fiscalObligations, description: t.help.fiscalObligationsDesc },
      ],
    },
    {
      id: 'purchases', icon: ShoppingCart, title: t.help.purchasesTitle,
      features: [
        { title: t.help.purchasesSuppliers, description: t.help.purchasesSuppliersDesc },
        { title: t.help.purchasesOrders, description: t.help.purchasesOrdersDesc },
      ],
    },
    {
      id: 'hr', icon: UserCog, title: t.help.hrTitle,
      features: [
        { title: t.help.hrEmployees, description: t.help.hrEmployeesDesc },
        { title: t.help.hrDepartments, description: t.help.hrDepartmentsDesc },
      ],
    },
    {
      id: 'communication', icon: MessageCircle, title: t.help.communicationTitle,
      features: [
        { title: t.help.communicationConversations, description: t.help.communicationConversationsDesc },
        { title: t.help.communicationScheduled, description: t.help.communicationScheduledDesc },
      ],
    },
    {
      id: 'bi', icon: BarChart3, title: t.help.biTitle,
      features: [
        { title: t.help.biReports, description: t.help.biReportsDesc },
        { title: t.help.biComparisons, description: t.help.biComparisonsDesc },
      ],
    },
    {
      id: 'clients', icon: Briefcase, title: t.help.clientsTitle,
      features: [
        { title: t.help.clientsRegister, description: t.help.clientsRegisterDesc },
        { title: t.help.clientsProjects, description: t.help.clientsProjectsDesc },
      ],
    },
  ];

  const filtered = search.trim()
    ? HELP_SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.features.some(f =>
          f.title.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase())
        )
      )
    : HELP_SECTIONS;

  const handleRestartTour = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title={t.help.title} description={t.help.description} />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{t.help.gettingStarted}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.help.gettingStartedDesc}</p>
          </div>
          <Button onClick={handleRestartTour} className="gap-2">
            <PlayCircle className="w-4 h-4" /> {t.help.startTour}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-muted">
              <Keyboard className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{t.help.keyboardShortcuts}</h2>
              <p className="text-xs text-muted-foreground">{t.help.keyboardShortcutsDesc} <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Alt</kbd> {t.help.keyboardShortcutsKey}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {getShortcutsList(t.shortcuts).map(s => (
              <div key={s.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-mono font-medium">{s.key}</kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t.help.searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Accordion type="multiple" className="space-y-2">
        {filtered.map(section => {
          const Icon = section.icon;
          return (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 py-2">
                  {section.features.map((f, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/40">
                      <HelpCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">{t.help.noResults} "{search}".</p>
      )}
    </div>
  );
}
