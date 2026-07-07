import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  ShieldCheck,
  DollarSign,
  BarChart3,
  AlertCircle,
  ChevronRight,
  X
} from 'lucide-react';
import { useNexusContext } from '../../context/NexusContext';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import MechanicSettlement from './MechanicSettlement';


const fmt = (num) => {
  if (!num && num !== 0) return '0';
  return Math.round(num).toLocaleString('es-CL');
};

// ──────────────────────────────────────────────
// Motor de insights del Asesor Financiero
// ──────────────────────────────────────────────
function buildInsights({ salesTotal, opexTotal, resultado, margenPct,
  ivaAPagar, expenses, mechanics }) {
  const insights = [];

  // 1. Rentabilidad operativa
  if (resultado > 0 && margenPct >= 20) {
    insights.push({
      id: 'profit_healthy',
      color: 'emerald',
      icon: CheckCircle,
      title: 'Rentabilidad Operativa Saludable',
      body: `¡Felicidades! Estás operando con saldo a favor este mes. Tu margen neto es del ${margenPct.toFixed(1)}%, generando una ganancia de $${fmt(resultado)}.`,
      rec: 'Buen momento para destinar un porcentaje del flujo neto a un fondo de reserva para contingencias o inversión en herramientas.'
    });
  } else if (resultado < 0) {
    insights.push({
      id: 'profit_loss',
      color: 'rose',
      icon: AlertTriangle,
      title: 'Resultado Negativo del Período',
      body: `Tus gastos superan los ingresos en $${fmt(Math.abs(resultado))} este mes. El margen operativo es de ${margenPct.toFixed(1)}%.`,
      rec: 'Revisa los egresos variables del período. Identifica gastos no esenciales que puedan diferirse o eliminarse.'
    });
  } else {
    insights.push({
      id: 'profit_marginal',
      color: 'amber',
      icon: AlertCircle,
      title: 'Margen Bajo — Zona de Alerta',
      body: `Tu margen operativo es del ${margenPct.toFixed(1)}%, lo que deja poco margen de seguridad ante imprevistos.`,
      rec: 'Evalúa aumentar precios un 5–10% en servicios de mayor rotación o reducir costos variables del galpón.'
    });
  }

  // 2. Facturas vencidas
  const today = new Date();
  today.setHours(0,0,0,0);
  const facturasPendientes = expenses.filter(e =>
    e.es_factura_proveedor && e.estado_pago !== 'Pagado' && e.fecha_vencimiento
  );
  const vencidas = facturasPendientes.filter(e => new Date(e.fecha_vencimiento) < today);
  if (vencidas.length > 0) {
    const totalVencido = vencidas.reduce((s, e) => s + Number(e.monto || 0), 0);
    insights.push({
      id: 'overdue',
      color: 'amber',
      icon: Clock,
      title: 'Facturas Vencidas a Pago',
      body: `Tienes $${fmt(totalVencido)} en cuentas por pagar ya vencidas (${vencidas.length} factura${vencidas.length > 1 ? 's' : ''}). Esto podría afectar tu reputación comercial con proveedores estratégicos.`,
      rec: 'Revisa el módulo de Egresos y Facturas y utiliza el generador de cuotas para pactar pagos parciales sin tensiones de liquidez.'
    });
  }

  // 3. Próximos vencimientos (7 días)
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const proximas = facturasPendientes.filter(e => {
    const venc = new Date(e.fecha_vencimiento);
    return venc >= today && venc <= in7;
  });
  if (proximas.length > 0) {
    const totalProx = proximas.reduce((s, e) => s + Number(e.monto || 0), 0);
    insights.push({
      id: 'upcoming',
      color: 'amber',
      icon: Clock,
      title: 'Compromisos de Pago Próximos',
      body: `Tienes $${fmt(totalProx)} en facturas que vencen en los próximos 7 días (${proximas.length} documento${proximas.length > 1 ? 's' : ''}). Asegúrate de tener liquidez disponible.`,
      rec: 'Programa los pagos con anticipación para evitar recargos por mora y mantener el flujo de crédito con tus distribuidores.'
    });
  }

  // 4. IVA a pago alto
  if (ivaAPagar > 0 && ivaAPagar > salesTotal * 0.1) {
    insights.push({
      id: 'iva_strategy',
      color: 'blue',
      icon: ShieldCheck,
      title: 'Estrategia de Optimización de IVA',
      body: `El IVA estimado a pago este mes es $${fmt(ivaAPagar)}. Asegúrate de tener ese monto separado en cuenta bancaria antes del día 20.`,
      rec: 'Provisionando el IVA mensualmente evitarás el descalce de caja que afecta a la mayoría de las pymes al acercarse el plazo del F-29.'
    });
  } else if (ivaAPagar <= 0) {
    insights.push({
      id: 'iva_credit',
      color: 'emerald',
      icon: ShieldCheck,
      title: 'Remanente de Crédito Fiscal Acumulado',
      body: `Este mes tus compras con factura generaron más IVA Crédito que el IVA Débito de tus ventas, resultando en remanente a favor ($${fmt(Math.abs(ivaAPagar))}).`,
      rec: 'Este remanente se arrastra al mes siguiente y puede reducir significativamente tu obligación tributaria futura.'
    });
  }

  // 5. Sin ventas registradas
  if (salesTotal === 0) {
    insights.push({
      id: 'no_sales',
      color: 'slate',
      icon: Info,
      title: 'Sin Ingresos Registrados Este Período',
      body: 'No se han encontrado ventas registradas en el módulo POS ni en tickets de taller cerrados para el período seleccionado.',
      rec: 'Verifica que los tickets estén en estado "Entregado" o "Finalizado" y que las ventas del POS estén registradas con la fecha correcta.'
    });
  }

  return insights;
}

