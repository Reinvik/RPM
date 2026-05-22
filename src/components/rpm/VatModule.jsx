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
    <div className="space-y-6 text-slate-900">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VatCalculatorCard 
          salesTotal={salesTotal} 
          gastosConIva={gastosConIva} 
        />
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Calculator className="text-blue-600" size={20} /> 
            Detalle Crédito Fiscal (Compras)
          </h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {expenses.filter(e => e.aplica_credito_iva).length === 0 ? (
              <p className="text-slate-400 text-sm italic">No hay compras con factura registradas este mes.</p>
            ) : (
              expenses.filter(e => e.aplica_credito_iva).map(exp => (
                <div key={exp.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-150 hover:bg-slate-100/50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{exp.categoria}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {new Date(exp.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-900 font-extrabold text-sm">${Number(exp.monto).toLocaleString('es-CL')}</p>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">
                      IVA (19%): ${(Number(exp.monto) * 0.19).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

