import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NexusContext = createContext();

export const useNexusContext = () => useContext(NexusContext);

export const NexusProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
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

  // Prevenir que el refresh de token reinicie la empresa seleccionada por el superadmin
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

      // Si es superadmin, revisar si hay una empresa persistida en localStorage
      let targetCompanyId = profile.company_id;
      
      if (profile.role === 'superadmin' || profile.role === 'NexusOwner') {
        const persistedCompanyId = localStorage.getItem('nexusRpm_impersonatedCompany');
        if (persistedCompanyId) {
          targetCompanyId = persistedCompanyId;
        } else if (currentCompId) {
          targetCompanyId = currentCompId;
        }
      } else {
        // Si no es superadmin, limpiar el localStorage por seguridad y usar el original
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
    if (userRole === 'superadmin' || userRole === 'NexusOwner') {
      localStorage.setItem('nexusRpm_impersonatedCompany', newCompanyId);
      setCompanyId(newCompanyId);
      fetchCompanyDetails(newCompanyId);
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
