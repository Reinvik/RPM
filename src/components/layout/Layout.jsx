import React, { useState } from 'react';
import { Menu, RefreshCw } from 'lucide-react';
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
  const { triggerGlobalRefresh } = useNexusContext();

  const handleSync = () => {
    if (syncing) return;
    setSyncing(true);
    triggerGlobalRefresh();
    // El botón gira 1.5 segundos para dar feedback visual
    setTimeout(() => setSyncing(false), 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight truncate max-w-[180px] sm:max-w-none">
              {VIEW_TITLES[currentView] || currentView}
            </h2>
          </div>

          <div className="flex items-center gap-2">
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
