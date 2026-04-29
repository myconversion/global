import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageCircle, Mail, Instagram, Facebook, Send, Search,
  Trash2, CheckCircle, Image, Paperclip, Mic, Smile, Phone, Plus, ShieldAlert,
  Clock, User, Hash, Inbox, RotateCcw, Headphones,
} from 'lucide-react';
import { AISparklesPopover, useCommunicationAIActions } from '@/components/shared/AISparklesPopover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withBuFilter } from '@/lib/bu-filter';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { useIntegrationAccess } from '@/hooks/useIntegrationAccess';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
type Channel = 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'telegram';
type TicketStatus = 'open' | 'waiting' | 'resolved';

interface Conversation {
  id: string;
  company_id: string;
  contact_name: string;
  contact_identifier: string;
  channel: Channel;
  status: TicketStatus;
  queue: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  company_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

const CHANNEL_ICON: Record<Channel, React.ElementType> = {
  whatsapp: MessageCircle,
  email: Mail,
  instagram: Instagram,
  facebook: Facebook,
  telegram: Send,
};

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
};

const CHANNEL_COLOR: Record<Channel, string> = {
  whatsapp: 'bg-emerald-500',
  email: 'bg-blue-500',
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-600',
  telegram: 'bg-sky-500',
};

const STATUS_CLASS: Record<TicketStatus, { className: string; dotColor: string }> = {
  open: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800', dotColor: 'bg-emerald-500' },
  waiting: { className: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800', dotColor: 'bg-amber-500' },
  resolved: { className: 'bg-muted text-muted-foreground border-border', dotColor: 'bg-muted-foreground/50' },
};

export default function CommunicationPage() {
  const { currentCompany, user, currentBusinessUnit } = useAuth();
  const { hasChannelAccess, loading: accessLoading } = useIntegrationAccess();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const communicationAIActions = useCommunicationAIActions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<TicketStatus | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState({ contact_name: '', contact_identifier: '', channel: 'whatsapp' as Channel });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;
  const selected = conversations.find(c => c.id === selectedId);

  const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string; dotColor: string }> = {
    open: { label: t.communication.statusOpen, ...STATUS_CLASS.open },
    waiting: { label: t.communication.statusWaiting, ...STATUS_CLASS.waiting },
    resolved: { label: t.communication.statusResolved, ...STATUS_CLASS.resolved },
  };

  const fetchConversations = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await withBuFilter(
      supabase.from('communication_conversations').select('*').eq('company_id', companyId).order('updated_at', { ascending: false }),
      buId
    );
    if (error) { toast.error(t.communication.errorLoadTickets); return; }
    setConversations((data || []) as Conversation[]);
    setLoading(false);
  }, [companyId, buId, t]);

  const fetchMessages = useCallback(async () => {
    if (!selectedId || !companyId) { setMessages([]); return; }
    const { data, error } = await supabase
      .from('communication_messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true });
    if (error) { toast.error(t.communication.errorLoadMessages); return; }
    setMessages((data || []) as Message[]);
  }, [selectedId, companyId, t]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!companyId) return;
    const convChannel = supabase
      .channel('comm-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communication_conversations', filter: `company_id=eq.${companyId}` }, () => fetchConversations())
      .subscribe();
    const msgChannel = supabase
      .channel('comm-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communication_messages', filter: `company_id=eq.${companyId}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(convChannel); supabase.removeChannel(msgChannel); };
  }, [companyId, fetchConversations, fetchMessages]);

  const handleCreateConversation = async () => {
    if (!companyId || !newForm.contact_name.trim()) return;
    const { error } = await supabase.from('communication_conversations').insert({
      company_id: companyId,
      business_unit_id: buId ?? null,
      contact_name: newForm.contact_name.trim(),
      contact_identifier: newForm.contact_identifier.trim() || '-',
      channel: newForm.channel,
      created_by: user?.user_id || null,
    } as any);
    if (error) { toast.error(t.communication.errorCreateTicket); return; }
    toast.success(t.communication.ticketCreated);
    setNewDialogOpen(false);
    setNewForm({ contact_name: '', contact_identifier: '', channel: 'whatsapp' });
  };

  const canSendToSelected = selected ? hasChannelAccess(selected.channel) : false;

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedId || !companyId) return;
    if (!canSendToSelected) {
      toast.error(t.communication.noChannelAccessMsg);
      return;
    }
    const { error } = await supabase.from('communication_messages').insert({
      conversation_id: selectedId,
      company_id: companyId,
      sender_type: 'user',
      sender_id: user?.user_id || null,
      content: inputText.trim(),
    });
    if (error) { toast.error(t.communication.errorSendMessage); return; }
    await supabase.from('communication_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedId);
    setInputText('');
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedId) return;
    const { error } = await supabase.from('communication_conversations').update({ status }).eq('id', selectedId);
    if (error) { toast.error(t.communication.errorUpdateStatus); return; }
    toast.success(`${t.communication.statusUpdatedTo} ${STATUS_CONFIG[status].label}`);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from('communication_conversations').delete().eq('id', selectedId);
    if (error) { toast.error(t.communication.errorDeleteTicket); return; }
    toast.success(t.communication.ticketDeleted);
    setSelectedId(null);
  };

  const handleUpdateField = async (field: 'queue' | 'assigned_to', value: string) => {
    if (!selectedId) return;
    const v = value === 'none' ? null : value;
    await supabase.from('communication_conversations').update({ [field]: v }).eq('id', selectedId);
  };

  const counts = {
    open: conversations.filter(c => c.status === 'open').length,
    waiting: conversations.filter(c => c.status === 'waiting').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
  };

  const filtered = conversations.filter(c => {
    if (activeTab !== 'all' && c.status !== activeTab) return false;
    if (searchQuery && !c.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tabs: { key: TicketStatus; label: string; count: number }[] = [
    { key: 'open', label: t.communication.open, count: counts.open },
    { key: 'waiting', label: t.communication.waiting, count: counts.waiting },
    { key: 'resolved', label: t.communication.resolved, count: counts.resolved },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.communication.title} description={t.communication.description} icon={<Headphones className="w-5 h-5 text-primary" />} />
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_300px] gap-0 h-[calc(100vh-200px)] border border-border rounded-xl overflow-hidden">
          <div className="p-4 space-y-4 border-r border-border">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-r border-border"><Skeleton className="h-full w-full" /></div>
          <div><Skeleton className="h-full w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <PageHeader
        title={t.communication.title}
        description={t.communication.description}
        icon={<Headphones className="w-5 h-5 text-primary" />}
        actions={
          <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Plus className="w-4 h-4" /> {t.communication.newTicket}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{t.communication.newTicket}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t.communication.contactNameLabel}</Label>
                  <Input value={newForm.contact_name} onChange={e => setNewForm(p => ({ ...p, contact_name: e.target.value }))} placeholder={t.communication.contactNamePlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t.communication.contactIdentifier}</Label>
                  <Input value={newForm.contact_identifier} onChange={e => setNewForm(p => ({ ...p, contact_identifier: e.target.value }))} placeholder={t.communication.contactIdentifierPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t.communication.channel}</Label>
                  <Select value={newForm.channel} onValueChange={v => setNewForm(p => ({ ...p, channel: v as Channel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CHANNEL_LABEL) as Channel[]).map(ch => {
                        const Icon = CHANNEL_ICON[ch];
                        const hasAccess = hasChannelAccess(ch);
                        return (
                          <SelectItem key={ch} value={ch} disabled={!hasAccess}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" />
                              {CHANNEL_LABEL[ch]}{!hasAccess ? ` (${t.communication.noAccess})` : ''}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreateConversation}>{t.communication.createTicket}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_300px] gap-0 flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        {/* ── Column 1: Conversations List ── */}
        <div className="flex flex-col border-r border-border bg-card">
          <div className="p-3 space-y-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Inbox className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{t.communication.tickets}</h2>
              <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 font-medium">
                {conversations.length}
              </Badge>
            </div>

            {/* Status Tabs */}
            <div className="flex rounded-lg bg-muted/60 p-0.5">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 text-[11px] font-medium rounded-md py-1.5 px-1 transition-all duration-150 ${
                    activeTab === t.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1 text-[10px] ${activeTab === t.key ? 'text-primary' : 'text-muted-foreground/60'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
               <Input
                 placeholder={t.communication.searchContact}
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/40 border-transparent focus:border-border focus:bg-card"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <AnimatePresence>
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 px-4 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                    <Inbox className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                   <p className="text-xs font-medium text-muted-foreground">{t.communication.noTickets}</p>
                   <p className="text-[11px] text-muted-foreground/60 mt-0.5">{t.communication.createFirst}</p>
                </motion.div>
              ) : filtered.map((conv, index) => {
                const Icon = CHANNEL_ICON[conv.channel];
                const isActive = conv.id === selectedId;
                const sc = STATUS_CONFIG[conv.status];
                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b border-border/50 transition-all duration-150 group ${
                      isActive
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className={`text-[11px] font-semibold ${isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {conv.contact_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${CHANNEL_COLOR[conv.channel]} flex items-center justify-center ring-2 ring-card`}>
                        <Icon className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className={`text-xs truncate ${isActive ? 'font-bold text-foreground' : 'font-semibold text-foreground/90 group-hover:text-foreground'}`}>
                          {conv.contact_name}
                        </p>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dotColor}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {conv.contact_identifier}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* ── Column 2: Chat Area ── */}
        <div className="flex flex-col bg-background">
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {selected.contact_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${CHANNEL_COLOR[selected.channel]} flex items-center justify-center ring-2 ring-card`}>
                      {(() => { const I = CHANNEL_ICON[selected.channel]; return <I className="w-2.5 h-2.5 text-white" />; })()}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{selected.contact_name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {selected.contact_identifier}
                      <span className="mx-1 text-border">•</span>
                      <Badge variant="outline" className={`text-[9px] h-4 px-1.5 py-0 border ${STATUS_CONFIG[selected.status].className}`}>
                        {STATUS_CONFIG[selected.status].label}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <AISparklesPopover actions={communicationAIActions} />
                  {selected.status !== 'resolved' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleUpdateStatus('resolved')}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.communication.resolveTicket}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleUpdateStatus('open')}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.communication.reopenTicket}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t.communication.deleteTicket}</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3 min-h-full flex flex-col">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Send className="w-7 h-7 text-muted-foreground/30 -rotate-45" />
                      </div>
                       <p className="text-sm font-medium text-muted-foreground">{t.communication.noMessages}</p>
                       <p className="text-xs text-muted-foreground/60 mt-1">{t.communication.sendFirstMessage}</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isUser = msg.sender_type === 'user';
                        const showTimestamp = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 300000;
                        return (
                          <div key={msg.id}>
                            {showTimestamp && (
                              <div className="flex justify-center my-2">
                                <span className="text-[10px] text-muted-foreground/50 bg-muted/50 px-2.5 py-0.5 rounded-full">
                                  {new Date(msg.created_at).toLocaleString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                                isUser
                                  ? 'bg-primary text-primary-foreground rounded-br-lg'
                                  : 'bg-card border border-border text-foreground rounded-bl-lg'
                              }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                 <p className={`text-[10px] mt-1.5 text-right ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                                   {new Date(msg.created_at).toLocaleTimeString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              {canSendToSelected ? (
                <div className="p-3 border-t border-border bg-card/80 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 bg-muted/40 rounded-xl px-2 py-1 border border-border/50 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10 transition-all">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"><Paperclip className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.communication.attachFile}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"><Image className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.communication.sendImage}</TooltipContent>
                    </Tooltip>
                    <Input
                      placeholder={t.communication.typeMessage}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      className="flex-1 h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"><Smile className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent>Emoji</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"><Mic className="w-4 h-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.communication.voiceMessage}</TooltipContent>
                    </Tooltip>
                    <Button
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg shadow-sm"
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 border-t border-border bg-destructive/5">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  </div>
                   <p className="text-xs text-muted-foreground">
                     {t.communication.noChannelAccess} <span className="font-semibold">{selected ? CHANNEL_LABEL[selected.channel] : ''}</span>. {t.communication.contactAdmin}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-9 h-9 text-muted-foreground/30" />
                </div>
                 <p className="text-sm font-medium text-muted-foreground">{t.communication.selectTicket}</p>
                 <p className="text-xs text-muted-foreground/50 mt-1 max-w-[220px]">
                   {t.communication.selectConversation}
                 </p>
              </motion.div>
            </div>
          )}
        </div>

        {/* ── Column 3: Details Panel ── */}
        <div className="hidden lg:flex flex-col bg-card border-l border-border">
          {selected ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Contact Card */}
                <div className="flex flex-col items-center text-center pt-2">
                  <Avatar className="w-14 h-14 mb-3">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                      {selected.contact_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold text-foreground">{selected.contact_name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{selected.contact_identifier}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {(() => { const I = CHANNEL_ICON[selected.channel]; return <I className="w-3 h-3 text-muted-foreground" />; })()}
                    <span className="text-[11px] text-muted-foreground">{CHANNEL_LABEL[selected.channel]}</span>
                  </div>
                </div>

                <Separator />

                {/* Quick Info */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.communication.info}</h4>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selected.status].dotColor}`} />
                        Status
                      </span>
                      <Select value={selected.status} onValueChange={v => handleUpdateStatus(v as TicketStatus)}>
                        <SelectTrigger className="h-6 text-[10px] w-auto border-0 bg-transparent px-1 gap-1">
                          <Badge variant="outline" className={`text-[10px] border ${STATUS_CONFIG[selected.status].className}`}>
                            {STATUS_CONFIG[selected.status].label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="open">{t.communication.statusOpen}</SelectItem>
                           <SelectItem value="waiting">{t.communication.statusWaiting}</SelectItem>
                           <SelectItem value="resolved">{t.communication.statusResolved}</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {t.communication.createdAt}
                      </span>
                      <span className="text-xs text-foreground">
                        {new Date(selected.created_at).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Queue & Assignment */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.communication.assignment}</h4>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Hash className="w-3 h-3" /> {t.communication.queue}
                      </label>
                      <Select value={selected.queue || 'none'} onValueChange={v => handleUpdateField('queue', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="none">{t.communication.noQueue}</SelectItem>
                           <SelectItem value="support">{t.communication.support}</SelectItem>
                           <SelectItem value="sales">{t.communication.sales}</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {t.communication.assignedTo}
                      </label>
                      <Select value={selected.assigned_to || 'none'} onValueChange={v => handleUpdateField('assigned_to', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t.communication.unassigned}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">ID</span>
                  <p className="text-[10px] font-mono text-muted-foreground/50 truncate">{selected.id}</p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center px-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-muted-foreground/30" />
                </div>
                 <p className="text-xs text-muted-foreground">{t.communication.ticketDetails}</p>
                 <p className="text-[11px] text-muted-foreground/50 mt-0.5">{t.communication.selectToSeeDetails}</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
