import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';
import { Building2, ShieldAlert, Check, User, Trash2, Lock } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { userRole, companyId, changeCompany } = useNexusContext();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAllowed = userRole === 'superadmin' || userRole === 'NexusOwner';

  useEffect(() => {
    if (!isAllowed) return;

    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (!error) {
        setCompanies(data);
      }
    };

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');
      
      if (!error) {
        setUsers(data);
      }
      setLoading(false);
    };

    fetchCompanies();
    fetchUsers();
  }, [userRole]);

  const handleUserCompanyChange = async (userId, newCompanyId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ company_id: newCompanyId })
      .eq('id', userId);
      
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, company_id: newCompanyId } : u));
    } else {
      console.error("Error updating user company:", error);
    }
  };

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
        <p>Solo los superadministradores pueden ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
        <ShieldAlert className="text-blue-600" />
        Panel de Super Admin
      </h1>
      <p className="text-slate-600 mb-8">Administra empresas y asignación de usuarios.</p>

      {loading ? (
        <div className="text-slate-600">Cargando datos...</div>
      ) : (
        <div className="space-y-12">
          
          {/* Sección de Empresas */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-slate-500" />
              Empresas Registradas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => {
                const isActive = company.id === companyId;
                return (
                  <button
                    key={company.id}
                    onClick={() => changeCompany(company.id)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-50 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Building2 size={24} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
                    </div>
                    <div>
                      <h3 className={`font-bold ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                        {company.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 truncate w-40" title={company.id}>
                        {company.id}
                      </p>
                      {isActive && (
                        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
                          Compañía Activa
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sección de Usuarios (Estilo Imagen 2) */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-slate-500" />
              Gestión de Usuarios y Cuentas
            </h2>
            
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50 transition-colors gap-4">
                    
                    {/* Info Usuario */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                        {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.full_name || user.email.split('@')[0]}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    {/* Selector de Empresa y Roles */}
                    <div className="flex flex-wrap items-center gap-3">
                      
                      {/* Dropdown de Empresa */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Empresa Asignada</span>
                        <select
                          value={user.company_id || ''}
                          onChange={(e) => handleUserCompanyChange(user.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Sin Empresa</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rol */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Rol</span>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1
                          ${user.role === 'superadmin' || user.role === 'NexusOwner' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                        >
                          {user.role === 'NexusOwner' ? 'NEXUS OWNER' : user.role?.toUpperCase() || 'USER'}
                        </span>
                      </div>

                      {/* Estado */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Estado</span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <Check size={14} /> ACTIVO
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 ml-2 self-end mb-1">
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Bloquear">
                          <Lock size={18} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
