import React, { useState } from 'react';
import { NexusProvider, useNexusContext } from './context/NexusContext';
import NexusRPMDashboard from './components/rpm/NexusRPMDashboard';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import Login from './components/Login';
import Layout from './components/layout/Layout';
import ExpensesModule from './components/rpm/ExpensesModule';
import CashFlowModule from './components/rpm/CashFlowModule';
import PayrollModule from './components/rpm/PayrollModule';
import VatModule from './components/rpm/VatModule';

const AppContent = () => {
  const { session, loading } = useNexusContext();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {currentView === 'dashboard' && <NexusRPMDashboard />}
      {currentView === 'expenses' && <ExpensesModule />}
      {currentView === 'cashflow' && <CashFlowModule />}
      {currentView === 'payroll' && <PayrollModule />}
      {currentView === 'vat' && <VatModule />}
      {currentView === 'admin' && <SuperAdminDashboard />}
    </Layout>
  );
};

function App() {
  return (
    <NexusProvider>
      <AppContent />
    </NexusProvider>
  );
}

export default App;
