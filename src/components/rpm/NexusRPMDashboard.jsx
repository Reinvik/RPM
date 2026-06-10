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
  ChevronRight
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

  // ── Desestructurar data (siempre, sin condicional) ──
  const { salesTotal, fixedCosts, variableCosts, expenses, mechanics } = data;

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

  // ── Egresos del período (sin sueldos directos) ──
  const opexTotal  = fixedCosts + variableCosts;
  const resultado  = salesTotal - opexTotal;
  const margenPct  = salesTotal > 0 ? (resultado / salesTotal) * 100 : 0;

  // ── Punto de Equilibrio ──
  const totalCosts    = fixedCosts + variableCosts;
  const coveragePct   = totalCosts > 0
    ? Math.min((salesTotal / totalCosts) * 100, 100)
    : (salesTotal > 0 ? 100 : 0);
  const isBreakEven   = salesTotal >= totalCosts;

  // ── Insights del Asesor (useMemo SIEMPRE antes del early return) ──
  const insights = useMemo(() => buildInsights({
    salesTotal, opexTotal, resultado, margenPct,
    ivaAPagar: ivaDif, expenses, mechanics
  }), [salesTotal, opexTotal, resultado, margenPct, ivaDif, expenses, mechanics]);


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


      {/* ── 4 KPIs Principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Ingresos del Mes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ingresos del Mes</p>
            <span className="p-1.5 bg-blue-50 rounded-lg">
              <ArrowUpRight size={14} className="text-blue-600" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 leading-none">${fmt(salesTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Total recaudado en facturas y boletas de clientes.</p>
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
          <p className="text-2xl font-black text-slate-900 leading-none">${fmt(opexTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            OPEX: ${fmt(fixedCosts + variableCosts)} &nbsp;·&nbsp; CAPEX: $0
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
            Margen neto del mes: <strong className={resultado >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{margenPct.toFixed(1)}%</strong>
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
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ventas Actuales (Bruto)</p>
              <p className="text-xl font-black text-slate-900">${fmt(salesTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Meta de Costos Totales</p>
              <p className="text-xl font-black text-slate-900">${fmt(totalCosts)}</p>
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
              : <><AlertTriangle size={15} /> Aún bajo el Punto de Equilibrio — faltan ${fmt(totalCosts - salesTotal)} en ventas.</>
            }
          </div>

          {/* Mini desglose de costos */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
              <span className="text-slate-500 font-medium">Costos Fijos</span>
              <span className="font-bold text-slate-800">${fmt(fixedCosts)}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
              <span className="text-slate-500 font-medium">Costos Variables</span>
              <span className="font-bold text-slate-800">${fmt(variableCosts)}</span>
            </div>
          </div>
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


    </div>
  );
}
