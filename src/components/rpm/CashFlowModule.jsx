import React, { useState } from 'react';
import { 
  DollarSign, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Wallet,
  Calendar,
  Percent,
  FileText,
  Info
} from 'lucide-react';
import { useNexusContext } from '../../context/NexusContext';
import { useNexusRPM } from '../../hooks/useNexusRPM';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const EXPENSE_CATEGORIES = [
  'Pago Proveedores',
  'Insumo de aseo',
  'Insumo de taller',
  'Bencina',
  'Oficina',
  'Pago de contador',
  'Pago Sueldos',
  'Pago Imposiciones',
  'Pago Proveedores Software gestión',
  'Pago de SSBB Electricidad y agua',
  'Pago de SSBB Teléfono',
  'Herramientas',
  'Pago de Impuestos',
  'Pago Arriendo',
  'Pago Publicidad'
];

// Palabras clave para identificar si un gasto es fijo
const FIXED_KEYWORDS = [
  'sueldo', 
  'arriendo', 
  'imposicion', 
  'contador', 
  'software', 
  'ssbb', 
  'luz', 
  'agua', 
  'telefono', 
  'publicidad', 
  'internet', 
  'fijo'
];

const isFixedExpense = (catName) => {
  const name = catName.toLowerCase();
  return FIXED_KEYWORDS.some(kw => name.includes(kw));
};

