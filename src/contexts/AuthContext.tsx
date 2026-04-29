import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { AppRole, Sector, SectorPermission, ALL_SECTORS } from '@/types/permissions';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Company {
  id: string;
  name: string;
}

interface BusinessUnit {
  id: string;
  name: string;
}

interface Membership {
  company_id: string;
  role: AppRole;
  company: Company;
}

interface AuthContextType {
  user: Profile | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  role: AppRole;
  currentCompany: Company | null;
  companies: Company[];
  currentBusinessUnit: BusinessUnit | null;
  businessUnits: BusinessUnit[];
  setCurrentBusinessUnit: (unit: BusinessUnit | null) => void;
  sectorPermissions: SectorPermission[];
  enabledModules: Sector[];
  setCurrentCompany: (company: Company) => void;
  hasSectorAccess: (sector: Sector) => boolean;
  hasSectorPermission: (sector: Sector, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  isModuleEnabled: (module: Sector) => boolean;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [role, setRole] = useState<AppRole>('collaborator');
  const [sectorPermissions, setSectorPermissions] = useState<SectorPermission[]>([]);
  const [enabledModules, setEnabledModules] = useState<Sector[]>([...ALL_SECTORS]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [currentBusinessUnit, setCurrentBusinessUnitState] = useState<BusinessUnit | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: membershipData } = await supabase
        .from('company_memberships')
        .select('company_id, role, companies(id, name)')
        .eq('user_id', userId);

      if (membershipData && membershipData.length > 0) {
        const mapped: Membership[] = membershipData.map((m: any) => ({
          company_id: m.company_id,
          role: m.role as AppRole,
          company: m.companies as Company,
        }));
        setMemberships(mapped);

        const storedCompanyId = localStorage.getItem('currentCompanyId');
        const preferred = mapped.find(m => m.company_id === storedCompanyId);
        const active = preferred || mapped[0];
        setCurrentCompanyState(active.company);
        setRole(active.role);

        // Load sector permissions
        const { data: permissions } = await supabase
          .from('user_sector_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('company_id', active.company_id);

        if (permissions) {
          setSectorPermissions(permissions.map((p: any) => ({
            sector: p.sector as Sector,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          })));
        } else {
          if (active.role === 'admin' || active.role === 'super_admin') {
            setSectorPermissions(ALL_SECTORS.map(s => ({
              sector: s, can_view: true, can_create: true, can_edit: true, can_delete: true,
            })));
          }
        }

        // Load enabled modules for the company
        const { data: modulesData } = await supabase
          .from('company_modules')
          .select('module, is_enabled')
          .eq('company_id', active.company_id);

        if (modulesData && modulesData.length > 0) {
          const enabled = modulesData
            .filter((m: any) => m.is_enabled)
            .map((m: any) => m.module as Sector);
          setEnabledModules(enabled);
        } else {
          // No module config = all enabled (backwards compat)
          setEnabledModules([...ALL_SECTORS]);
        }

        // Load business units for the company
        const { data: buData } = await supabase
          .from('business_units')
          .select('id, name')
          .eq('company_id', active.company_id)
          .eq('is_active', true)
          .order('name');
        if (buData) {
          setBusinessUnits(buData as BusinessUnit[]);
        } else {
          setBusinessUnits([]);
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (newSession?.user) {
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setProfile(null);
        setMemberships([]);
        setCurrentCompanyState(null);
        setRole('collaborator');
        setSectorPermissions([]);
        setEnabledModules([...ALL_SECTORS]);
        setBusinessUnits([]);
        setCurrentBusinessUnitState(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setSupabaseUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        loadUserData(currentSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const setCurrentCompany = useCallback((company: Company) => {
    setCurrentCompanyState(company);
    localStorage.setItem('currentCompanyId', company.id);
    const membership = memberships.find(m => m.company_id === company.id);
    if (membership) {
      setRole(membership.role);
    }
  }, [memberships]);

  const isModuleEnabled = useCallback((module: Sector) => {
    return enabledModules.includes(module);
  }, [enabledModules]);

  const hasSectorAccess = useCallback((sector: Sector) => {
    // Module must be enabled for the company
    if (!enabledModules.includes(sector)) return false;
    if (role === 'super_admin' || role === 'admin') return true;
    return sectorPermissions.some(p => p.sector === sector && p.can_view);
  }, [role, sectorPermissions, enabledModules]);

  const hasSectorPermission = useCallback((sector: Sector, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (!enabledModules.includes(sector)) return false;
    if (role === 'super_admin' || role === 'admin') return true;
    const perm = sectorPermissions.find(p => p.sector === sector);
    if (!perm) return false;
    const key = `can_${action}` as keyof SectorPermission;
    return perm[key] as boolean;
  }, [role, sectorPermissions, enabledModules]);

  const setCurrentBusinessUnit = useCallback((unit: BusinessUnit | null) => {
    setCurrentBusinessUnitState(unit);
    if (unit) {
      localStorage.setItem('currentBusinessUnitId', unit.id);
    } else {
      localStorage.removeItem('currentBusinessUnitId');
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        supabaseUser,
        session,
        role,
        currentCompany,
        companies: memberships.map(m => m.company),
        currentBusinessUnit,
        businessUnits,
        setCurrentBusinessUnit,
        sectorPermissions,
        enabledModules,
        setCurrentCompany,
        hasSectorAccess,
        hasSectorPermission,
        isModuleEnabled,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
