
-- Channel enum
CREATE TYPE public.comm_channel AS ENUM ('whatsapp', 'email', 'instagram', 'facebook', 'telegram');

-- Ticket status enum
CREATE TYPE public.comm_ticket_status AS ENUM ('open', 'waiting', 'resolved');

-- Conversations table
CREATE TABLE public.communication_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_identifier TEXT NOT NULL, -- phone, email, handle
  channel comm_channel NOT NULL DEFAULT 'whatsapp',
  status comm_ticket_status NOT NULL DEFAULT 'open',
  queue TEXT DEFAULT NULL, -- suporte, vendas, etc.
  assigned_to UUID DEFAULT NULL,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.communication_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'contact', -- 'contact' or 'user'
  sender_id UUID DEFAULT NULL, -- user_id if sender_type = 'user'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.communication_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Members can view conversations" ON public.communication_conversations
  FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create conversations" ON public.communication_conversations
  FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update conversations" ON public.communication_conversations
  FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can delete conversations" ON public.communication_conversations
  FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- Messages policies
CREATE POLICY "Members can view messages" ON public.communication_messages
  FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create messages" ON public.communication_messages
  FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update messages" ON public.communication_messages
  FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can delete messages" ON public.communication_messages
  FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_messages;

-- Updated_at trigger
CREATE TRIGGER update_communication_conversations_updated_at
  BEFORE UPDATE ON public.communication_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
