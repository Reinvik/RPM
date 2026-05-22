import React from 'react';
import { 
  DollarSign, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Wallet,
  Calendar,
  Percent,
  FileText
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

export default function CashFlowModule() {
  const { companyName } = useNexusContext();
  const { data: { yearlyCashflow }, loading } = useNexusRPM();
  const currentYear = new Date().getFullYear();

  if (loading || !yearlyCashflow) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-600">Cargando flujo de caja anual...</p>
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

  // 3. Calcular egresos mensuales
  const totalGastos = Array(12).fill(0).map((_, m) => {
    let sum = 0;
    Object.values(yearlyCashflow.gastos || {}).forEach(arr => sum += (arr[m] || 0));
    return sum;
  });

  // 4. Calcular Flujo Neto Mensual
  const flujoNetoMensual = Array(12).fill(0).map((_, m) => totalIngresos[m] - totalGastos[m]);

  // 5. Calcular Saldos Acumulativos
  const saldosIniciales = Array(12).fill(0);
  const saldosFinales = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    saldosIniciales[m] = m === 0 ? 0 : saldosFinales[m - 1];
    saldosFinales[m] = saldosIniciales[m] + flujoNetoMensual[m];
  }

  // 6. KPIs Totales Anuales
  const anualIngresos = totalIngresos.reduce((sum, val) => sum + val, 0);
  const anualGastos = totalGastos.reduce((sum, val) => sum + val, 0);
  const anualNeto = anualIngresos - anualGastos;
  const saldoFinalProyectado = saldosFinales[11];

  const exportToCSV = () => {
    const headers = ['Concepto', ...MONTHS];
    const rows = [];
    
    rows.push(['Saldo Inicial', ...saldosIniciales.map(v => Math.round(v))]);
    rows.push([]);
    rows.push([`Ingresos ${companyName || 'Empresa'}`]);
    rows.push(['Ventas Facturas', ...yearlyCashflow.ingresos.facturas.map(v => Math.round(v))]);
    rows.push(['Ventas Boleta', ...yearlyCashflow.ingresos.boletas.map(v => Math.round(v))]);
    rows.push(['Notas de crédito', ...Array(12).fill(0)]);
    rows.push(['Ventas crédito', ...Array(12).fill(0)]);
    rows.push(['Total Ingresos', ...totalIngresos.map(v => Math.round(v))]);
    rows.push([]);
    rows.push(['Gastos']);
    
    allExpenseCategories.forEach(cat => {
      const values = yearlyCashflow.gastos[cat] || Array(12).fill(0);
      rows.push([cat, ...values.map(v => Math.round(v))]);
    });
    rows.push(['Total Gastos', ...totalGastos.map(v => Math.round(v))]);
    rows.push([]);
    rows.push(['Flujo Neto Mensual', ...flujoNetoMensual.map(v => Math.round(v))]);
    rows.push(['Saldo Final Acumulado', ...saldosFinales.map(v => Math.round(v))]);
    
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

  return (
    <div className="space-y-8 text-slate-900">
      
      {/* Cabecera con selector y exportación */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <Calendar size={13} className="animate-pulse" />
            Periodo Financiero Anual: {currentYear}
          </span>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-950 hover:from-slate-900 hover:to-black text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg text-xs font-extrabold tracking-wider uppercase"
        >
          <Download size={14} />
          Exportar CSV Financiero
        </button>
      </div>

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
          <p className="text-[9px] text-slate-400 mt-2 font-medium">Suma de OPEX e inversiones de CAPEX</p>
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
                {MONTHS.map(m => (
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
                {MONTHS.map((_, idx) => (
                  <td key={idx} className="px-3 py-2.5 text-right border-l border-slate-200 text-slate-600 font-semibold">
                    ${fmt(saldosIniciales[idx])}
                  </td>
                ))}
              </tr>

              {/* TÍTULO SECCIÓN: INGRESOS */}
              <tr className="bg-blue-50">
                <td className="px-4 py-2 font-extrabold text-blue-700 sticky left-0 bg-blue-50 border-r border-slate-200 z-10 whitespace-nowrap">
                  INGRESOS OPERACIONALES
                </td>
                {MONTHS.map((_, idx) => <td key={idx} className="border-l border-slate-200 bg-blue-50/20"></td>)}
              </tr>

              {/* Categorías de Ingresos */}
              <tr className="hover:bg-slate-50 transition-colors group bg-white font-medium">
                <td className="px-4 py-2 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Facturas</td>
                {MONTHS.map((_, idx) => (
                  <td key={idx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-600">
                    ${fmt(yearlyCashflow.ingresos.facturas[idx])}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white font-medium">
                <td className="px-4 py-2 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Boleta</td>
                {MONTHS.map((_, idx) => (
                  <td key={idx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-600">
                    ${fmt(yearlyCashflow.ingresos.boletas[idx])}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white text-slate-400 font-medium">
                <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Notas de Crédito</td>
                {MONTHS.map((_, idx) => <td key={idx} className="px-3 py-2 text-right border-l border-slate-200">$0</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white text-slate-400 font-medium">
                <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Crédito</td>
                {MONTHS.map((_, idx) => <td key={idx} className="px-3 py-2 text-right border-l border-slate-200">$0</td>)}
              </tr>

              {/* TOTAL INGRESOS */}
              <tr className="bg-blue-100 font-bold border-y border-blue-200">
                <td className="px-4 py-2.5 text-blue-800 sticky left-0 bg-blue-100 border-r border-slate-200 z-10">
                  Total Ingresos
                </td>
                {MONTHS.map((_, idx) => (
                  <td key={idx} className="px-3 py-2.5 text-right border-l border-slate-200 text-blue-800 font-extrabold bg-blue-50/30">
                    ${fmt(totalIngresos[idx])}
                  </td>
                ))}
              </tr>

              {/* TÍTULO SECCIÓN: GASTOS */}
              <tr className="bg-rose-50">
                <td className="px-4 py-2 font-extrabold text-rose-700 sticky left-0 bg-rose-50 border-r border-slate-200 z-10 whitespace-nowrap">
                  GASTOS Y EGRESOS
                </td>
                {MONTHS.map((_, idx) => <td key={idx} className="border-l border-slate-200 bg-rose-50/20"></td>)}
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
                    {MONTHS.map((_, mIdx) => (
                      <td key={mIdx} className="px-3 py-2 text-right border-l border-slate-200">
                        {values[mIdx] > 0 ? `$${fmt(values[mIdx])}` : '$0'}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* TOTAL GASTOS */}
              <tr className="bg-rose-100 font-bold border-y border-rose-200">
                <td className="px-4 py-2.5 text-rose-800 sticky left-0 bg-rose-100 border-r border-slate-200 z-10">
                  Total Gastos
                </td>
                {MONTHS.map((_, idx) => (
                  <td key={idx} className="px-3 py-2.5 text-right border-l border-slate-200 text-rose-800 font-extrabold bg-rose-50/30">
                    ${fmt(totalGastos[idx])}
                  </td>
                ))}
              </tr>

              {/* FLUJO NETO MENSUAL */}
              <tr className="bg-slate-200 font-bold border-y border-slate-350 text-slate-800">
                <td className="px-4 py-2.5 sticky left-0 bg-slate-200 border-r border-slate-300 z-10 text-[10px] uppercase tracking-wider">
                  Flujo Neto Mensual
                </td>
                {MONTHS.map((_, idx) => {
                  const neto = flujoNetoMensual[idx];
                  return (
                    <td 
                      key={idx} 
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
                {MONTHS.map((_, idx) => {
                  const saldoFinal = saldosFinales[idx];
                  return (
                    <td 
                      key={idx} 
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
