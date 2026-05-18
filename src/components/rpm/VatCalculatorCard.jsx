import React from 'react';
import { Calculator } from 'lucide-react';

export default function VatCalculatorCard({ salesTotal, gastosConIva }) {
  const IVA_RATE = 0.19; // 19% en Chile
  
  const ivaDebito = salesTotal * IVA_RATE;
  const ivaCredito = gastosConIva * IVA_RATE;
  const ivaAPagar = ivaDebito - ivaCredito;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Calculator size={20} className="text-blue-600" />
        Proyección de IVA (Mensual)
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
          <span className="text-slate-600 font-medium">IVA Débito (Ventas)</span>
          <span className="text-lg font-bold text-slate-900">${ivaDebito.toLocaleString('es-CL')}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border-l-4 border-emerald-500">
          <span className="text-slate-600 font-medium">IVA Crédito (Compras)</span>
          <span className="text-lg font-bold text-emerald-600">- ${ivaCredito.toLocaleString('es-CL')}</span>
        </div>

        <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
          <span className="text-slate-700 font-bold">Estimado a Pagar</span>
          <span className={`text-2xl font-bold ${ivaAPagar > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ${Math.max(Math.round(ivaAPagar), 0).toLocaleString('es-CL')}
          </span>
        </div>
      </div>
    </div>
  );
}
