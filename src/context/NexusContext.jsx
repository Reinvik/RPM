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

  // Cargar sucursales / empresas asociadas a la cuenta (Base de Datos + Ecosistema Local)
  const fetchAvailableCompanies = async (profile) => {
    let dbCompanies = [];
    
    if (profile && (profile.role === 'superadmin' || profile.role === 'NexusOwner')) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (!error && data) {
        dbCompanies = data;
      }
    } else if (profile?.company_id) {
      try {
        const { data: userComp } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .maybeSingle();

        if (userComp) {
          const rootCompanyId = userComp.parent_company_id || userComp.id;
          const { data: branches } = await supabase
            .from('companies')
            .select('*')
            .or(`id.eq.${rootCompanyId},parent_company_id.eq.${rootCompanyId}`)
            .order('name');

          dbCompanies = (branches && branches.length > 0) ? branches : [userComp];
        }
      } catch (e) {
        console.error('Error fetching companies from DB:', e);
      }
    }

    // ── LEER SUCURSALES DEL LOCALSTORAGE (ECOSISTEMA NEXUS) ──
    const targetCompId = profile?.company_id || 'company-123';
    const keysToTry = [
      `punto_nexus_branches_${targetCompId}`,
      `nexusRpm_branches_${targetCompId}`,
      `nexus_branches_${targetCompId}`,
      `nexusgarage_branches_${targetCompId}`,
      `punto_nexus_branches_company-123`,
      `nexus_branches`
    ];

    let localBranches = [];
    for (const key of keysToTry) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localBranches = parsed;
            break;
          }
        } catch (e) {}
      }
    }

    // Convertir ramas locales al formato de empresas
    const formattedLocal = localBranches.map(b => ({
      id: b.id,
      name: b.name,
      code: b.code || '',
      business_type: b.business_type || 'alimentos',
      parent_company_id: b.is_main ? null : (b.company_id || targetCompId)
    }));

    // Si no hay empresas registradas aún, proporcionar la Matriz y Minimarket por defecto
    if (dbCompanies.length === 0 && formattedLocal.length === 0) {
      formattedLocal.push(
        { id: 'branch-matriz', name: 'Matriz Principal', parent_company_id: null, business_type: 'gastronomia' },
        { id: 'branch-minimarket', name: 'Nexus Minimarket', parent_company_id: 'company-123', business_type: 'alimentos' }
      );
    }

    // Fusionar sin duplicados
    const combinedMap = new Map();
    dbCompanies.forEach(c => combinedMap.set(c.id, c));
    formattedLocal.forEach(b => {
      if (!combinedMap.has(b.id)) {
        combinedMap.set(b.id, b);
      }
    });

    const finalResult = Array.from(combinedMap.values());
    setAvailableCompanies(finalResult);
    return finalResult;
  };

  // Prevenir que el refresh de token reinicie la empresa seleccionada
  const fetchUserProfile = async (userId, currentCompId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      setUserProfile(profile);
      setUserRole(profile?.role || 'admin');

      const branches = await fetchAvailableCompanies(profile);

      let targetCompanyId = profile?.company_id || 'company-123';
      
      if (profile?.role === 'superadmin' || profile?.role === 'NexusOwner') {
        const persistedCompanyId = localStorage.getItem('nexusRpm_impersonatedCompany');
        if (persistedCompanyId) {
          targetCompanyId = persistedCompanyId;
        } else if (currentCompId) {
          targetCompanyId = currentCompId;
        }
      } else {
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
      console.error('Error fetching profile, usando modo resiliente local:', error);
      await fetchAvailableCompanies(null);
      if (!companyId) setCompanyId('company-123');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session error:", error);
        fetchAvailableCompanies(null);
        if (!companyId) setCompanyId('company-123');
        setLoading(false);
        return;
      }
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id, null);
      } else {
        fetchAvailableCompanies(null);
        if (!companyId) setCompanyId('company-123');
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
    if (!cId) return;
    try {
      // Buscar config de garage
      const { data: settings } = await supabase
        .schema('garage')
        .from('garage_settings')
        .select('*')
        .eq('company_id', cId)
        .maybeSingle();
        
      setCompanySettings(settings || null);

      // Buscar nombre base
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', cId)
        .maybeSingle();
        
      if (company) {
        setCompanyName(settings?.business_name || company.name);
      }
    } catch (e) {
      console.warn("Aviso al obtener detalles de la empresa/sucursal:", e);
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
