import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import DateSelector from './DateSelector';

const VIEW_TITLES = {
  dashboard: 'Resumen General',
  expenses: 'Gastos OPEX / CAPEX',
  cashflow: 'Flujo de Caja Anual',
  vat: 'Cálculo de IVA Mensual',
  payroll: 'Liquidaciones & Personal',
  pricing: 'Fijación de Precios',
  admin: 'Panel Super Admin'
};

export default function Layout({ children, currentView, setCurrentView }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          <DateSelector />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}


