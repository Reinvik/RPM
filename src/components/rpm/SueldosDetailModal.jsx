import React from 'react';
import { X, Users, DollarSign, FileText, CheckCircle, Clock, ShieldAlert, Award } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fmt = (n) => Math.round(n || 0).toLocaleString('es-CL');

export default function SueldosDetailModal({
  isOpen,
  onClose,
  mechanics = [],
  expenses = [],
  selectedMonth,
  selectedYear
}) {
  if (!isOpen) return null;

  // Filtrar gastos de la categoría 'Pago Sueldos' del mes seleccionado
  const sueldosExpenses = (expenses || []).filter(e => {
    if (!e.fecha) return false;
    const isSueldoCategory = e.categoria === 'Pago Sueldos' || (e.categoria && e.categoria.toLowerCase().includes('sueldo'));
    const d = new Date(e.fecha + 'T00:00:00');
    return isSueldoCategory && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Calcular desglose por cada colaborador
  const mechsBreakdown = mechanics.map(m => {
    const sueldoBase = Number(m.sueldo_base || 0);
    const comisionMO = Number(m.mo_generada || 0) * (Number(m.porcentaje_comision_mo || 0) / 100);
    const comisionIns = Number(m.insumos_generados || 0) * (Number(m.porcentaje_comision_insumos || 0) / 100);
    const bonos = Number(m.bonos || 0);

    const haberesBrutos = sueldoBase + comisionMO + comisionIns + bonos;

    const afp = sueldoBase * 0.1145;
    const fonasa = sueldoBase * 0.07;
    const seguroCesantia = sueldoBase * 0.006;
    const descuentosLegales = afp + fonasa + seguroCesantia;

    const prestamos = Number(m.prestamos || 0);
    const descuentosVarios = Number(m.descuentos || 0);
    const totalDescuentos = descuentosLegales + prestamos + descuentosVarios;

    const liquidoAPagar = haberesBrutos - totalDescuentos;

    return {
      ...m,
      sueldoBase,
      comisionMO,
      comisionIns,
      bonos,
      haberesBrutos,
      descuentosLegales,
      prestamos,
      descuentosVarios,
      totalDescuentos,
      liquidoAPagar
    };
  });

  const totalBrutoSueldos = mechsBreakdown.reduce((sum, m) => sum + m.haberesBrutos, 0);
  const totalDescuentosSueldos = mechsBreakdown.reduce((sum, m) => sum + m.totalDescuentos, 0);
  const totalLiquidoSueldos = mechsBreakdown.reduce((sum, m) => sum + m.liquidoAPagar, 0);
  const totalRegistradoEgreso = sueldosExpenses.reduce((sum, e) => sum + Number(e.monto || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative overflow-hidden transition-all max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                Desglose Detallado de Pago de Sueldos
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Período {MONTHS[selectedMonth]} {selectedYear} • Detalle por Colaborador
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* Tarjetas de Resumen KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Total Bruto (Egreso Real de la Estructura) */}
            <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/30 border border-blue-100 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Monto Bruto de Egreso</span>
                <span className="text-[9px] font-bold bg-blue-100/80 text-blue-700 px-2 py-0.5 rounded-full">Haberes Totales</span>
              </div>
              <p className="text-2xl font-black text-slate-900">${fmt(totalBrutoSueldos)}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-2">
                Sueldos Base + Comisiones MO/Insumos + Bonos.
              </p>
            </div>

            {/* Total Descuentos */}
            <div className="bg-gradient-to-br from-rose-50/70 to-orange-50/30 border border-rose-100 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">Descuentos & Cotizaciones</span>
                <span className="text-[9px] font-bold bg-rose-100/80 text-rose-700 px-2 py-0.5 rounded-full">Leyes / Varios</span>
              </div>
              <p className="text-2xl font-black text-rose-600">-${fmt(totalDescuentosSueldos)}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-2">
                Cotizaciones previsionales (AFP/FONASA) y préstamos.
              </p>
            </div>

            {/* Total Líquido a Pagar */}
            <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Líquido A Pagar</span>
                <span className="text-[9px] font-bold bg-emerald-100/80 text-emerald-700 px-2 py-0.5 rounded-full">A Bolsillo</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">${fmt(totalLiquidoSueldos)}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-2">
                Total neto pagado a los colaboradores.
              </p>
            </div>

          </div>

          {/* Tabla de Colaboradores (A quién pertenece cada sueldo) */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                Detalle por Persona ({mechsBreakdown.length} colaboradores activos)
              </h4>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {mechsBreakdown.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No hay colaboradores registrados para este período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-200">
                        <th className="py-3 px-4">Colaborador / RUT</th>
                        <th className="py-3 px-3">Cargo</th>
                        <th className="py-3 px-3 text-right">Sueldo Base</th>
                        <th className="py-3 px-3 text-right">Comisiones</th>
                        <th className="py-3 px-3 text-right">Bonos</th>
                        <th className="py-3 px-3 text-right text-blue-700 bg-blue-50/50">Monto Bruto</th>
                        <th className="py-3 px-3 text-right text-rose-600">Descuentos</th>
                        <th className="py-3 px-4 text-right text-emerald-700 bg-emerald-50/50">Líquido A Pagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-750 font-semibold">
                      {mechsBreakdown.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          
                          {/* Nombre y RUT */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 text-xs">{m.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{m.rut || 'Sin RUT'}</div>
                          </td>

                          {/* Cargo */}
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {m.cargo || 'Mecánico'}
                            </span>
                          </td>

                          {/* Sueldo Base */}
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            ${fmt(m.sueldoBase)}
                          </td>

                          {/* Comisiones MO + Insumos */}
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            ${fmt(m.comisionMO + m.comisionIns)}
                          </td>

                          {/* Bonos */}
                          <td className="py-3 px-3 text-right font-medium text-emerald-600">
                            {m.bonos > 0 ? `+$${fmt(m.bonos)}` : '$0'}
                          </td>

                          {/* Monto Bruto de Egreso */}
                          <td className="py-3 px-3 text-right font-black text-blue-700 bg-blue-50/30 text-sm">
                            ${fmt(m.haberesBrutos)}
                          </td>

                          {/* Descuentos */}
                          <td className="py-3 px-3 text-right font-bold text-rose-600">
                            -${fmt(m.totalDescuentos)}
                          </td>

                          {/* Líquido a Pagar */}
                          <td className="py-3 px-4 text-right font-black text-emerald-600 bg-emerald-50/30 text-sm">
                            ${fmt(m.liquidoAPagar)}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Registros de Egresos Contables en Supabase ('Pago Sueldos') */}
          {sueldosExpenses.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  Registros Contables Aprobados ({sueldosExpenses.length} comprobantes en Egresos)
                </h4>
                <span className="text-xs font-black text-slate-800">
                  Total Registrado: ${fmt(totalRegistradoEgreso)}
                </span>
              </div>

              <div className="space-y-2">
                {sueldosExpenses.map((exp, idx) => (
                  <div key={exp.id || idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <CheckCircle size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">
                          {exp.descripcion || 'Pago de Sueldo'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Fecha: {exp.fecha} • Tipo: {exp.tipo || 'Fijo'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-rose-600 text-sm">${fmt(exp.monto)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
