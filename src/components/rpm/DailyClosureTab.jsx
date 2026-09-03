import React, { useState, useMemo } from 'react';
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
  Clock,
  Banknote,
  CreditCard,
  Building,
  PlusCircle,
  X,
  Trash2,
  Wallet,
  Coins,
  ArrowRightLeft
} from 'lucide-react';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';

const fmt = (num) => Math.round(Number(num) || 0).toLocaleString('es-CL');

export default function DailyClosureTab({ expenseDetails: propExpenseDetails }) {
  const { data: { sales, allExpenses }, loading, addIncome, deleteIncome } = useNexusRPM();
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

  // Estados del Modal de Agregar Dinero a Caja / Inyección
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [incomeConcepto, setIncomeConcepto] = useState('Apertura de Caja / Fondo Inicial');
  const [incomeMonto, setIncomeMonto] = useState('');
  const [incomeMetodo, setIncomeMetodo] = useState('Efectivo');
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeDoc, setIncomeDoc] = useState('');
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState(null);

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

  // Desglose de ingresos por Método de Pago (Efectivo, Transferencia, Tarjeta/POS)
  const paymentBreakdown = useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;
    let tarjeta = 0;

    daySales.forEach(s => {
      const hasSplit = (s.cash_amount > 0 || s.card_amount > 0 || s.transfer_amount > 0);
      if (hasSplit) {
        efectivo += Number(s.cash_amount || 0);
        tarjeta += Number(s.card_amount || 0);
        transferencia += Number(s.transfer_amount || 0);
      } else {
        const total = Number(s.total || 0);
        const method = (s.payment_method || '').toLowerCase();
        if (method.includes('efectivo') || method.includes('cash')) {
          efectivo += total;
        } else if (method.includes('transfer')) {
          transferencia += total;
        } else if (method.includes('tarjeta') || method.includes('pos') || method.includes('debito') || method.includes('credito')) {
          tarjeta += total;
        } else {
          // Default si no especifica: Efectivo
          efectivo += total;
        }
      }
    });

    return { efectivo, transferencia, tarjeta };
  }, [daySales]);

  // Desglose de ingresos por tipo de origen
  const posSalesDay = useMemo(() => daySales.filter(s => s.type === 'Sala de Ventas' || s.type === 'Abono'), [daySales]);
  const tallerSalesDay = useMemo(() => daySales.filter(s => s.type === 'Servicio Taller'), [daySales]);
  const manualIncomesDay = useMemo(() => daySales.filter(s => s.isManualIncome), [daySales]);

  const totalPosDay = useMemo(() => posSalesDay.reduce((sum, s) => sum + Number(s.total || 0), 0), [posSalesDay]);
  const totalTallerDay = useMemo(() => tallerSalesDay.reduce((sum, s) => sum + Number(s.total || 0), 0), [tallerSalesDay]);
  const totalManualIncomesDay = useMemo(() => manualIncomesDay.reduce((sum, s) => sum + Number(s.total || 0), 0), [manualIncomesDay]);

  // 2. Egresos del día seleccionado
  // Incluye:
  // - Egresos pagados cuya fecha de pago real es el día seleccionado
  // - Egresos cuyo registro fue creado en el día seleccionado
  // - Egresos pendientes cuya fecha de vencimiento cae en el día seleccionado
  const dayExpenses = useMemo(() => {
    return (allExpenses || []).filter(e => {
      if (e.isVirtualSueldos) return false;

      const detail = activeExpenseDetails[e.id];
      const estado = e.estado || detail?.estadoPago || 'Pagado';
      const fechaPagoReal = e.fecha_pago_real || detail?.fechaPagoReal || (estado === 'Pagado' ? e.fecha : null);
      const fechaVencimiento = e.fecha_vencimiento || detail?.fechaVencimiento || e.fecha;

      const cleanRegFecha = e.fecha ? String(e.fecha).split('T')[0] : null;
      const cleanPagoFecha = fechaPagoReal ? String(fechaPagoReal).split('T')[0] : null;
      const cleanVencFecha = fechaVencimiento ? String(fechaVencimiento).split('T')[0] : null;

      const fuePagadoHoy = estado === 'Pagado' && cleanPagoFecha === selectedDailyDate;
      const fueRegistradoHoy = cleanRegFecha === selectedDailyDate;
      const venceHoy = estado === 'Pendiente' && cleanVencFecha === selectedDailyDate;

      return fuePagadoHoy || fueRegistradoHoy || venceHoy;
    }).map(e => {
      const detail = activeExpenseDetails[e.id];
      const estado = e.estado || detail?.estadoPago || 'Pagado';
      const fechaPagoReal = e.fecha_pago_real || detail?.fechaPagoReal || (estado === 'Pagado' ? e.fecha : null);
      const numeroFactura = e.numero_factura || detail?.numeroFactura || null;
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

  // Handler para agregar dinero manual / inyección de caja
  const handleSaveIncome = async (e) => {
    e.preventDefault();
    if (!incomeMonto || Number(incomeMonto) <= 0) {
      alert("Por favor ingresa un monto válido.");
      return;
    }

    setIsSubmittingIncome(true);
    try {
      const result = await addIncome({
        tipo: 'Ingreso',
        categoria: incomeConcepto.trim() || 'Inyección de Caja',
        monto: Number(incomeMonto),
        fecha: selectedDailyDate,
        metodo_pago: incomeMetodo,
        numero_documento: incomeDoc.trim() || null,
        descripcion: incomeDesc.trim() || null,
        estado: 'Completado'
      });

      if (result.error) {
        alert("Error al agregar ingreso: " + (result.error.message || result.error));
      } else {
        setShowAddMoneyModal(false);
        setIncomeMonto('');
        setIncomeDesc('');
        setIncomeDoc('');
      }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al agregar el ingreso.");
    } finally {
      setIsSubmittingIncome(false);
    }
  };

  // Handler para eliminar un ingreso manual
  const handleDeleteIncome = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este ingreso manual de la caja?")) return;
    setDeletingIncomeId(id);
    try {
      const result = await deleteIncome(id);
      if (result.error) {
        alert("Error al eliminar ingreso: " + (result.error.message || result.error));
      }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al eliminar ingreso.");
    } finally {
      setDeletingIncomeId(null);
    }
  };

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
      
      {/* ── Control Bar de Fecha y Botón de Inyección ── */}
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón Destacado: Agregar Dinero / Inyección de Caja */}
          <button
            onClick={() => setShowAddMoneyModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Agregar Dinero / Inyección a Caja</span>
          </button>

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
      </div>

      {/* ── Desglose de Métodos de Pago (Efectivo / Transferencia / Tarjeta) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Efectivo */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Banknote size={22} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-emerald-800 block tracking-wider">
                Efectivo en Caja
              </span>
              <span className="text-2xl font-black text-emerald-950 block">
                ${fmt(paymentBreakdown.efectivo)}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg">
            Billetes / Monedas
          </span>
        </div>

        {/* 2. Transferencia */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-4 rounded-2xl border border-blue-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
              <Building size={22} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-blue-800 block tracking-wider">
                Transferencias Bancarias
              </span>
              <span className="text-2xl font-black text-blue-950 block">
                ${fmt(paymentBreakdown.transferencia)}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">
            Cuenta Banco
          </span>
        </div>

        {/* 3. Tarjeta / POS */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white p-4 rounded-2xl border border-purple-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-xs">
              <CreditCard size={22} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-purple-800 block tracking-wider">
                Tarjeta / POS
              </span>
              <span className="text-2xl font-black text-purple-950 block">
                ${fmt(paymentBreakdown.tarjeta)}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-1 rounded-lg">
            Débito / Crédito
          </span>
        </div>

      </div>

      {/* ── 3 Tarjetas KPI del Cierre ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Ingresos del Día */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Ingresos Totales del Día</span>
              <span className="text-xs text-slate-400 font-semibold">{daySales.length} transacciones registradas</span>
            </div>
            <span className="p-2 bg-emerald-50 rounded-xl">
              <ArrowUpRight className="text-emerald-600" size={18} />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">${fmt(totalDaySales)}</div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[10px] font-bold">
            <div>
              <span className="text-slate-400 block uppercase">POS / Sala</span>
              <span className="text-emerald-700 font-black">${fmt(totalPosDay)}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">Taller</span>
              <span className="text-blue-700 font-black">${fmt(totalTallerDay)}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">Inyección/Manual</span>
              <span className="text-purple-700 font-black">${fmt(totalManualIncomesDay)}</span>
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

        {/* Columna Izquierda: Ingresos del Día con Método de Pago */}
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
                    <th className="py-2.5 px-3">Tipo / Origen</th>
                    <th className="py-2.5 px-3">Método de Pago</th>
                    <th className="py-2.5 px-3">Documento</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                  {daySales.map((s, idx) => {
                    const method = (s.payment_method || 'Efectivo').toLowerCase();
                    const isCash = method.includes('efectivo') || method.includes('cash');
                    const isCard = method.includes('tarjeta') || method.includes('pos') || method.includes('debito') || method.includes('credito');
                    const isTransfer = method.includes('transfer');

                    return (
                      <tr key={s.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              s.isManualIncome
                                ? 'bg-purple-50 text-purple-750 border border-purple-200'
                                : s.type === 'Servicio Taller' 
                                  ? 'bg-blue-50 text-blue-750 border border-blue-150' 
                                  : s.type === 'Abono'
                                    ? 'bg-amber-50 text-amber-750 border border-amber-150'
                                    : 'bg-emerald-50 text-emerald-750 border border-emerald-150'
                            }`}>
                              {s.type}
                            </span>
                            {s.patente && (
                              <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                {s.patente}
                              </span>
                            )}
                          </div>
                          {s.notes && (
                            <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{s.notes}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black inline-flex items-center gap-1 ${
                            isCash
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isCard
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : isTransfer
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {isCash && <Banknote size={11} />}
                            {isCard && <CreditCard size={11} />}
                            {isTransfer && <Building size={11} />}
                            {s.payment_method || 'Efectivo'}
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
                        <td className="py-3 px-2 text-center">
                          {s.isManualIncome && (
                            <button
                              onClick={() => handleDeleteIncome(s.id)}
                              disabled={deletingIncomeId === s.id}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar ingreso manual"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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

      {/* ── MODAL: Agregar Dinero / Inyección de Caja ── */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            
            {/* Header Modal */}
            <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Wallet size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Agregar Dinero a Caja</h3>
                  <p className="text-xs text-slate-400 font-medium">Inyección de efectivo, fondo inicial o ingreso manual</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMoneyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario Modal */}
            <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
              
              {/* Presets Rápidos de Concepto */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Concepto / Motivo</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    'Apertura de Caja / Fondo Inicial',
                    'Inyección de Efectivo',
                    'Aporte de Capital',
                    'Venta Directa Extra'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setIncomeConcepto(preset)}
                      className={`text-[11px] font-bold p-2 rounded-xl border text-left transition-all ${
                        incomeConcepto === preset
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={incomeConcepto}
                  onChange={(e) => setIncomeConcepto(e.target.value)}
                  placeholder="O escribe otro concepto..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Monto ($) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Monto ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={incomeMonto}
                    onChange={(e) => setIncomeMonto(e.target.value)}
                    placeholder="Ej: 50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 text-slate-900 text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Método de Ingreso</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Efectivo', icon: Banknote, label: 'Efectivo' },
                    { id: 'Transferencia', icon: Building, label: 'Transferencia' },
                    { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta / POS' }
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setIncomeMetodo(m.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-black gap-1.5 transition-all cursor-pointer ${
                          incomeMetodo === m.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* N° Comprobante / Documento y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">N° Documento (Opcional)</label>
                  <input
                    type="text"
                    value={incomeDoc}
                    onChange={(e) => setIncomeDoc(e.target.value)}
                    placeholder="Ej: Comp-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha del Ingreso</label>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Descripción / Observación (Opcional)</label>
                <textarea
                  value={incomeDesc}
                  onChange={(e) => setIncomeDesc(e.target.value)}
                  placeholder="Ej: Fondo para cambio de billetes al iniciar el turno"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddMoneyModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIncome}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingIncome ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>Guardar e Ingresar a Caja</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
