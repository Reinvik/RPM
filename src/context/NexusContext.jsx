import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NexusContext = createContext();

export const useNexusContext = () => useContext(NexusContext);

export const isUUID = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

export const DEFAULT_GARAGE_COMPANY_ID = '70d27e8c-332a-4946-8089-e0cd806dcb62'; // Nexus Garage

export const NexusProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [companyId, setCompanyId] = useState(DEFAULT_GARAGE_COMPANY_ID);
  const [companySettings, setCompanySettings] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState(null);
  const [companyName, setCompanyName] = useState('Nexus Garage');

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

  // Helper para resolver la empresa válida de Nexus Garage
  const resolveTargetCompanyId = (profile, branches = []) => {
    // 1. Perfil del usuario
    if (isUUID(profile?.company_id)) {
      return profile.company_id;
    }

    // 2. Impersonated / selección anterior guardada del usuario
    if (profile?.role === 'superadmin' || profile?.role === 'NexusOwner') {
      const persisted = localStorage.getItem('nexusRpm_impersonatedCompany');
      if (isUUID(persisted)) return persisted;
    } else if (profile?.id) {
      const persistedBranch = localStorage.getItem(`nexusRpm_selectedBranch_${profile.id}`);
      if (isUUID(persistedBranch) && branches.some(b => b.id === persistedBranch)) {
        return persistedBranch;
      }
    }

    // 3. LocalStorage de Nexus Garage
    const garageSavedKeys = [
      'nexusgarage_company_id',
      'nexusgarage_selectedCompany',
      'nexus_selected_company',
      'nexusRpm_selectedCompany'
    ];
    for (const key of garageSavedKeys) {
      const val = localStorage.getItem(key);
      if (isUUID(val)) return val;
    }

    // 4. Primera empresa válida de la lista de sucursales
    if (Array.isArray(branches) && branches.length > 0) {
      const validComp = branches.find(b => isUUID(b.id));
      if (validComp) return validComp.id;
    }

    // 5. Fallback por defecto a Nexus Garage UUID
    return DEFAULT_GARAGE_COMPANY_ID;
  };

  // Cargar sucursales / empresas asociadas a la cuenta (Base de Datos + Ecosistema Nexus Garage)
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
    } else if (isUUID(profile?.company_id)) {
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

    // Si no se encontraron empresas por perfil, traer empresas asociadas a Nexus Garage
    if (dbCompanies.length === 0) {
      try {
        const { data: garageComps } = await supabase
          .from('companies')
          .select('*')
          .or('schema_name.eq.garage,allowed_apps.cs.{"garage"}')
          .order('name');

        if (garageComps && garageComps.length > 0) {
          dbCompanies = garageComps;
        }
      } catch (e) {
        console.error('Error fetching garage companies:', e);
      }
    }

    // ── LEER SUCURSALES DEL LOCALSTORAGE (ECOSISTEMA NEXUS GARAGE) ──
    const targetCompId = isUUID(profile?.company_id) ? profile.company_id : DEFAULT_GARAGE_COMPANY_ID;
    const keysToTry = [
      `nexusgarage_branches_${targetCompId}`,
      `nexusgarage_branches`,
      `nexusRpm_branches_${targetCompId}`,
      `nexus_branches_${targetCompId}`,
      `nexus_branches`
    ];

    let localBranches = [];
    for (const key of keysToTry) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localBranches = parsed.filter(b => isUUID(b.id));
            if (localBranches.length > 0) break;
          }
        } catch (e) {}
      }
    }

    // Convertir ramas locales al formato de empresas
    const formattedLocal = localBranches.map(b => ({
      id: b.id,
      name: b.name,
      code: b.code || '',
      business_type: b.business_type || 'garage',
      parent_company_id: b.is_main ? null : (b.company_id || targetCompId)
    }));

    // Si no hay empresas registradas aún, proporcionar Nexus Garage por defecto
    if (dbCompanies.length === 0 && formattedLocal.length === 0) {
      formattedLocal.push({
        id: DEFAULT_GARAGE_COMPANY_ID,
        name: 'Nexus Garage',
        parent_company_id: null,
        business_type: 'garage'
      });
    }

    // Fusionar sin duplicados y filtrando solo UUIDs válidos
    const combinedMap = new Map();
    dbCompanies.forEach(c => {
      if (isUUID(c.id)) combinedMap.set(c.id, c);
    });
    formattedLocal.forEach(b => {
      if (isUUID(b.id) && !combinedMap.has(b.id)) {
        combinedMap.set(b.id, b);
      }
    });

    const finalResult = Array.from(combinedMap.values());
    setAvailableCompanies(finalResult);
    return finalResult;
  };

  const fetchUserProfile = async (userId, currentCompId) => {
    try {
      let profile = null;
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          profile = data;
        }
      }
      
      setUserProfile(profile);
      setUserRole(profile?.role || 'admin');

      const branches = await fetchAvailableCompanies(profile);
      const targetCompanyId = resolveTargetCompanyId(profile, branches);
      
      setCompanyId(targetCompanyId);
      fetchCompanyDetails(targetCompanyId);
    } catch (error) {
      console.error('Error fetching profile:', error);
      const branches = await fetchAvailableCompanies(null);
      const targetCompanyId = resolveTargetCompanyId(null, branches);
      setCompanyId(targetCompanyId);
      fetchCompanyDetails(targetCompanyId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setSession(null);
        fetchUserProfile(null, null);
        return;
      }
      setSession(session);
      fetchUserProfile(session.user.id, null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null);
        setCompanyId(DEFAULT_GARAGE_COMPANY_ID);
        setUserRole(null);
        setCompanySettings(null);
        setCompanyName('Nexus Garage');
        setAvailableCompanies([]);
        setLoading(false);
        return;
      }

      setSession(session);
      if (session && event === 'SIGNED_IN') {
        fetchUserProfile(session.user.id, null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCompanyDetails = async (cId) => {
    if (!cId || !isUUID(cId)) return;
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
        
      if (settings?.workshop_name || settings?.business_name) {
        setCompanyName(settings.workshop_name || settings.business_name);
      } else if (company) {
        setCompanyName(company.name);
      } else {
        setCompanyName('Nexus Garage');
      }
    } catch (e) {
      console.warn("Aviso al obtener detalles de la empresa:", e);
    }
  };

  const changeCompany = (newCompanyId) => {
    if (!isUUID(newCompanyId)) return;

    const isAllowed = userRole === 'superadmin' || 
                      userRole === 'NexusOwner' || 
                      availableCompanies.some(c => c.id === newCompanyId);

    if (isAllowed) {
      if (userRole === 'superadmin' || userRole === 'NexusOwner') {
        localStorage.setItem('nexusRpm_impersonatedCompany', newCompanyId);
      } else if (session?.user?.id) {
        localStorage.setItem(`nexusRpm_selectedBranch_${session.user.id}`, newCompanyId);
      }
      localStorage.setItem('nexusgarage_selectedCompany', newCompanyId);

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
