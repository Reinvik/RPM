import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Receipt,
  ShoppingBag,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';

const fmt = (num) => Math.round(Number(num) || 0).toLocaleString('es-CL');

export default function DailyClosureTab({ expenseDetails: propExpenseDetails }) {
  const { data: { sales, allExpenses }, loading } = useNexusRPM();
  const { companyId, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useNexusContext();

  // Fecha seleccionada (por defecto la fecha actual de hoy en YYYY-MM-DD local)
  const todayStr = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }, []);

  const [selectedDailyDate, setSelectedDailyDate] = useState(todayStr);

  // Cargar metadatos de egresos (detalles de facturas, estado de pago y fecha de pago real)
  const activeExpenseDetails = useMemo(() => {
    if (propExpenseDetails && Object.keys(propExpenseDetails).length > 0) {
      return propExpenseDetails;
    }
    if (!companyId) return {};
    const detailsKey = `nexus_rpm_expense_details_${companyId}`;
    try {
      return JSON.parse(localStorage.getItem(detailsKey) || '{}');
    } catch (err) {
      console.error("Error al cargar detalles de egresos:", err);
      return {};
    }
  }, [propExpenseDetails, companyId]);

  // Manejar cambio de fecha y sincronizar con el mes/año del contexto si es necesario
  const handleDateChange = (newDateStr) => {
    if (!newDateStr) return;
    setSelectedDailyDate(newDateStr);

    const [yr, mo] = newDateStr.split('-').map(Number);
    if (!isNaN(yr) && !isNaN(mo)) {
      const targetMonthIndex = mo - 1;
      if (targetMonthIndex !== selectedMonth) {
        setSelectedMonth(targetMonthIndex);
      }
      if (yr !== selectedYear) {
        setSelectedYear(yr);
      }
    }
  };

  // Navegación día anterior / posterior
  const handleStepDay = (deltaDays) => {
    const [yr, mo, da] = selectedDailyDate.split('-').map(Number);
    const currentDate = new Date(yr, mo - 1, da);
    currentDate.setDate(currentDate.getDate() + deltaDays);

    const nextYr = currentDate.getFullYear();
    const nextMo = String(currentDate.getMonth() + 1).padStart(2, '0');
    const nextDa = String(currentDate.getDate()).padStart(2, '0');
    const nextDateStr = `${nextYr}-${nextMo}-${nextDa}`;
    
    handleDateChange(nextDateStr);
  };

  // 1. Ingresos del día seleccionado
  const daySales = useMemo(() => {
    return (sales || []).filter(s => s.fecha === selectedDailyDate);
  }, [sales, selectedDailyDate]);

  const totalDaySales = useMemo(() => {
    return daySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, [daySales]);

  // Desglose de ingresos por tipo
  const posSalesDay = useMemo(() => daySales.filter(s => s.type === 'Sala de Ventas' || s.type === 'Abono'), [daySales]);
  const tallerSalesDay = useMemo(() => daySales.filter(s => s.type === 'Servicio Taller'), [daySales]);
  const totalPosDay = useMemo(() => posSalesDay.reduce((sum, s) => sum + Number(s.total || 0), 0), [posSalesDay]);
  const totalTallerDay = useMemo(() => tallerSalesDay.reduce((sum, s) => sum + Number(s.total || 0), 0), [tallerSalesDay]);

  // 2. Egresos del día seleccionado
  // Incluye:
  // - Egresos pagados cuya fecha de pago real es el día seleccionado (ej: marcados como pagados hoy)
  // - Egresos cuyo registro fue creado en el día seleccionado
  // - Egresos pendientes cuya fecha de vencimiento cae en el día seleccionado
  const dayExpenses = useMemo(() => {
    return (allExpenses || []).filter(e => {
      if (e.isVirtualSueldos) return false;

      const detail = activeExpenseDetails[e.id];
      const estado = detail?.estadoPago || 'Pagado';
      const fechaPagoReal = detail?.fechaPagoReal || (estado === 'Pagado' ? e.fecha : null);
      const fechaVencimiento = detail?.fechaVencimiento || e.fecha;

      const cleanRegFecha = e.fecha ? String(e.fecha).split('T')[0] : null;
      const cleanPagoFecha = fechaPagoReal ? String(fechaPagoReal).split('T')[0] : null;
      const cleanVencFecha = fechaVencimiento ? String(fechaVencimiento).split('T')[0] : null;

      const fuePagadoHoy = estado === 'Pagado' && cleanPagoFecha === selectedDailyDate;
      const fueRegistradoHoy = cleanRegFecha === selectedDailyDate;
      const venceHoy = estado === 'Pendiente' && cleanVencFecha === selectedDailyDate;

      return fuePagadoHoy || fueRegistradoHoy || venceHoy;
    }).map(e => {
      const detail = activeExpenseDetails[e.id];
      const estado = detail?.estadoPago || 'Pagado';
      const fechaPagoReal = detail?.fechaPagoReal || (estado === 'Pagado' ? e.fecha : null);
      const numeroFactura = detail?.numeroFactura || null;
      return {
        ...e,
        estadoPago: estado,
        fechaPagoReal,
        numeroFactura
      };
    });
  }, [allExpenses, activeExpenseDetails, selectedDailyDate]);

  const totalDayExpenses = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + Number(e.monto || 0), 0);
  }, [dayExpenses]);

  // Balance Neto Diario
  const dayNetBalance = totalDaySales - totalDayExpenses;

  // Formato bonito de fecha para encabezado
  const formattedDateTitle = useMemo(() => {
    const [yr, mo, da] = selectedDailyDate.split('-').map(Number);
    const d = new Date(yr, mo - 1, da);
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDailyDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="font-semibold text-xs animate-pulse">Cargando cierre diario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      
      {/* ── Control Bar de Fecha ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 capitalize flex items-center gap-2">
            <Clock className="text-blue-600 shrink-0" size={20} />
            Cierre Diario de Caja
          </h2>
          <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">
            {formattedDateTitle}
          </p>
        </div>

        {/* Controles de selección de fecha */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => handleStepDay(-1)}
            className="p-2 hover:bg-white hover:shadow-xs rounded-lg text-slate-600 transition-all active:scale-95 cursor-pointer"
            title="Día anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDailyDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleStepDay(1)}
            className="p-2 hover:bg-white hover:shadow-xs rounded-lg text-slate-600 transition-all active:scale-95 cursor-pointer"
            title="Día siguiente"
          >
            <ChevronRight size={18} />
          </button>

          {selectedDailyDate !== todayStr && (
            <button
              onClick={() => handleDateChange(todayStr)}
              className="ml-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Ir a Hoy
            </button>
          )}
        </div>
      </div>

      {/* ── 3 Tarjetas KPI del Cierre ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Ingresos del Día */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Ingresos del Día</span>
              <span className="text-xs text-slate-400 font-semibold">{daySales.length} transacciones registradas</span>
            </div>
            <span className="p-2 bg-emerald-50 rounded-xl">
              <ArrowUpRight className="text-emerald-600" size={18} />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">${fmt(totalDaySales)}</div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] font-bold">
            <div>
              <span className="text-slate-400 block uppercase">POS / Sala</span>
              <span className="text-emerald-700 font-black">${fmt(totalPosDay)}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">Taller</span>
              <span className="text-blue-700 font-black">${fmt(totalTallerDay)}</span>
            </div>
          </div>
        </div>

        {/* Total Egresos del Día */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-pink-500"></div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Egresos y Compras del Día</span>
              <span className="text-xs text-slate-400 font-semibold">{dayExpenses.length} compras / egresos</span>
            </div>
            <span className="p-2 bg-rose-50 rounded-xl">
              <ArrowDownRight className="text-rose-600" size={18} />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">${fmt(totalDayExpenses)}</div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
            Suma de facturas y egresos pagados o ingresados en esta fecha.
          </div>
        </div>

        {/* Balance Neto del Día */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow ${
          dayNetBalance >= 0 ? 'bg-emerald-50/30 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
        }`}>
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
            dayNetBalance >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'
          }`}></div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block">Resultado Neto Diario</span>
              <span className="text-xs text-slate-500 font-semibold">Ingresos - Egresos</span>
            </div>
            <span className={`p-2 rounded-xl ${dayNetBalance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {dayNetBalance >= 0 ? <TrendingUp className="text-emerald-600" size={18} /> : <TrendingDown className="text-rose-600" size={18} />}
            </span>
          </div>
          <div className={`text-3xl font-black tracking-tight ${dayNetBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {dayNetBalance >= 0 ? '+' : ''}${fmt(dayNetBalance)}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[10px] font-bold text-slate-600">
            {dayNetBalance >= 0 ? '✓ Cobertura diaria en positivo (Superávit).' : '⚠️ Egresos superan los ingresos del día.'}
          </div>
        </div>

      </div>

      {/* ── Desglose Detallado en 2 Columnas (Ingresos vs Egresos) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Columna Izquierda: Ingresos del Día */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-600" />
              Ingresos del Día (${fmt(totalDaySales)})
            </h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              {daySales.length} entradas
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {daySales.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold space-y-1">
                <Receipt className="mx-auto text-slate-300 mb-2" size={32} />
                <p>No se registraron ventas ni cobros en esta fecha.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-150 text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Documento</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                  {daySales.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          s.type === 'Servicio Taller' 
                            ? 'bg-blue-50 text-blue-750 border border-blue-150' 
                            : s.type === 'Abono'
                              ? 'bg-amber-50 text-amber-750 border border-amber-150'
                              : 'bg-emerald-50 text-emerald-750 border border-emerald-150'
                        }`}>
                          {s.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{s.document_type || 'Boleta'}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-black text-slate-900 block">${fmt(s.total)}</span>
                        {s.abono_deducted > 0 && (
                          <span className="text-[9px] text-blue-600 block font-bold">
                            (Bruto: ${fmt(s.original_cost)} - ${fmt(s.abono_deducted)} abono)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Columna Derecha: Egresos del Día */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <ArrowDownRight size={16} className="text-rose-600" />
              Egresos y Compras del Día (${fmt(totalDayExpenses)})
            </h3>
            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
              {dayExpenses.length} registros
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {dayExpenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold space-y-1">
                <ShoppingBag className="mx-auto text-slate-300 mb-2" size={32} />
                <p>No se registraron egresos ni compras en esta fecha.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-150 text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3">Categoría / Concepto</th>
                    <th className="py-2.5 px-3">Estado / Tipo</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                  {dayExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 block">{exp.categoria}</span>
                          {exp.numeroFactura && (
                            <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              Fact. {exp.numeroFactura}
                            </span>
                          )}
                        </div>
                        {exp.descripcion && (
                          <span className="text-[10px] text-slate-400 font-normal block">{exp.descripcion}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold inline-block ${
                          exp.estadoPago === 'Pagado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {exp.estadoPago || 'Pagado'} ({exp.tipo || 'Variable'})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">${fmt(exp.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
