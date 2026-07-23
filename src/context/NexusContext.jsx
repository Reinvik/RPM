import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NexusContext = createContext();

export const useNexusContext = () => useContext(NexusContext);

export const NexusProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState(null);
  const [companyName, setCompanyName] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ── Refresh global — cualquier módulo puede suscribirse para recargarse ──
  const [globalRefreshTick, setGlobalRefreshTick] = useState(0);
  const triggerGlobalRefresh = () => setGlobalRefreshTick(t => t + 1);

  // Auto-refresh cada 90 segundos (sincronización pasiva entre PCs)
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalRefreshTick(t => t + 1);
    }, 90_000);
    return () => clearInterval(interval);
  }, []);

  // Cargar sucursales / empresas asociadas a la cuenta
  const fetchAvailableCompanies = async (profile) => {
    if (!profile) return [];
    
    if (profile.role === 'superadmin' || profile.role === 'NexusOwner') {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (!error && data) {
        setAvailableCompanies(data);
        return data;
      }
      return [];
    }

    if (!profile.company_id) {
      setAvailableCompanies([]);
      return [];
    }

    try {
      // 1. Obtener la compañía asignada en el perfil
      const { data: userComp, error: compErr } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (compErr || !userComp) {
        setAvailableCompanies([]);
        return [];
      }

      const rootCompanyId = userComp.parent_company_id || userComp.id;

      // 2. Buscar matriz y todas las sucursales asociadas
      const { data: branches, error: branchesErr } = await supabase
        .from('companies')
        .select('*')
        .or(`id.eq.${rootCompanyId},parent_company_id.eq.${rootCompanyId}`)
        .order('name');

      const result = (!branchesErr && branches && branches.length > 0) ? branches : [userComp];
      setAvailableCompanies(result);
      return result;
    } catch (e) {
      console.error('Error fetching available companies/branches:', e);
      setAvailableCompanies([]);
      return [];
    }
  };

  // Prevenir que el refresh de token reinicie la empresa seleccionada
  const fetchUserProfile = async (userId, currentCompId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setUserProfile(profile);
      setUserRole(profile.role);

      const branches = await fetchAvailableCompanies(profile);

      let targetCompanyId = profile.company_id;
      
      if (profile.role === 'superadmin' || profile.role === 'NexusOwner') {
        const persistedCompanyId = localStorage.getItem('nexusRpm_impersonatedCompany');
        if (persistedCompanyId) {
          targetCompanyId = persistedCompanyId;
        } else if (currentCompId) {
          targetCompanyId = currentCompId;
        }
      } else {
        // Para usuario normal, verificar si hay sucursal seleccionada guardada en localStorage
        const persistedBranch = localStorage.getItem(`nexusRpm_selectedBranch_${userId}`);
        if (persistedBranch && branches.some(b => b.id === persistedBranch)) {
          targetCompanyId = persistedBranch;
        }
        localStorage.removeItem('nexusRpm_impersonatedCompany');
      }
      
      if (!currentCompId || currentCompId !== targetCompanyId) {
        setCompanyId(targetCompanyId);
      }

      if (targetCompanyId) {
        fetchCompanyDetails(targetCompanyId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session error:", error);
        setLoading(false);
        return;
      }
      setSession(session);
      if (session) {
        // En la carga inicial pasamos null para que tome el del perfil
        fetchUserProfile(session.user.id, null);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Evitar llamadas innecesarias en eventos de Token Refresh
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null);
        setCompanyId(null);
        setUserRole(null);
        setCompanySettings(null);
        setCompanyName('');
        setAvailableCompanies([]);
        setLoading(false);
        return;
      }

      setSession(session);
      if (session && event === 'SIGNED_IN') {
        // Solo recargamos el perfil completo si es un login nuevo
        fetchUserProfile(session.user.id, null);
      } else if (session && event === 'TOKEN_REFRESHED') {
        // No hacemos nada para no romper el estado
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCompanyDetails = async (cId) => {
    // Buscar config de garage
    const { data: settings } = await supabase
      .schema('garage')
      .from('garage_settings')
      .select('*')
      .eq('company_id', cId)
      .single();
      
    setCompanySettings(settings || null);

    // Buscar nombre base
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', cId)
      .single();
      
    if (company) {
      setCompanyName(settings?.business_name || company.name);
    }
  };

  const changeCompany = (newCompanyId) => {
    const isAllowed = userRole === 'superadmin' || 
                      userRole === 'NexusOwner' || 
                      availableCompanies.some(c => c.id === newCompanyId);

    if (isAllowed) {
      if (userRole === 'superadmin' || userRole === 'NexusOwner') {
        localStorage.setItem('nexusRpm_impersonatedCompany', newCompanyId);
      } else if (session?.user?.id) {
        localStorage.setItem(`nexusRpm_selectedBranch_${session.user.id}`, newCompanyId);
      }

      setCompanyId(newCompanyId);
      fetchCompanyDetails(newCompanyId);
      triggerGlobalRefresh();
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('nexusRpm_impersonatedCompany');
    await supabase.auth.signOut();
  };

  const login = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const value = {
    session,
    userProfile,
    companyId,
    userRole,
    companySettings,
    companyName,
    availableCompanies,
    loading,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    globalRefreshTick,
    triggerGlobalRefresh,
    login,
    changeCompany,
    handleLogout
  };

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
};
