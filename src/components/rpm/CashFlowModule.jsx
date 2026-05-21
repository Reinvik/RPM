import React from 'react';
import { DollarSign, Download, Save } from 'lucide-react';
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
    return <div className="p-8 text-slate-600 min-h-screen">Cargando flujo de caja...</div>;
  }

  const fmt = (num) => {
    if (!num || num === 0) return '0';
    return Number(num).toLocaleString('es-CL');
  };

  // Helper para renderizar celdas de valores y totales
  const renderValueCells = (valuesArray) => {
    return MONTHS.map((_, idx) => (
      <td key={idx} className="px-3 py-2 min-w-[100px] text-right border-l border-slate-200 text-slate-700">
        {fmt(valuesArray[idx])}
      </td>
    ));
  };

  const renderTotalCells = (valuesArray, isEconomicFlow = false) => {
    return MONTHS.map((_, idx) => (
      <td 
        key={idx} 
        className={`px-3 py-2 min-w-[100px] text-right border-l border-slate-200 font-bold
          ${isEconomicFlow ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 text-slate-800'}`}
      >
        {fmt(valuesArray[idx])}
      </td>
    ));
  };

  // Calcular totales por mes
  const totalIngresos = Array(12).fill(0).map((_, m) => 
    (yearlyCashflow.ingresos.facturas[m] || 0) + 
    (yearlyCashflow.ingresos.boletas[m] || 0)
  );

  const totalGastos = Array(12).fill(0).map((_, m) => {
    let sum = 0;
    Object.values(yearlyCashflow.gastos).forEach(arr => sum += (arr[m] || 0));
    return sum;
  });

  const flujoCaja = Array(12).fill(0).map((_, m) => totalIngresos[m] - totalGastos[m]);

  const exportToCSV = () => {
    const headers = ['Concepto', ...MONTHS];
    const rows = [];
    
    rows.push(['Saldo Inicial', ...Array(12).fill(0)]);
    rows.push([]);
    rows.push([`Ingresos ${companyName || 'Empresa'}`]);
    rows.push(['Ventas Facturas', ...yearlyCashflow.ingresos.facturas.map(v => Math.round(v))]);
    rows.push(['Ventas Boleta', ...yearlyCashflow.ingresos.boletas.map(v => Math.round(v))]);
    rows.push(['Notas de crédito', ...Array(12).fill(0)]);
    rows.push(['Ventas crédito', ...Array(12).fill(0)]);
    rows.push(['Total Ingresos', ...totalIngresos.map(v => Math.round(v))]);
    rows.push([]);
    rows.push(['Gastos']);
    
    EXPENSE_CATEGORIES.forEach(cat => {
      const values = yearlyCashflow.gastos[cat] || Array(12).fill(0);
      rows.push([cat, ...values.map(v => Math.round(v))]);
    });
    rows.push(['Total Gastos', ...totalGastos.map(v => Math.round(v))]);
    rows.push([]);
    rows.push(['Flujo de caja económico', ...flujoCaja.map(v => Math.round(v))]);
    
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
    <div className="p-8 text-slate-900 min-h-screen font-sans bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
          <DollarSign className="text-emerald-600" size={32} />
          Flujo de Caja {currentYear}
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-200 shadow-sm"
          >
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-4 py-3 min-w-[300px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200 font-bold">
                  CONCEPTO
                </th>
                {MONTHS.map(m => (
                  <th key={m} className="px-3 py-2 min-w-[100px] text-right border-l border-slate-200 font-semibold text-slate-600">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* Saldo Inicial */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2 font-semibold sticky left-0 bg-white border-r border-slate-200 z-10 text-slate-700">
                  Saldo Inicial
                </td>
                {MONTHS.map((_, idx) => <td key={idx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-400">0</td>)}
              </tr>

              {/* Título Ingresos */}
              <tr className="bg-slate-50">
                <td className="px-4 py-2 font-bold text-blue-600 sticky left-0 bg-slate-50 border-r border-slate-200 z-10 whitespace-nowrap">
                  Ingresos {companyName}
                </td>
                {MONTHS.map((_, idx) => <td key={idx} className="bg-slate-50 border-l border-slate-200"></td>)}
              </tr>

              {/* Categorías Ingresos */}
              <tr className="hover:bg-slate-50 transition-colors group bg-white">
                <td className="px-4 py-1.5 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Facturas</td>
                {renderValueCells(yearlyCashflow.ingresos.facturas)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white">
                <td className="px-4 py-1.5 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas Boleta</td>
                {renderValueCells(yearlyCashflow.ingresos.boletas)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white">
                <td className="px-4 py-1.5 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Notas de crédito</td>
                {MONTHS.map((_, idx) => <td key={idx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-400">0</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors group bg-white">
                <td className="px-4 py-1.5 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">Ventas crédito</td>
                {MONTHS.map((_, idx) => <td key={idx} className="px-3 py-2 text-right border-l border-slate-200 text-slate-400">0</td>)}
              </tr>

              {/* Total Ingresos */}
              <tr className="bg-blue-50 border-y border-blue-100">
                <td className="px-4 py-2 font-bold text-blue-700 sticky left-0 bg-blue-50 border-r border-slate-200 z-10">
                  Total Ingresos
                </td>
                {renderTotalCells(totalIngresos)}
              </tr>

              {/* Título Gastos */}
              <tr className="bg-slate-50">
                <td className="px-4 py-2 font-bold text-rose-600 sticky left-0 bg-slate-50 border-r border-slate-200 z-10 whitespace-nowrap">
                  Gastos
                </td>
                {MONTHS.map((_, idx) => <td key={idx} className="bg-slate-50 border-l border-slate-200"></td>)}
              </tr>

              {/* Categorías Gastos */}
              {EXPENSE_CATEGORIES.map((cat, idx) => {
                const values = yearlyCashflow.gastos[cat] || Array(12).fill(0);
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group bg-white">
                    <td className="px-4 py-1.5 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10">
                      {cat}
                    </td>
                    {renderValueCells(values)}
                  </tr>
                );
              })}

              {/* Total Gastos */}
              <tr className="bg-rose-50 border-y border-rose-100">
                <td className="px-4 py-2 font-bold text-rose-700 sticky left-0 bg-rose-50 border-r border-slate-200 z-10">
                  Total gastos
                </td>
                {renderTotalCells(totalGastos)}
              </tr>

              {/* Flujo de caja económico */}
              <tr className="bg-emerald-50 border-y border-emerald-100 text-emerald-700">
                <td className="px-4 py-3 font-bold sticky left-0 bg-emerald-50 border-r border-slate-200 z-10 text-base">
                  Flujo de caja económico
                </td>
                {renderTotalCells(flujoCaja, true)}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
