import React, { useState } from 'react';
import { LineChart, Receipt, Users, Zap } from 'lucide-react';
import BreakEvenCard from './BreakEvenCard';
import VatCalculatorCard from './VatCalculatorCard';
import MechanicSettlement from './MechanicSettlement';
import ExpenseEntryModal from './ExpenseEntryModal';

import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';

export default function NexusRPMDashboard() {
  const { data, loading, addExpense, refetchData } = useNexusRPM();
  const { logout, companyName } = useNexusContext();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">Sincronizando RPM...</div>;
  }

  const { salesTotal, fixedCosts, variableCosts, expenses, mechanics } = data;

  const gastosConIva = expenses
    .filter(e => e.aplica_credito_iva)
    .reduce((acc, curr) => acc + curr.monto, 0);

  return (
    <div className="text-slate-900 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Acciones rápidas */}
        <div className="flex justify-end">
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2"
          >
            <Receipt size={18} />
            Ingresar Gasto
          </button>
        </div>


        {/* Top KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <BreakEvenCard 
            salesTotal={salesTotal} 
            fixedCosts={fixedCosts} 
            variableCosts={variableCosts} 
          />
          <VatCalculatorCard 
            salesTotal={salesTotal} 
            gastosConIva={gastosConIva} 
          />
        </div>

        {/* Productividad y Márgenes de Equipo */}
        <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            Liquidación y Productividad (MO)
          </h2>
          <MechanicSettlement mechanics={mechanics} onUpdate={refetchData} />
        </div>

      </div>

      {/* Modals */}
      <ExpenseEntryModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        onSave={async (expenseData) => {
          const { error } = await addExpense(expenseData);
          if (!error) {
            setIsExpenseModalOpen(false);
          } else {
            alert('Error guardando gasto: ' + error.message);
          }
        }}
      />
    </div>
  );
}
