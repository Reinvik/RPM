import React from 'react';
import { Target, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

const fmt = (val) => Math.round(val || 0).toLocaleString('es-CL');

export default function BreakEvenCard({ 
  salesTotal = 0, 
  fixedCosts = 0, 
  variableCosts = 0, 
  costoRepuestos = 0,
  selectedMonth, 
  selectedYear 
}) {
  const netSales = Math.max(0, salesTotal - costoRepuestos);
  const netVariableCosts = Math.max(0, variableCosts - costoRepuestos);
  const totalCosts = fixedCosts + netVariableCosts;

  const today = new Date();
  const currentMonth = selectedMonth !== undefined ? selectedMonth : today.getMonth();
  const currentYear = selectedYear !== undefined ? selectedYear : today.getFullYear();

  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const isPastMonth = currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysElapsed = isCurrentMonth ? today.getDate() : (isPastMonth ? daysInMonth : 0);
  const daysPct = daysInMonth > 0 ? (daysElapsed / daysInMonth) * 100 : 0;

  const coveragePct = totalCosts > 0 ? (netSales / totalCosts) * 100 : (netSales > 0 ? 100 : 0);
  const expectedSalesToDate = (totalCosts * daysPct) / 100;
  const salesVsExpectedDiff = netSales - expectedSalesToDate;
  const isBreakEven = netSales >= totalCosts;
  const isAheadOfPace = salesVsExpectedDiff >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden space-y-5">
      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none select-none">
        <Target size={128} className="text-slate-900" />
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
          <Target size={20} className="text-blue-600" />
          Punto de Equilibrio Operativo
        </h3>
        {daysElapsed > 0 && (
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-slate-200">
            <Clock size={12} className="text-slate-400" />
            Día {daysElapsed} de {daysInMonth} ({daysPct.toFixed(1)}% del mes)
          </span>
        )}
      </div>

      {/* 3 Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas Actuales (Neto)</p>
          <p className="text-xl font-black text-slate-900">${fmt(netSales)}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Lleva: {coveragePct.toFixed(1)}% de la meta</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Debería Llevar Hoy ({daysPct.toFixed(1)}%)</p>
          <p className="text-xl font-black text-blue-700">${fmt(expectedSalesToDate)}</p>
          <p className="text-[10px] font-semibold text-blue-600 mt-0.5">Avance de tiempo proporcional</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Meta de Costos (Punto Eq.)</p>
          <p className="text-xl font-black text-slate-800">${fmt(totalCosts)}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Costos Fijos + Var. Netos</p>
        </div>
      </div>

      {/* Barras de comparación visual */}
      <div className="space-y-3">
        {/* Tiempo transcurrido */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>Avance del Mes (Tiempo transcurrido)</span>
            <span>{daysPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-slate-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(daysPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Cobertura de ventas */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold" style={{ color: isBreakEven ? '#059669' : '#e11d48' }}>
            <span>Cobertura de Punto de Equilibrio (Ventas)</span>
            <span>{coveragePct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${isBreakEven ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
              style={{ width: `${Math.min(coveragePct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mensaje de Análisis de Avance a Hoy */}
      {isCurrentMonth && (
        <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
          isAheadOfPace 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            {isAheadOfPace ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-amber-600 shrink-0" />}
            <span>
              {isAheadOfPace
                ? `Ritmo óptimo: +$${fmt(salesVsExpectedDiff)} por sobre la meta esperada al día ${daysElapsed}`
                : `Ritmo atrasado: -$${fmt(Math.abs(salesVsExpectedDiff))} por debajo del ritmo esperado para el día ${daysElapsed}`
              }
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 pl-6">
            Al día <strong>{daysElapsed} de {daysInMonth} ({daysPct.toFixed(1)}% del mes)</strong> deberías llevar acumulados <strong>${fmt(expectedSalesToDate)}</strong> para estar en ritmo ideal de punto de equilibrio. Actualmente llevas <strong>${fmt(netSales)}</strong> ({coveragePct.toFixed(1)}%).
          </p>
        </div>
      )}

      {/* Resumen de costos */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px]">
        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
          <span className="text-slate-500 font-medium">Costos Fijos</span>
          <span className="font-bold text-slate-800">${fmt(fixedCosts)}</span>
        </div>
        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
          <span className="text-slate-500 font-medium">Costos Variables Netos</span>
          <span className="font-bold text-slate-800">${fmt(netVariableCosts)}</span>
        </div>
      </div>
    </div>
  );
}
