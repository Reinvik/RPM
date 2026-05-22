import React from 'react';
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
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {VIEW_TITLES[currentView] || currentView}
          </h2>
          <DateSelector />
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

