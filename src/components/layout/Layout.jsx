import React, { useState } from 'react';
import { Menu, RefreshCw, Store } from 'lucide-react';
import Sidebar from './Sidebar';
import DateSelector from './DateSelector';
import { useNexusContext } from '../../context/NexusContext';

const VIEW_TITLES = {
  dashboard: 'Resumen General',
  expenses: 'Gestión de Egresos y Facturas',
  cashflow: 'Flujo de Caja Anual',
  payroll: 'Liquidaciones & Personal',
  pricing: 'Precios y Rentabilidad',
  help: 'Centro de Ayuda Financiera',
  admin: 'Panel Super Admin'
};

export default function Layout({ children, currentView, setCurrentView }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { triggerGlobalRefresh, companyId, availableCompanies, changeCompany } = useNexusContext();

  const handleSync = () => {
    if (syncing) return;
    setSyncing(true);
    triggerGlobalRefresh();
    // El botón gira 1.5 segundos para dar feedback visual
    setTimeout(() => setSyncing(false), 1500);
  };

  const hasMultipleBranches = availableCompanies && availableCompanies.length > 1;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 lg:px-8 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight truncate max-w-[150px] sm:max-w-none">
              {VIEW_TITLES[currentView] || currentView}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Selector de Sucursal / Empresa */}
            {hasMultipleBranches && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-xl px-2.5 py-1 text-slate-800 shadow-xs hover:border-blue-300 transition-all">
                <Store size={15} className="text-blue-600 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider leading-none">
                    Sucursal
                  </span>
                  <select
                    value={companyId || ''}
                    onChange={(e) => changeCompany(e.target.value)}
                    className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer pr-4 appearance-none hover:text-blue-700 transition-colors"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right center',
                      backgroundSize: '10px'
                    }}
                    title="Cambiar de sucursal / empresa"
                  >
                    {availableCompanies.map((comp) => {
                      const isBranch = Boolean(comp.parent_company_id);
                      return (
                        <option key={comp.id} value={comp.id} className="bg-white text-slate-900 font-bold py-1">
                          {comp.name} {isBranch ? '• Sucursal' : '• Matriz'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Botón sincronización */}
            <button
              onClick={handleSync}
              title="Sincronizar datos con el servidor"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
                ${syncing
                  ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50'
                }`}
            >
              <RefreshCw
                size={14}
                className={syncing ? 'animate-spin' : ''}
              />
              <span className="hidden sm:inline">
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            </button>

            <DateSelector />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
