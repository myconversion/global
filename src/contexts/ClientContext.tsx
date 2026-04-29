import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Client, ID } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withBuFilter } from '@/lib/bu-filter';

function mapClient(row: any): Client {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    cnpj: row.cnpj ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    contactName: row.contact_name ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

interface ClientContextType {
  clients: Client[];
  loading: boolean;
  createClient: (data: Omit<Client, 'id' | 'companyId' | 'createdAt'>) => Promise<Client | null>;
  updateClient: (id: ID, data: Partial<Omit<Client, 'id' | 'companyId' | 'createdAt'>>) => Promise<void>;
  deleteClient: (id: ID) => Promise<void>;
  getClientById: (id: ID) => Client | undefined;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;

  const fetchClients = useCallback(async () => {
    if (!companyId) { setClients([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    query = withBuFilter(query, buId);
    const { data, error } = await query;
    if (!error && data) setClients(data.map(mapClient));
    setLoading(false);
  }, [companyId, buId]);

  const refreshClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = useCallback(async (data: Omit<Client, 'id' | 'companyId' | 'createdAt'>): Promise<Client | null> => {
    if (!companyId || !supabaseUser) return null;
    const { data: row, error } = await supabase
      .from('clients')
      .insert({
        company_id: companyId,
        business_unit_id: buId ?? null,
        name: data.name,
        cnpj: data.cnpj ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        contact_name: data.contactName ?? null,
        notes: data.notes ?? null,
        created_by: supabaseUser.id,
      } as any)
      .select()
      .single();
    if (error) { console.error('Error creating client:', error); return null; }
    const newClient = mapClient(row);
    setClients(prev => [newClient, ...prev]);
    return newClient;
  }, [companyId, supabaseUser, buId]);

  const updateClient = useCallback(async (id: ID, data: Partial<Omit<Client, 'id' | 'companyId' | 'createdAt'>>) => {
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.cnpj !== undefined) updates.cnpj = data.cnpj ?? null;
    if (data.email !== undefined) updates.email = data.email ?? null;
    if (data.phone !== undefined) updates.phone = data.phone ?? null;
    if (data.address !== undefined) updates.address = data.address ?? null;
    if (data.contactName !== undefined) updates.contact_name = data.contactName ?? null;
    if (data.notes !== undefined) updates.notes = data.notes ?? null;

    const { error } = await supabase.from('clients').update(updates).eq('id', id);
    if (error) { console.error('Error updating client:', error); return; }
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const deleteClient = useCallback(async (id: ID) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error('Error deleting client:', error); return; }
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  const getClientById = useCallback((id: ID) => clients.find(c => c.id === id), [clients]);

  return (
    <ClientContext.Provider value={{ clients, loading, createClient, updateClient, deleteClient, getClientById, refreshClients }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClientContext must be used within ClientProvider');
  return ctx;
}
