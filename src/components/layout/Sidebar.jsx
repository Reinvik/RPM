import React from 'react';
import { LayoutDashboard, Users, LogOut, Settings, BarChart3, DollarSign, FileText, Gauge, Calculator, X, Percent } from 'lucide-react';
import { useNexusContext } from '../../context/NexusContext';

export default function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen }) {
  const { userRole, handleLogout, companyName } = useNexusContext();

  const isSuperAdmin = userRole === 'superadmin' || userRole === 'NexusOwner';

  const navItems = [
    { id: 'dashboard', label: 'Resumen General', icon: LayoutDashboard },
    { id: 'expenses', label: 'Gastos OPEX / CAPEX', icon: Settings },
    { id: 'cashflow', label: 'Flujo de Caja Anual', icon: DollarSign },
    { id: 'vat', label: 'Cálculo de IVA Mensual', icon: FileText },
    { id: 'payroll', label: 'Liquidaciones & Personal', icon: Users },
    { id: 'pricing', label: 'Fijación de Precios', icon: Calculator },
    { id: 'supplies', label: 'Rentabilidad Insumos', icon: Percent },
  ];

  if (isSuperAdmin) {
    navItems.push({ id: 'admin', label: 'Panel Super Admin', icon: Settings });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-[#050B14] text-slate-300 flex flex-col h-screen border-r border-[#1E293B] shadow-2xl transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-cyan-900/10 rounded-full blur-[60px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-900/10 rounded-full blur-[60px]"></div>
        </div>

        {/* Header / Logo */}
        <div className="h-24 flex items-center justify-between px-6 lg:px-8 border-b border-[#1E293B] relative z-10 bg-[#050B14]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-md opacity-30 rounded-full"></div>
              <Gauge className="h-9 w-9 text-cyan-400 relative drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight leading-none">Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">RPM</span></span>
              <span className="text-[10px] font-bold text-cyan-400/60 tracking-[0.2em] uppercase mt-1">by SmartLean</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 text-slate-400 hover:text-white rounded-lg lg:hidden transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 relative z-10 scrollbar-hide">
          <div className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Menu Principal</div>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full relative group flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300
                    ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/5 text-white shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.8)]"></div>
                  )}
                  <item.icon
                    size={20}
                    className={`mr-3 transition-transform duration-300 ${isActive ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-105'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile / Company */}
        <div className="p-4 border-t border-[#1E293B] bg-[#020617]/50 relative z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-slate-800">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-slate-700 group-hover:border-cyan-500/50 shadow-lg transition-all">
                <span>{companyName ? companyName.charAt(0) : 'E'}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{companyName || 'Empresa'}</p>
              <p className="text-xs text-slate-500 truncate group-hover:text-cyan-400/70 transition-colors">
                {isSuperAdmin ? 'Super Admin' : 'Administrador'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 mt-3">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200"
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
