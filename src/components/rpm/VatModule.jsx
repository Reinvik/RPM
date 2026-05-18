import React from 'react';
import { FileText, Calculator } from 'lucide-react';
import VatCalculatorCard from './VatCalculatorCard';
import { useNexusRPM } from '../../hooks/useNexusRPM';

export default function VatModule() {
  const { data: { salesTotal, expenses } } = useNexusRPM();

  const gastosConIva = expenses
    .filter(e => e.aplica_credito_iva)
    .reduce((acc, curr) => acc + curr.monto, 0);

  return (
    <div className="text-white">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VatCalculatorCard 
          salesTotal={salesTotal} 
          gastosConIva={gastosConIva} 
        />
        
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2 mb-4">
            <Calculator className="text-amber-400" /> Detalle Crédito Fiscal (Compras)
          </h2>
          <div className="space-y-3">
            {expenses.filter(e => e.aplica_credito_iva).length === 0 && (
              <p className="text-slate-500 text-sm">No hay compras con factura registradas este mes.</p>
            )}
            {expenses.filter(e => e.aplica_credito_iva).map(exp => (
              <div key={exp.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                <div>
                  <p className="font-semibold">{exp.categoria}</p>
                  <p className="text-xs text-slate-400">{new Date(exp.fecha).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-300 font-bold">${Number(exp.monto).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-emerald-400">IVA: ${(Number(exp.monto) * 0.19).toLocaleString('es-CL')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
