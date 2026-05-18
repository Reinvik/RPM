import React from 'react';
import Sidebar from './Sidebar';
import DateSelector from './DateSelector';

export default function Layout({ children, currentView, setCurrentView }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-bold text-slate-900 capitalize">{currentView === 'dashboard' ? 'Resumen Ejecutivo' : currentView}</h2>
          <DateSelector />
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