// ──────────────────────────────────────────────
// Componente Principal
// ──────────────────────────────────────────────
export default function NexusRPMDashboard() {
  const {
    companyName, selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear
  } = useNexusContext();

  const { data, loading, refetchData } = useNexusRPM();
  const [showMechanics, setShowMechanics] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeFilter, setIncomeFilter] = useState('all'); // 'all' | 'taller' | 'pos'

  // ── Desestructurar data (siempre, sin condicional) ──
  const { salesTotal, fixedCosts, variableCosts, expenses, mechanics, sales } = data;

  // ── Cálculos de IVA ──
  const gastosConIva = expenses
    .filter(e => e.aplica_credito_iva)
    .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

  const netoVentas   = salesTotal / 1.19;
  const ivaDebito    = salesTotal - netoVentas;
  const netoGastos   = gastosConIva / 1.19;
  const ivaCredito   = gastosConIva - netoGastos;
  const ivaDif       = ivaDebito - ivaCredito;
  const esRemanente  = ivaDif < 0;

  // Helper para identificar si una categoría es de repuestos/insumos directos
  const isRepuestoCategory = (categoryName) => {
    if (!categoryName) return false;
    const name = categoryName.toLowerCase();
    return name.includes('repuesto') || 
           name.includes('respuesto') || 
           name.includes('bateria') || 
           name.includes('batería') ||
           name.includes('liqui moly');
  };

  // Calcular el costo total de los repuestos consumidos este mes
  const costoRepuestos = useMemo(() => {
    return (expenses || [])
      .filter(e => isRepuestoCategory(e.categoria))
      .reduce((sum, e) => sum + Number(e.monto || 0), 0);
  }, [expenses]);

  // Cifras Netas (excluyendo repuestos e insumos directos)
  const netSales       = Math.max(0, salesTotal - costoRepuestos);
  const netVariableCosts = Math.max(0, variableCosts - costoRepuestos);
  const netTotalCosts  = fixedCosts + netVariableCosts;
  const netOpexTotal   = fixedCosts + netVariableCosts;

  // ── Egresos del período (sin sueldos directos) ──
  const opexTotal  = fixedCosts + variableCosts;
  const resultado  = salesTotal - opexTotal; // El resultado final de caja sigue siendo Ventas - Egresos
  const netMargenPct  = netSales > 0 ? (resultado / netSales) * 100 : 0;

  // ── Punto de Equilibrio Ajustado (Excluyendo Repuestos) ──
  const totalCosts     = fixedCosts + variableCosts; // Mantener para compatibilidad
  const coveragePct   = netTotalCosts > 0
    ? Math.min((netSales / netTotalCosts) * 100, 100)
    : (netSales > 0 ? 100 : 0);
  const isBreakEven   = netSales >= netTotalCosts;

  // ── Análisis Temporal (día del mes) ──
  const today        = new Date();
  const realMonth    = today.getMonth();
  const realYear     = today.getFullYear();
  const isCurrentMonth = selectedMonth === realMonth && selectedYear === realYear;
  const isPastMonth    = selectedYear < realYear || (selectedYear === realYear && selectedMonth < realMonth);

  // Días totales del mes seleccionado
  const daysInMonth  = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  // Días transcurridos: si es el mes actual, hoy; si es pasado, el mes completo; si es futuro, 0
  const daysElapsed  = isCurrentMonth
    ? today.getDate()
    : isPastMonth
      ? daysInMonth
      : 0;
  const daysPct      = daysInMonth > 0 ? (daysElapsed / daysInMonth) * 100 : 0;

  // Ritmo diario actual (ventas netas / días transcurridos)
  const dailyRate        = daysElapsed > 0 ? netSales / daysElapsed : 0;
  // Ritmo diario requerido para llegar al equilibrio (costos netos / días del mes)
  const requiredDailyRate = daysInMonth > 0 ? netTotalCosts / daysInMonth : 0;
  // Proyección de ventas netas a fin de mes
  const projectedMonthEnd = dailyRate * daysInMonth;
  // ¿Vamos adelantados o atrasados respecto al tiempo?
  // cobertura% vs daysPct -> si cobertura > daysPct estamos ahead
  const paceAhead        = coveragePct >= daysPct;
  const paceDiff         = Math.abs(coveragePct - daysPct);

  // ── Insights del Asesor (useMemo SIEMPRE antes del early return) ──
  const insights = useMemo(() => buildInsights({
    salesTotal: netSales, opexTotal: netOpexTotal, resultado, margenPct: netMargenPct,
    ivaAPagar: ivaDif, expenses, mechanics
  }), [netSales, netOpexTotal, resultado, netMargenPct, ivaDif, expenses, mechanics]);


  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const incomeBreakdown = useMemo(() => {
    const list = sales || [];
    
    const tallerSales = list.filter(s => s.type === 'Servicio Taller');
    const tallerBoletas = tallerSales.filter(s => s.document_type === 'Boleta');
    const tallerFacturas = tallerSales.filter(s => s.document_type === 'Factura');
    const totalTallerBoletas = tallerBoletas.reduce((sum, s) => sum + s.total, 0);
    const totalTallerFacturas = tallerFacturas.reduce((sum, s) => sum + s.total, 0);
    
    const posSales = list.filter(s => s.type === 'Sala de Ventas');
    const posBoletas = posSales.filter(s => s.document_type === 'Boleta');
    const posFacturas = posSales.filter(s => s.document_type === 'Factura');
    const totalPosBoletas = posBoletas.reduce((sum, s) => sum + s.total, 0);
    const totalPosFacturas = posFacturas.reduce((sum, s) => sum + s.total, 0);

    return {
      taller: {
        total: totalTallerBoletas + totalTallerFacturas,
        count: tallerSales.length,
        boletas: { total: totalTallerBoletas, count: tallerBoletas.length },
        facturas: { total: totalTallerFacturas, count: tallerFacturas.length }
      },
      pos: {
        total: totalPosBoletas + totalPosFacturas,
        count: posSales.length,
        boletas: { total: totalPosBoletas, count: posBoletas.length },
        facturas: { total: totalPosFacturas, count: posFacturas.length }
      }
    };
  }, [sales]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold animate-pulse">Sincronizando datos financieros...</p>
      </div>
    );
  }

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', title: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-600',    title: 'text-rose-800',    badge: 'bg-rose-100 text-rose-700 border-rose-200'         },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   title: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700 border-amber-200'       },
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-600',    title: 'text-blue-800',    badge: 'bg-blue-100 text-blue-700 border-blue-200'          },
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   icon: 'text-slate-500',   title: 'text-slate-700',   badge: 'bg-slate-100 text-slate-600 border-slate-200'       },
  };

  return (
    <div className="space-y-6 text-slate-900">

      {/* ── Sub-título del módulo ── */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Resumen Financiero e Inteligencia de Negocio</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">{companyName || 'Tu empresa'}</p>
      </div>

      {/* Banner Informativo de Exclusión de Costo de Repuestos */}
      {costoRepuestos > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-lg"></div>
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <p className="font-extrabold text-amber-800 uppercase tracking-wider text-[10px] mb-1">Ajuste de Rentabilidad y Punto de Equilibrio Activo</p>
            <p>
              Para reflejar la salud financiera real de la estructura del taller, se ha excluido el costo de repuestos e insumos directos (<strong>${fmt(costoRepuestos)}</strong>) de los **Ingresos del Mes** y de los **Egresos Totales**. Esto evita que las compras para clientes distorsionen y aumenten la meta de supervivencia del local.
            </p>
          </div>
        </div>
      )}


      {/* ── 4 KPIs Principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Ingresos del Mes */}
        <div 
          onClick={() => setShowIncomeModal(true)}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 active:scale-[0.98]"
          title="Pinchar para ver el desglose de ingresos"
        >
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ingresos del Mes</p>
            <span className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <ArrowUpRight size={14} className="text-blue-600" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 leading-none">${fmt(netSales)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-semibold flex items-center gap-1">
            {costoRepuestos > 0 ? `Neto (Bruto: $${fmt(salesTotal)})` : 'Total facturas y boletas'} • <span className="text-blue-650 font-bold group-hover:underline">Ver desglose</span>
          </p>
        </div>

        {/* Egresos Totales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Egresos Totales</p>
            <span className="p-1.5 bg-rose-50 rounded-lg">
              <ArrowDownRight size={14} className="text-rose-600" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 leading-none">${fmt(netOpexTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-semibold">
            {costoRepuestos > 0 ? `OPEX Neto (Bruto: $${fmt(opexTotal)})` : `OPEX: $${fmt(opexTotal)}`} &nbsp;·&nbsp; CAPEX: $0
          </p>
        </div>

        {/* Resultado del Período */}
        <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow ${
          resultado >= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
        }`}>
          <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-xl transition-all ${resultado >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}></div>
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Resultado del Período</p>
            <span className={`p-1.5 rounded-lg ${resultado >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {resultado >= 0
                ? <TrendingUp size={14} className="text-emerald-600" />
                : <TrendingDown size={14} className="text-rose-600" />
              }
            </span>
          </div>
          <p className={`text-2xl font-black leading-none ${resultado >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {resultado >= 0 ? '+' : ''}${fmt(resultado)}
          </p>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            Margen neto del mes: <strong className={resultado >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{netMargenPct.toFixed(1)}%</strong>
          </p>
        </div>

        {/* IVA a Pago */}
        <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow ${
          esRemanente ? 'bg-blue-50/40 border-blue-200' : 'bg-amber-50/40 border-amber-200'
        }`}>
          <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-xl transition-all ${esRemanente ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}></div>
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {esRemanente ? 'Crédito Fiscal' : 'IVA a Pago'}
            </p>
            <span className={`p-1.5 rounded-lg ${esRemanente ? 'bg-blue-100' : 'bg-amber-100'}`}>
              <ShieldCheck size={14} className={esRemanente ? 'text-blue-600' : 'text-amber-600'} />
            </span>
          </div>
          <p className={`text-2xl font-black leading-none ${esRemanente ? 'text-blue-700' : 'text-amber-700'}`}>
            ${fmt(Math.abs(ivaDif))}
          </p>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            {esRemanente ? 'Crédito fiscal a favor para el mes siguiente.' : 'Débito fiscal neto estimado por pagar.'}
          </p>
        </div>

      </div>

      {/* ── Sección Central: Punto de Equilibrio + IVA Detallado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Punto de Equilibrio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <Target size={128} className="text-slate-900" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 mb-5">
            <Target size={20} className="text-blue-600" />
            Punto de Equilibrio Operativo
          </h3>

          <div className="grid grid-cols-2 gap-6 mb-5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas Actuales (Neto)*</p>
              <p className="text-xl font-black text-slate-900">${fmt(netSales)}</p>
              {costoRepuestos > 0 && (
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Excluye repuestos: ${fmt(costoRepuestos)}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Meta de Costos Netos</p>
              <p className="text-xl font-black text-slate-900">${fmt(netTotalCosts)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Progreso de cobertura</p>
              <p className={`text-xs font-extrabold ${isBreakEven ? 'text-emerald-600' : 'text-rose-600'}`}>
                {coveragePct.toFixed(1)}%
              </p>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isBreakEven ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
                style={{ width: `${Math.min(coveragePct, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className={`mt-5 flex items-center gap-2 text-xs font-bold rounded-xl px-4 py-3 ${
            isBreakEven
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {isBreakEven
              ? <><CheckCircle size={15} /> Operando por sobre el Punto de Equilibrio (Rentable).</>
              : <><AlertTriangle size={15} /> Aún bajo el Punto de Equilibrio — faltan ${fmt(netTotalCosts - netSales)} en ventas netas.</>
            }
          </div>

          {/* Mini desglose de costos */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
              <span className="text-slate-500 font-medium">Costos Fijos</span>
              <span className="font-bold text-slate-800">${fmt(fixedCosts)}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
              <span className="text-slate-500 font-medium">Costos Variables*</span>
              <span className="font-bold text-slate-800">${fmt(netVariableCosts)}</span>
            </div>
          </div>
          {costoRepuestos > 0 && (
            <div className="mt-4 p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-start gap-2 text-slate-700 text-[11px] leading-relaxed">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Exclusión de repuestos activa:</strong> Para evitar distorsionar el Punto de Equilibrio de tu estructura, se han descontado <strong>${fmt(costoRepuestos)}</strong> (compras de repuestos para clientes) tanto de las Ventas Actuales (Netas) como de los Costos Variables de este mes.
              </p>
            </div>
          )}

          {/* Análisis temporal — sólo cuando hay datos de días */}
          {daysElapsed > 0 && (
            <>
              {/* Barra de tiempo vs cobertura */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {isCurrentMonth ? `Análisis de Ritmo — Día ${daysElapsed} de ${daysInMonth}` : `Mes completo (${daysInMonth} días)`}
                </p>

                {/* Doble barra: tiempo y cobertura */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Tiempo transcurrido</span>
                    <span>{daysPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(daysPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium" style={{ color: isBreakEven ? '#059669' : '#e11d48' }}>
                    <span>Cobertura de costos</span>
                    <span>{coveragePct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isBreakEven ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
                      style={{ width: `${Math.min(coveragePct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Indicador de ritmo */}
                {isCurrentMonth && (
                  <div className={`flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-lg ${
                    paceAhead
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {paceAhead
                      ? <CheckCircle size={13} />
                      : <AlertTriangle size={13} />
                    }
                    {paceAhead
                      ? `Ritmo adelantado +${paceDiff.toFixed(1)}% respecto al tiempo del mes.`
                      : `Ritmo atrasado −${paceDiff.toFixed(1)}% respecto al tiempo del mes.`
                    }
                  </div>
                )}

                {/* Fila de métricas de ritmo */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Ritmo actual</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">${fmt(dailyRate)}</p>
                    <p className="text-[9px] text-slate-400">por día</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Ritmo requerido</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">${fmt(requiredDailyRate)}</p>
                    <p className="text-[9px] text-slate-400">por día</p>
                  </div>
                  <div className={`rounded-xl p-2.5 border ${
                    projectedMonthEnd >= totalCosts
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Proyección</p>
                    <p className={`text-sm font-black mt-0.5 ${
                      projectedMonthEnd >= totalCosts ? 'text-emerald-700' : 'text-rose-700'
                    }`}>${fmt(projectedMonthEnd)}</p>
                    <p className="text-[9px] text-slate-400">fin de mes</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Proyección IVA Mensual */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Proyección IVA Mensual
            </h3>
            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              IVA Chile 19%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Débito */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Débito Fiscal (Ventas)</p>
                <span className="bg-blue-50 text-blue-600 p-1 rounded">
                  <ArrowUpRight size={12} />
                </span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Ventas Brutas:</span>
                  <span>${fmt(salesTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Monto Neto:</span>
                  <span>${fmt(netoVentas)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-blue-700">
                  <span>IVA Débito (19%):</span>
                  <span>${fmt(ivaDebito)}</span>
                </div>
              </div>
            </div>

            {/* Crédito */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Crédito Fiscal (Compras)</p>
                <span className="bg-emerald-50 text-emerald-600 p-1 rounded">
                  <ArrowDownRight size={12} />
                </span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Compras c/ Factura:</span>
                  <span>${fmt(gastosConIva)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Monto Neto:</span>
                  <span>${fmt(netoGastos)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-emerald-700">
                  <span>IVA Crédito (19%):</span>
                  <span>${fmt(ivaCredito)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado IVA */}
          <div className={`rounded-xl p-4 border flex justify-between items-center ${
            esRemanente
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div>
              <p className={`text-xs font-extrabold uppercase tracking-wider ${esRemanente ? 'text-blue-800' : 'text-amber-800'}`}>
                {esRemanente ? 'Remanente de Crédito Fiscal' : 'IVA Estimado a Pagar'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {esRemanente ? 'Se acumula para el mes siguiente.' : 'Debes provisionar este saldo para el pago de F-29.'}
              </p>
            </div>
            <p className={`text-xl font-black ${esRemanente ? 'text-blue-700' : 'text-amber-700'}`}>
              ${fmt(Math.abs(ivaDif))}
            </p>
          </div>
        </div>

      </div>

      {/* ── Asesor Financiero Automatizado ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md">
            <Zap size={14} className="animate-pulse" />
            Asesor Financiero Automatizado — RPM IA
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Análisis basado en los datos del período.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map(insight => {
            const c = colorMap[insight.color];
            const Icon = insight.icon;
            return (
              <div key={insight.id} className={`${c.bg} border ${c.border} rounded-2xl p-5 space-y-2.5 hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-2">
                  <Icon size={16} className={c.icon} />
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${c.title}`}>
                    {insight.title}
                  </p>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  {insight.body}
                </p>
                {insight.rec && (
                  <div className="pt-1 border-t border-black/5">
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      <span className="font-extrabold text-slate-600">Recomendación:</span>{' '}
                      {insight.rec}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Liquidación de Personal (colapsable) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowMechanics(prev => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <DollarSign size={18} className="text-blue-600" />
            Liquidación y Productividad del Equipo (MO)
          </span>
          <ChevronRight
            size={18}
            className={`text-slate-400 transition-transform duration-200 ${showMechanics ? 'rotate-90' : ''}`}
          />
        </button>
        {showMechanics && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <MechanicSettlement mechanics={mechanics} onUpdate={refetchData} />
          </div>
        )}
      </div>

      {/* Modal de Desglose de Ingresos */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-2xl relative overflow-hidden transition-all duration-300 transform scale-100 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={18} />
                  Desglose de Ingresos del Período
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                  {MONTHS[selectedMonth]} {selectedYear} • {companyName || 'Tu taller'}
                </p>
              </div>
              <button 
                onClick={() => setShowIncomeModal(false)}
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
              
              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Taller */}
                <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/20 border border-blue-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Servicios de Taller</span>
                    <span className="text-[9px] font-bold bg-blue-100/80 text-blue-700 px-2 py-0.5 rounded-full">
                      {incomeBreakdown.taller.count} tickets
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mb-4">${fmt(incomeBreakdown.taller.total)}</p>
                  
                  <div className="space-y-2 text-xs border-t border-blue-100/80 pt-3">
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Boletas ({incomeBreakdown.taller.boletas.count})</span>
                      <span className="text-slate-850 font-bold">${fmt(incomeBreakdown.taller.boletas.total)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Facturas ({incomeBreakdown.taller.facturas.count})</span>
                      <span className="text-slate-850 font-bold">${fmt(incomeBreakdown.taller.facturas.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Sala de Ventas */}
                <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/20 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Sala de Ventas (POS)</span>
                    <span className="text-[9px] font-bold bg-emerald-100/80 text-emerald-700 px-2 py-0.5 rounded-full">
                      {incomeBreakdown.pos.count} ventas
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mb-4">${fmt(incomeBreakdown.pos.total)}</p>
                  
                  <div className="space-y-2 text-xs border-t border-emerald-100/80 pt-3">
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Boletas ({incomeBreakdown.pos.boletas.count})</span>
                      <span className="text-slate-850 font-bold">${fmt(incomeBreakdown.pos.boletas.total)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Facturas ({incomeBreakdown.pos.facturas.count})</span>
                      <span className="text-slate-850 font-bold">${fmt(incomeBreakdown.pos.facturas.total)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Listado Detallado de Transacciones */}
              <div>
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Historial de Ingresos del Mes</h4>
                  
                  {/* Filtro rápido */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9px] font-extrabold border border-slate-150">
                    <button 
                      onClick={() => setIncomeFilter('all')}
                      className={`px-3 py-1 rounded-md transition-all ${incomeFilter === 'all' ? 'bg-white text-slate-850 shadow-sm border border-slate-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setIncomeFilter('taller')}
                      className={`px-3 py-1 rounded-md transition-all ${incomeFilter === 'taller' ? 'bg-white text-slate-850 shadow-sm border border-slate-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Taller
                    </button>
                    <button 
                      onClick={() => setIncomeFilter('pos')}
                      className={`px-3 py-1 rounded-md transition-all ${incomeFilter === 'pos' ? 'bg-white text-slate-850 shadow-sm border border-slate-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      POS
                    </button>
                  </div>
                </div>

                {/* Tabla/Lista */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                  {sales && sales.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-200">
                          <th className="py-2.5 px-4">Fecha</th>
                          <th className="py-2.5 px-4">Tipo</th>
                          <th className="py-2.5 px-4">Documento</th>
                          <th className="py-2.5 px-4 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-750 font-semibold">
                        {sales
                          .filter(s => {
                            if (incomeFilter === 'all') return true;
                            if (incomeFilter === 'taller') return s.type === 'Servicio Taller';
                            return s.type === 'Sala de Ventas';
                          })
                          .sort((a, b) => b.fecha.localeCompare(a.fecha))
                          .map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 text-slate-505 font-semibold">
                                {new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${s.type === 'Servicio Taller' ? 'bg-blue-50 text-blue-750 border border-blue-150' : 'bg-emerald-50 text-emerald-750 border border-emerald-150'}`}>
                                  {s.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-550 font-semibold">{s.document_type}</td>
                              <td className="py-2.5 px-4 text-right font-black text-slate-800">${fmt(s.total)}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-slate-400 py-12 text-center font-medium bg-slate-50/50">
                      No se registraron ingresos en este período.
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowIncomeModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
