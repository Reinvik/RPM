import React from 'react';
import { 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt, 
  ShoppingBag, 
  Calendar,
  Layers,
  Wrench,
  Percent
} from 'lucide-react';
import VatCalculatorCard from './VatCalculatorCard';
import { useNexusRPM } from '../../hooks/useNexusRPM';

export default function VatModule() {
  const { data: { salesTotal, expenses, sales }, loading } = useNexusRPM();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-600">Calculando proyección de IVA...</p>
      </div>
    );
  }

  // Filtrar gastos que aplican crédito fiscal (compras con factura)
  const comprasConIva = expenses.filter(e => e.aplica_credito_iva);

  // Gastos brutos afectos a IVA
  const gastosConIvaTotal = comprasConIva.reduce((acc, curr) => acc + Number(curr.monto), 0);

  // Cálculos matemáticos correctos (IVA 19% en Chile extraído del bruto)
  const netoVentas = salesTotal / 1.19;
  const ivaDebitoTotal = salesTotal - netoVentas;

  const netoCompras = gastosConIvaTotal / 1.19;
  const ivaCreditoTotal = gastosConIvaTotal - netoCompras;

  const fmt = (num) => Math.round(num).toLocaleString('es-CL');

  return (
    <div className="space-y-8 text-slate-900">
      
      {/* Resumen Ejecutivo del Mes */}
      <div>
        <VatCalculatorCard 
          salesTotal={salesTotal} 
          gastosConIva={gastosConIvaTotal} 
        />
      </div>

      {/* Split-Screen Detallado de Transacciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: DÉBITO FISCAL (VENTAS) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header Columna */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800">Débito Fiscal (Ventas)</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Transacciones generadoras de IVA débito</p>
                </div>
              </div>
              <span className="bg-blue-50 text-blue-700 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                {sales.length} {sales.length === 1 ? 'Transacción' : 'Transacciones'}
              </span>
            </div>

            {/* Resumen de la Columna */}
            <div className="p-5 bg-gradient-to-br from-blue-50/20 to-indigo-50/10 border-b border-slate-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Ventas</span>
                <span className="text-sm font-extrabold text-slate-800">${fmt(salesTotal)}</span>
              </div>
              <div className="border-x border-slate-200/50">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monto Neto</span>
                <span className="text-sm font-extrabold text-slate-600">${fmt(netoVentas)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-blue-600">IVA Débito</span>
                <span className="text-sm font-extrabold text-blue-600">${fmt(ivaDebitoTotal)}</span>
              </div>
            </div>

            {/* Listado con Scrollbar */}
            <div className="p-5 space-y-3.5 max-h-[420px] overflow-y-auto custom-scrollbar">
              {sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Receipt size={32} className="text-slate-300 mb-2" />
                  <p className="text-xs font-medium italic">No hay ventas registradas en este período.</p>
                </div>
              ) : (
                sales.map(sale => {
                  const neto = sale.total / 1.19;
                  const iva = sale.total - neto;
                  return (
                    <div 
                      key={sale.id} 
                      className="flex justify-between items-center p-3.5 rounded-xl border border-slate-150 bg-slate-50 hover:bg-slate-100/50 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shrink-0">
                          {sale.type === 'Servicio Taller' ? (
                            <Wrench size={15} className="text-indigo-500" />
                          ) : (
                            <Receipt size={15} className="text-blue-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{sale.type}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              {sale.document_type || 'Boleta'}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                              <Calendar size={10} />
                              {new Date(sale.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <p className="text-slate-900 font-extrabold text-sm">${fmt(sale.total)}</p>
                        <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                          IVA (19%): ${fmt(iva)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Percent size={11} className="text-slate-300" />
            <span>El débito se calcula aplicando el 19% a la base neta de boletas y facturas emitidas.</span>
          </div>
        </div>

        {/* COLUMNA DERECHA: CRÉDITO FISCAL (COMPRAS) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header Columna */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ArrowDownRight size={18} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800">Crédito Fiscal (Compras)</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Egresos con factura que descuentan IVA</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                {comprasConIva.length} {comprasConIva.length === 1 ? 'Factura' : 'Facturas'}
              </span>
            </div>

            {/* Resumen de la Columna */}
            <div className="p-5 bg-gradient-to-br from-emerald-50/20 to-teal-50/10 border-b border-slate-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Compras</span>
                <span className="text-sm font-extrabold text-slate-800">${fmt(gastosConIvaTotal)}</span>
              </div>
              <div className="border-x border-slate-200/50">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monto Neto</span>
                <span className="text-sm font-extrabold text-slate-600">${fmt(netoCompras)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-emerald-600">IVA Crédito</span>
                <span className="text-sm font-extrabold text-emerald-600">${fmt(ivaCreditoTotal)}</span>
              </div>
            </div>

            {/* Listado con Scrollbar */}
            <div className="p-5 space-y-3.5 max-h-[420px] overflow-y-auto custom-scrollbar">
              {comprasConIva.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ShoppingBag size={32} className="text-slate-300 mb-2" />
                  <p className="text-xs font-medium italic">No hay compras con factura registradas este mes.</p>
                </div>
              ) : (
                comprasConIva.map(exp => {
                  const neto = exp.monto / 1.19;
                  const iva = exp.monto - neto;
                  return (
                    <div 
                      key={exp.id} 
                      className="flex justify-between items-center p-3.5 rounded-xl border border-slate-150 bg-slate-50 hover:bg-slate-100/50 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shrink-0">
                          <ShoppingBag size={15} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{exp.categoria}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              {exp.tipo === 'Fijo' ? 'Fijo / Recurrente' : 'Variable'}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                              <Calendar size={10} />
                              {new Date(exp.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <p className="text-slate-900 font-extrabold text-sm">${fmt(exp.monto)}</p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                          IVA (19%): ${fmt(iva)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Percent size={11} className="text-slate-300" />
            <span>El crédito corresponde únicamente a egresos del mes marcados con el checkbox "Aplica Crédito IVA".</span>
          </div>
        </div>

      </div>
    </div>
  );
}

