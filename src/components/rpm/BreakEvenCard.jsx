import React from 'react';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

export default function BreakEvenCard({ salesTotal, fixedCosts, variableCosts }) {
  const totalCosts = fixedCosts + variableCosts;
  
  const progressPercent = Math.min((salesTotal / (totalCosts || 1)) * 100, 100);
  const isProfitable = salesTotal > totalCosts;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900">
        <Target size={100} />
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Target size={20} className="text-blue-600" />
        Punto de Equilibrio
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-slate-500 font-medium">Ingresos Actuales</p>
          <p className="text-2xl font-bold text-slate-900">${salesTotal.toLocaleString('es-CL')}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Meta (Costos Totales)</p>
          <p className="text-2xl font-bold text-slate-700">${totalCosts.toLocaleString('es-CL')}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-slate-600 font-medium">Progreso hacia cobertura</span>
        <span className={isProfitable ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
          {progressPercent.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isProfitable ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
        {isProfitable ? (
          <>
            <TrendingUp className="text-emerald-500" size={20} />
            <span className="text-emerald-600 font-bold">¡Operando con rentabilidad!</span>
          </>
        ) : (
          <>
            <TrendingDown className="text-amber-500" size={20} />
            <span className="text-amber-600 font-bold">
              Faltan ${(totalCosts - salesTotal).toLocaleString('es-CL')} para el punto de equilibrio
            </span>
          </>
        )}
      </div>
    </div>
  );
}
