import React from 'react';
import { Calculator, ArrowUpRight, ArrowDownRight, Percent, Info } from 'lucide-react';

export default function VatCalculatorCard({ salesTotal, gastosConIva }) {
  // En Chile las ventas (boletas/facturas) y los egresos (gastos con factura) se ingresan como montos BRUTOS.
  // El cálculo correcto de IVA (19%) extrae el Neto dividiendo por 1.19, y luego calcula el 19% del Neto.
  const netoVentas = salesTotal / 1.19;
  const ivaDebito = salesTotal - netoVentas;

  const netoGastos = gastosConIva / 1.19;
  const ivaCredito = gastosConIva - netoGastos;

  const ivaDiferencia = ivaDebito - ivaCredito;
  const esRemanente = ivaDiferencia < 0;

  const fmt = (num) => Math.round(num).toLocaleString('es-CL');

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calculator size={20} className="text-indigo-600 animate-pulse" />
          Proyección de IVA Mensual
        </h3>
        <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
          <Percent size={10} className="text-indigo-500" /> IVA Chile 19%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        
        {/* IVA DÉBITO (VENTAS) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:bg-slate-100 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Débito Fiscal</span>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Total Ventas (Bruto):</span>
              <span>${fmt(salesTotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Monto Neto (Base):</span>
              <span>${fmt(netoVentas)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-800 text-sm">
              <span>IVA Débito (19%):</span>
              <span className="text-blue-600">${fmt(ivaDebito)}</span>
            </div>
          </div>
        </div>

        {/* IVA CRÉDITO (COMPRAS) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:bg-slate-100 hover:shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Crédito Fiscal</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownRight size={14} />
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Compras c/ Factura (Bruto):</span>
              <span>${fmt(gastosConIva)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Monto Neto (Base):</span>
              <span>${fmt(netoGastos)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-800 text-sm">
              <span>IVA Crédito (19%):</span>
              <span className="text-emerald-600">${fmt(ivaCredito)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* RESULTADO FINAL */}
      <div className={`rounded-xl p-4 border transition-all duration-300 ${
        esRemanente 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
          : 'bg-rose-50 border-rose-200 text-rose-950'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                {esRemanente ? 'Remanente de Crédito Fiscal' : 'IVA Estimado a Pago'}
              </span>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                esRemanente ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {esRemanente ? 'A Favor' : 'Por Pagar'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {esRemanente 
                ? 'El crédito de tus compras superó al débito de tus ventas. Se acumula para el mes siguiente.' 
                : 'El débito de tus ventas superó al crédito de tus compras con factura.'}
            </p>
          </div>
          <div className="text-right font-extrabold">
            <span className={`text-2xl ${esRemanente ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${fmt(Math.abs(ivaDiferencia))}
            </span>
          </div>
        </div>
      </div>

      {/* NOTA DE AYUDA */}
      <div className="mt-4 flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 leading-normal">
        <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Cálculo Fiscal F-29:</strong> El IVA se extrae de los montos totales (brutos) dividiendo por 1.19 para obtener la base neta. El 19% se calcula sobre el neto. Las ventas sin boleta/factura o gastos sin checkbox de IVA no generan crédito ni débito fiscal.
        </p>
      </div>
    </div>
  );
}
