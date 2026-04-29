import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, MessageSquare, FileText, Lightbulb, Wand2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface AIAction {
  label: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}

interface AISparklesPopoverProps {
  actions: AIAction[];
}

export function AISparklesPopover({ actions }: AISparklesPopoverProps) {
  const { t } = useI18n();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Sparkles className="w-3.5 h-3.5" />
          IA
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">{t.shared.aiAssistant}</p>
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.onClick}
                className="w-full flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-muted transition-colors"
              >
                <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-medium">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Factory functions that use translations - must be called inside components
export function useCommunicationAIActions(): AIAction[] {
  const { t } = useI18n();
  return [
    { label: t.shared.suggestReply, description: t.shared.suggestReplyDesc, icon: MessageSquare, onClick: () => {} },
    { label: t.shared.summarizeConversation, description: t.shared.summarizeConversationDesc, icon: FileText, onClick: () => {} },
    { label: t.shared.analyzeSentiment, description: t.shared.analyzeSentimentDesc, icon: Lightbulb, onClick: () => {} },
  ];
}

export function useFlowsAIActions(): AIAction[] {
  const { t } = useI18n();
  return [
    { label: t.shared.suggestFlow, description: t.shared.suggestFlowDesc, icon: Wand2, onClick: () => {} },
    { label: t.shared.optimizeActions, description: t.shared.optimizeActionsDesc, icon: Lightbulb, onClick: () => {} },
  ];
}

export function useAutomationsAIActions(): AIAction[] {
  const { t } = useI18n();
  return [
    { label: t.shared.generateTemplate, description: t.shared.generateTemplateDesc, icon: Wand2, onClick: () => {} },
    { label: t.shared.suggestSegmentation, description: t.shared.suggestSegmentationDesc, icon: Lightbulb, onClick: () => {} },
    { label: t.shared.composeMessage, description: t.shared.composeMessageDesc, icon: MessageSquare, onClick: () => {} },
  ];
}