export default function CashFlowModule() {
  const { companyName, companyId } = useNexusContext();
  const { data: { yearlyCashflow }, loading } = useNexusRPM();
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // Mes real del sistema (0-11)

  // Estado del mes de inicio del flujo de caja
  const [startMonthIdx, setStartMonthIdx] = useState(() => {
    const saved = localStorage.getItem(`nexus_rpm_cashflow_start_month_${companyId}`);
    return saved !== null ? Number(saved) : 0;
  });

  // Estado para ocultar gastos fijos de meses futuros
  const [hideFutureFixed, setHideFutureFixed] = useState(() => {
    const saved = localStorage.getItem(`nexus_rpm_cashflow_hide_future_fixed_${companyId}`);
    return saved === 'true';
  });

  const handleStartMonthChange = (e) => {
    const idx = Number(e.target.value);
    setStartMonthIdx(idx);
    localStorage.setItem(`nexus_rpm_cashflow_start_month_${companyId}`, idx.toString());
  };

  const handleToggleHideFutureFixed = (e) => {
    const checked = e.target.checked;
    setHideFutureFixed(checked);
    localStorage.setItem(`nexus_rpm_cashflow_hide_future_fixed_${companyId}`, checked.toString());
  };

  if (loading || !yearlyCashflow) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-655 font-pulse">Cargando flujo de caja anual...</p>
      </div>
    );
  }

  const fmt = (num) => {
    if (num === undefined || num === null) return '0';
    return Math.round(num).toLocaleString('es-CL');
  };

  // 1. Obtener todas las categorías de gastos dinámicamente
  const allExpenseCategories = Array.from(new Set([
    ...EXPENSE_CATEGORIES,
    ...Object.keys(yearlyCashflow.gastos || {})
  ])).sort();

  // 2. Calcular ingresos mensuales
  const totalIngresos = Array(12).fill(0).map((_, m) => 
    (yearlyCashflow.ingresos.facturas[m] || 0) + 
    (yearlyCashflow.ingresos.boletas[m] || 0)
  );

  // 3. Calcular egresos mensuales (ocultando fijos futuros si está activo)
  const totalGastos = Array(12).fill(0).map((_, m) => {
    let sum = 0;
    Object.entries(yearlyCashflow.gastos || {}).forEach(([cat, arr]) => {
      const isFutureFixed = hideFutureFixed && m > currentMonthIdx && isFixedExpense(cat);
      sum += isFutureFixed ? 0 : (arr[m] || 0);
    });
    return sum;
  });

  // 4. Calcular Flujo Neto Mensual
  const flujoNetoMensual = Array(12).fill(0).map((_, m) => totalIngresos[m] - totalGastos[m]);

  // 5. Calcular Saldos Acumulativos
  const saldosIniciales = Array(12).fill(0);
  const saldosFinales = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    if (m < startMonthIdx) {
      saldosIniciales[m] = 0;
      saldosFinales[m] = 0;
    } else if (m === startMonthIdx) {
      saldosIniciales[m] = 0;
      saldosFinales[m] = saldosIniciales[m] + flujoNetoMensual[m];
    } else {
      saldosIniciales[m] = saldosFinales[m - 1];
      saldosFinales[m] = saldosIniciales[m] + flujoNetoMensual[m];
    }
  }

  // 6. KPIs Totales Anuales (a partir del mes de inicio)
  const anualIngresos = totalIngresos.slice(startMonthIdx).reduce((sum, val) => sum + val, 0);
  const anualGastos = totalGastos.slice(startMonthIdx).reduce((sum, val) => sum + val, 0);
  const anualNeto = anualIngresos - anualGastos;
  const saldoFinalProyectado = saldosFinales[11];

  const exportToCSV = () => {
    const visibleMonthsList = MONTHS.slice(startMonthIdx);
    const headers = ['Concepto', ...visibleMonthsList];
    const rows = [];
    
    rows.push(['Saldo Inicial', ...saldosIniciales.slice(startMonthIdx).map(v => Math.round(v))]);
    rows.push([]);
    rows.push([`Ingresos ${companyName || 'Empresa'}`]);
    rows.push(['Ventas Facturas', ...yearlyCashflow.ingresos.facturas.slice(startMonthIdx).map(v => Math.round(v))]);
    rows.push(['Ventas Boleta', ...yearlyCashflow.ingresos.boletas.slice(startMonthIdx).map(v => Math.round(v))]);
    rows.push(['Notas de crédito', ...Array(12 - startMonthIdx).fill(0)]);
    rows.push(['Ventas crédito', ...Array(12 - startMonthIdx).fill(0)]);
    rows.push(['Total Ingresos', ...totalIngresos.slice(startMonthIdx).map(v => Math.round(v))]);
    rows.push([]);
    rows.push(['Gastos']);
    
    allExpenseCategories.forEach(cat => {
      const values = yearlyCashflow.gastos[cat] || Array(12).fill(0);
      const mappedValues = values.map((v, m) => {
        const isFutureFixed = hideFutureFixed && m > currentMonthIdx && isFixedExpense(cat);
        return isFutureFixed ? 0 : v;
      });
      rows.push([cat, ...mappedValues.slice(startMonthIdx).map(v => Math.round(v))]);
    });
    rows.push(['Total Gastos', ...totalGastos.slice(startMonthIdx).map(v => Math.round(v))]);
    rows.push([]);
    rows.push(['Flujo Neto Mensual', ...flujoNetoMensual.slice(startMonthIdx).map(v => Math.round(v))]);
    rows.push(['Saldo Final Acumulado', ...saldosFinales.slice(startMonthIdx).map(v => Math.round(v))]);
    
    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.map(val => typeof val === 'number' ? val : `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Flujo_Caja_${currentYear}_${(companyName || 'Empresa').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const nextMonthName = currentMonthIdx < 11 ? MONTHS[currentMonthIdx + 1] : '';

  return (
    <div className="space-y-8 text-slate-900 animate-fade-in">
      
      {/* Cabecera con selector y exportación */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <Calendar size={13} className="animate-pulse" />
            Periodo Financiero Anual: {currentYear}
          </span>

          <div className="flex flex-wrap items-center gap-4 bg-white p-1.5 px-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide text-[10px]">Mes de Inicio:</span>
              <select
                value={startMonthIdx}
                onChange={handleStartMonthChange}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1 px-2 text-slate-700 text-xs font-extrabold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            
            <div className="hidden md:block h-4 w-[1px] bg-slate-200"></div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideFutureFixed}
                onChange={handleToggleHideFutureFixed}
                className="sr-only peer"
              />
              <div className="relative w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-650"></div>
              <span className="text-xs font-extrabold text-slate-600 text-[10px] uppercase tracking-wide">
                Mirada al Presente (Ocultar fijos futuros)
              </span>
            </label>
          </div>
        </div>

        <button 
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-950 hover:from-slate-900 hover:to-black text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg text-xs font-extrabold tracking-wider uppercase"
        >
          <Download size={14} />
          Exportar CSV Financiero
        </button>
      </div>

      {/* Banner de Modo Mirada al Presente */}
      {hideFutureFixed && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-900 shadow-sm animate-in fade-in duration-200">
          <Info size={18} className="text-indigo-650 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold mb-0.5">Modo "Mirada al Presente" Activo</p>
            <p className="text-slate-600 font-normal leading-relaxed">
              Los gastos fijos proyectados de los meses posteriores a <strong>{MONTHS[currentMonthIdx]}</strong> {currentMonthIdx < 11 ? `(desde ${nextMonthName} en adelante)` : ''} se han establecido en $0 en las proyecciones. Esto te permite evaluar la caja real acumulada de lo que va de año sin estimaciones futuras.
            </p>
          </div>
        </div>
      )}

      {/* Grid de KPIs Anuales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI: Ingresos Anuales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl"></div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ingresos Totales</span>
              <ArrowUpRight className="text-blue-500" size={16} />
            </div>
            <p className="text-xl font-extrabold text-slate-800">${fmt(anualIngresos)}</p>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 font-medium">Suma acumulada de facturas y boletas</p>
        </div>

        {/* KPI: Gastos Anuales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl"></div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Gastos Totales</span>
              <ArrowDownRight className="text-rose-500" size={16} />
            </div>
            <p className="text-xl font-extrabold text-slate-800">${fmt(anualGastos)}</p>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 font-medium">
            {hideFutureFixed ? 'Gastos reales históricos + variables futuros' : 'Suma de OPEX e inversiones de CAPEX'}
          </p>
        </div>

        {/* KPI: Flujo Neto Anual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl"></div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Balance Neto Anual</span>
              <TrendingUp className="text-emerald-500" size={16} />
            </div>
            <p className={`text-xl font-extrabold ${anualNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${fmt(anualNeto)}
            </p>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 font-medium">Rendimiento neto de caja anual</p>
        </div>

        {/* KPI: Saldo Final Proyectado */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all ${
          saldoFinalProyectado >= 0 
            ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' 
            : 'bg-rose-50/40 border-rose-200 text-rose-950'
        }`}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo Final Proyectado</span>
              <Wallet className={saldoFinalProyectado >= 0 ? 'text-emerald-600' : 'text-rose-600'} size={16} />
            </div>
            <p className={`text-xl font-extrabold ${saldoFinalProyectado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${fmt(saldoFinalProyectado)}
            </p>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 font-medium">Caja neta disponible en Diciembre</p>
        </div>

      </div>

      {/* Tabla de Flujo de Caja Anual */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5 min-w-[280px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200 font-extrabold text-slate-800">
                  Concepto Financiero
                </th>
                {MONTHS.slice(startMonthIdx).map(m => (
                  <th key={m} className="px-3 py-3 min-w-[95px] text-right border-l border-slate-200 font-extrabold text-slate-600">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* SALDO INICIAL */}
              <tr className="bg-slate-100 hover:bg-slate-150 transition-colors font-medium">
                <td className="px-4 py-2.5 font-bold sticky left-0 bg-slate-100 border-r border-slate-200 z-10 text-slate-700">
                  Saldo Inicial Caja
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return (
                    <td key={originalIdx} className="px-3 py-2.5 text-right border-l border-slate-200 text-slate-600 font-semibold">
                      ${fmt(saldosIniciales[originalIdx])}
                    </td>
                  );
                })}
              </tr>

              {/* TÍTULO SECCIÓN: INGRESOS */}
              <tr className="bg-blue-50">
                <td className="px-4 py-2 font-extrabold text-blue-700 sticky left-0 bg-blue-50 border-r border-slate-200 z-10 whitespace-nowrap">
                  INGRESOS OPERACIONALES
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => <td key={idx} className="border-l border-slate-200 bg-blue-50/20"></td>)}
              </tr>

              {/* Categorías de Ingresos */}
              <tr className="hover:bg-slate-50 transition-colors group bg-white font-medium">
                <td className="px-4 py-2 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Facturas</td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return (
                    <td key={originalIdx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-600">
                      ${fmt(yearlyCashflow.ingresos.facturas[originalIdx])}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white font-medium">
                <td className="px-4 py-2 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Boleta</td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return (
                    <td key={originalIdx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-600">
                      ${fmt(yearlyCashflow.ingresos.boletas[originalIdx])}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white text-slate-400 font-medium">
                <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Notas de Crédito</td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return <td key={originalIdx} className="px-3 py-2 text-right border-l border-slate-200">$0</td>;
                })}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white text-slate-400 font-medium">
                <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Crédito</td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return <td key={originalIdx} className="px-3 py-2 text-right border-l border-slate-200">$0</td>;
                })}
              </tr>

              {/* TOTAL INGRESOS */}
              <tr className="bg-blue-100 font-bold border-y border-blue-200">
                <td className="px-4 py-2.5 text-blue-800 sticky left-0 bg-blue-100 border-r border-slate-200 z-10">
                  Total Ingresos
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return (
                    <td key={originalIdx} className="px-3 py-2.5 text-right border-l border-slate-200 text-blue-800 font-extrabold bg-blue-50/30">
                      ${fmt(totalIngresos[originalIdx])}
                    </td>
                  );
                })}
              </tr>

              {/* TÍTULO SECCIÓN: GASTOS */}
              <tr className="bg-rose-50">
                <td className="px-4 py-2 font-extrabold text-rose-700 sticky left-0 bg-rose-50 border-r border-slate-200 z-10 whitespace-nowrap">
                  GASTOS Y EGRESOS
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => <td key={idx} className="border-l border-slate-200 bg-rose-50/20"></td>)}
              </tr>

              {/* Categorías de Gastos Dinámicos */}
              {allExpenseCategories.map((cat, idx) => {
                const values = yearlyCashflow.gastos[cat] || Array(12).fill(0);
                const isAllZero = values.every(v => v === 0);
                return (
                  <tr key={idx} className={`hover:bg-slate-50 transition-colors group bg-white font-medium ${isAllZero ? 'text-slate-400' : 'text-slate-700'}`}>
                    <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">
                      {cat}
                    </td>
                    {MONTHS.slice(startMonthIdx).map((_, mIdx) => {
                      const originalIdx = startMonthIdx + mIdx;
                      const isFutureFixed = hideFutureFixed && originalIdx > currentMonthIdx && isFixedExpense(cat);
                      const displayVal = isFutureFixed ? 0 : (values[originalIdx] || 0);
                      return (
                        <td key={originalIdx} className="px-3 py-2 text-right border-l border-slate-200 font-semibold">
                          {displayVal > 0 ? `$${fmt(displayVal)}` : '$0'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* TOTAL GASTOS */}
              <tr className="bg-rose-100 font-bold border-y border-rose-200">
                <td className="px-4 py-2.5 text-rose-800 sticky left-0 bg-rose-100 border-r border-slate-200 z-10">
                  Total Gastos
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  return (
                    <td key={originalIdx} className="px-3 py-2.5 text-right border-l border-slate-200 text-rose-800 font-extrabold bg-rose-50/30">
                      ${fmt(totalGastos[originalIdx])}
                    </td>
                  );
                })}
              </tr>

              {/* FLUJO NETO MENSUAL */}
              <tr className="bg-slate-200 font-bold border-y border-slate-350 text-slate-800">
                <td className="px-4 py-2.5 sticky left-0 bg-slate-200 border-r border-slate-300 z-10 text-[10px] uppercase tracking-wider">
                  Flujo Neto Mensual
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  const neto = flujoNetoMensual[originalIdx];
                  return (
                    <td 
                      key={originalIdx} 
                      className={`px-3 py-2.5 text-right border-l border-slate-200 font-extrabold
                        ${neto > 0 ? 'text-emerald-700 bg-emerald-50/30' : neto < 0 ? 'text-rose-700 bg-rose-50/30' : 'text-slate-500 bg-slate-50/30'}`}
                    >
                      ${fmt(neto)}
                    </td>
                  );
                })}
              </tr>

              {/* SALDO FINAL ACUMULADO */}
              <tr className="bg-indigo-100 font-bold border-y border-indigo-200 text-indigo-950">
                <td className="px-4 py-3 sticky left-0 bg-indigo-100 border-r border-indigo-200 z-10 text-sm">
                  Saldo Final Acumulado
                </td>
                {MONTHS.slice(startMonthIdx).map((_, idx) => {
                  const originalIdx = startMonthIdx + idx;
                  const saldoFinal = saldosFinales[originalIdx];
                  return (
                    <td 
                      key={originalIdx} 
                      className={`px-3 py-3 text-right border-l border-indigo-200 text-sm font-black bg-indigo-50/20
                        ${saldoFinal >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}
                    >
                      ${fmt(saldoFinal)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
