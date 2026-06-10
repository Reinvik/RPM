import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  Calculator, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Info,
  Clock,
  DollarSign,
  ShieldAlert,
  CheckCircle,
  Percent,
  Search,
  BookOpenCheck
} from 'lucide-react';
import { useNexusRPM } from '../../hooks/useNexusRPM';

const GLOSSARY = [
  {
    term: 'IVA Débito Fiscal',
    definition: 'Es el impuesto del 19% recargado en cada venta (factura o boleta emitida a clientes). Este dinero es recaudado por la empresa pero le pertenece al Estado (SII en Chile). Debe declararse mensualmente en el F-29.',
    icon: TrendingUp,
    badge: 'Ventas'
  },
  {
    term: 'IVA Crédito Fiscal',
    definition: 'Es el impuesto del 19% pagado al comprar insumos, herramientas o servicios a proveedores con factura. Se resta del IVA Débito en el cálculo de impuestos mensual, aliviando la carga tributaria.',
    icon: Calculator,
    badge: 'Compras'
  },
  {
    term: 'OPEX (Operational Expenditures)',
    definition: 'Son los gastos operativos del negocio para mantener la puerta abierta en el día a día (sueldos de mecánicos, arriendo del galpón, contador, luz, software de gestión). Afectan directamente la utilidad del mes.',
    icon: FileText,
    badge: 'Gastos'
  },
  {
    term: 'CAPEX (Capital Expenditures)',
    definition: 'Son las inversiones destinadas a adquirir activos físicos duraderos que incrementan la capacidad del negocio (ej: elevadores de vehículos, escáneres automotrices, remodelación del local). Se deprecian gradualmente.',
    icon: BookOpen,
    badge: 'Inversión'
  },
  {
    term: 'Punto de Equilibrio (Break-Even)',
    definition: 'Es el nivel exacto de ventas brutas que requiere facturar tu empresa en un mes para cubrir la totalidad de sus gastos fijos y variables. A partir de este número, el negocio empieza a generar ganancias reales.',
    icon: HelpCircle,
    badge: 'Eficiencia'
  },
  {
    term: 'Flujo de Caja (Cash Flow)',
    definition: 'Es el registro de las entradas y salidas reales de dinero líquido en tu cuenta bancaria. A diferencia de la facturación devengada, mide la liquidez inmediata disponible para cumplir compromisos de corto plazo.',
    icon: Info,
    badge: 'Liquidez'
  }
];

const GOLDEN_RULES = [
  {
    title: 'Provisionar el IVA Mensualmente',
    desc: 'El 19% cobrado a tus clientes no es ganancia. Guárdalo inmediatamente en una cuenta bancaria separada. Así evitarás sorpresas de liquidez los días 20 (plazo para pagar el F-29 de IVA).',
    icon: Award,
    color: 'text-cyan-700 border-cyan-200 bg-cyan-50/70'
  },
  {
    title: 'Exigir Siempre Factura de Proveedores',
    desc: 'Cada compra que realices para el taller (desde lubricantes hasta café para clientes) debe ser con Factura. Esto genera IVA Crédito, compensando directamente el IVA Débito de tus ventas y bajando tu impuesto final.',
    icon: ShieldCheck,
    color: 'text-emerald-700 border-emerald-200 bg-emerald-50/70'
  },
  {
    title: 'Negociar Plazos de Pago (Días Proveedor)',
    desc: 'Si un distribuidor te ofrece 30 o 45 días de plazo para pagar repuestos, úsalo. Cobrarás los servicios al cliente en 0-5 días y pagarás el costo en 30 días, financiando tu operación con capital del proveedor.',
    icon: Sparkles,
    color: 'text-indigo-700 border-indigo-200 bg-indigo-50/70'
  },
  {
    title: 'Mantener un OPEX Fijo Controlado',
    desc: 'Intenta que tus gastos fijos (arriendo, sueldos base, licencias) no superen el 40% de tus ventas promedio históricas. Si caen las ventas, un OPEX fijo alto provocará pérdidas inmediatas.',
    icon: Info,
    color: 'text-pink-700 border-pink-200 bg-pink-50/70'
  }
];

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function HelpModule() {
  const { data: { yearlyCashflow }, loading } = useNexusRPM();
  const [activeTab, setActiveTab] = useState('education'); // 'education' o 'simulator'
  const [searchTerm, setSearchTerm] = useState('');

  // Sliders del Simulador
  const [salesGrowth, setSalesGrowth] = useState(0); // -50% a +100%
  const [opexReduction, setOpexReduction] = useState(0); // 0% a 50%
  const [supplierDelay, setSupplierDelay] = useState(0); // 0 a 90 días

  const filteredGlossary = GLOSSARY.filter(item => 
    item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculos del simulador
  const simulationData = useMemo(() => {
    const defaultData = {
      baseIngresos: Array(12).fill(0),
      baseGastos: Array(12).fill(0),
      baseSaldosFinales: Array(12).fill(0),
      simIngresos: Array(12).fill(0),
      simGastos: Array(12).fill(0),
      simSaldosFinales: Array(12).fill(0),
      baseTotalIngresos: 0,
      baseTotalGastos: 0,
      simTotalIngresos: 0,
      simTotalGastos: 0
    };

    if (!yearlyCashflow) return defaultData;

    // 1. Ingresos Mensuales Base
    const baseIngresos = Array(12).fill(0).map((_, m) => 
      (yearlyCashflow.ingresos?.facturas?.[m] || 0) + 
      (yearlyCashflow.ingresos?.boletas?.[m] || 0) + 
      (yearlyCashflow.ingresos?.otros?.[m] || 0)
    );

    // 2. Egresos Mensuales Base
    const baseGastos = Array(12).fill(0).map((_, m) => {
      let sum = 0;
      Object.values(yearlyCashflow.gastos || {}).forEach(arr => sum += (arr[m] || 0));
      return sum;
    });

    const fixedExpensesList = ['Pago Sueldos', 'Pago Arriendo', 'Pago Imposiciones'];

    // --- CÁLCULO MENSUAL SIMULADO ---
    const simIngresos = baseIngresos.map(val => val * (1 + salesGrowth / 100));
    
    const simGastos = Array(12).fill(0).map((_, m) => {
      let sum = 0;
      Object.entries(yearlyCashflow.gastos || {}).forEach(([cat, arr]) => {
        const val = arr[m] || 0;
        const isFixed = fixedExpensesList.includes(cat);
        if (isFixed) {
          sum += val; // Fijos no cambian
        } else {
          sum += val * (1 - opexReduction / 100); // Variables se reducen
        }
      });
      return sum;
    });

    // Aplicar Prórroga de Proveedores (Desplazar gastos variables a los meses siguientes)
    const delayRatio = Math.min(supplierDelay / 30, 3); // max 3 meses de delay
    const shiftedGastos = [...simGastos];
    
    if (delayRatio > 0) {
      const opexVariableMensual = Array(12).fill(0).map((_, m) => {
        let varSum = 0;
        Object.entries(yearlyCashflow.gastos || {}).forEach(([cat, arr]) => {
          if (!fixedExpensesList.includes(cat)) {
            varSum += (arr[m] || 0) * (1 - opexReduction / 100);
          }
        });
        return varSum;
      });

      for (let m = 0; m < 12; m++) {
        const amtToShift = opexVariableMensual[m] * (delayRatio * 0.4);
        if (amtToShift > 0 && m < 11) {
          shiftedGastos[m] -= amtToShift;
          const nextMonthIdx = Math.min(m + 1, 11);
          shiftedGastos[nextMonthIdx] += amtToShift;
        }
      }
    }

    // Calcular Flujos Netos y Saldos Acumulativos
    const baseSaldosFinales = Array(12).fill(0);
    const simSaldosFinales = Array(12).fill(0);

    let baseAccum = 0;
    let simAccum = 0;

    for (let m = 0; m < 12; m++) {
      const baseNeto = baseIngresos[m] - baseGastos[m];
      baseAccum += baseNeto;
      baseSaldosFinales[m] = baseAccum;

      const simNeto = simIngresos[m] - shiftedGastos[m];
      simAccum += simNeto;
      simSaldosFinales[m] = simAccum;
    }

    return {
      baseIngresos,
      baseGastos,
      baseSaldosFinales,
      simIngresos,
      simGastos: shiftedGastos,
      simSaldosFinales,
      baseTotalIngresos: baseIngresos.reduce((a, b) => a + b, 0),
      baseTotalGastos: baseGastos.reduce((a, b) => a + b, 0),
      simTotalIngresos: simIngresos.reduce((a, b) => a + b, 0),
      simTotalGastos: shiftedGastos.reduce((a, b) => a + b, 0)
    };
  }, [yearlyCashflow, salesGrowth, opexReduction, supplierDelay]);

  // Escalar el gráfico
  const maxBarValue = useMemo(() => {
    if (!simulationData) return 1000000;
    const allVals = [...simulationData.baseSaldosFinales, ...simulationData.simSaldosFinales].map(Math.abs);
    const max = Math.max(...allVals, 1000000);
    return max;
  }, [simulationData]);

  const baseDecember = simulationData.baseSaldosFinales[11];
  const simDecember = simulationData.simSaldosFinales[11];
  const decemberDiff = simDecember - baseDecember;

  const fmt = (num) => Math.round(num).toLocaleString('es-CL');

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-xl gap-2 max-w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('education')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'education'
              ? 'bg-[#0f172a] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <BookOpenCheck size={16} />
          Conceptos y Educación
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'simulator'
              ? 'bg-[#0f172a] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Calculator size={16} />
          Simulador de Escenarios
        </button>
      </div>

      {/* PESTAÑA: CONCEPTOS Y EDUCACIÓN */}
      {activeTab === 'education' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Golden Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-150 pb-3">
              <Award className="text-blue-600" size={18} />
              Reglas de Oro de la Gestión Financiera
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {GOLDEN_RULES.map((rule, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex gap-3 shadow-sm ${rule.color}`}>
                  <rule.icon className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-extrabold text-slate-850 text-xs mb-1">{rule.title}</h4>
                    <p className="text-slate-650 text-xs leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Glosario */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-150 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="text-blue-600" size={18} />
                Glosario de Conceptos Contables y Financieros
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar término o definición..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-1.5 pl-8 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-full focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGlossary.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-500 font-medium">
                  No se encontraron términos para tu búsqueda.
                </div>
              ) : (
                filteredGlossary.map((item, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="relative z-10 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border border-slate-200">
                          {item.badge}
                        </span>
                        <item.icon className="text-blue-600 opacity-80" size={16} />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-xs">{item.term}</h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{item.definition}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA: SIMULADOR DE ESCENARIOS */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-fade-in">
          
          {loading || !yearlyCashflow ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-semibold text-slate-400">Calculando flujo base e inicializando simulador...</p>
            </div>
          ) : (
            <>
              {/* Controles de Simulación (Sliders) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* Slider 1: Crecimiento de Ventas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-600" />
                      Crecimiento de Ventas
                    </span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      salesGrowth >= 0 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-650' 
                        : 'bg-rose-50 border-rose-100 text-rose-650'
                    }`}>
                      {salesGrowth > 0 ? '+' : ''}{salesGrowth}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    step="5"
                    value={salesGrowth}
                    onChange={(e) => setSalesGrowth(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-[10px] text-slate-400">Simula impactos por variaciones de clientes o tarifas.</p>
                </div>

                {/* Slider 2: Reducción OPEX */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent size={14} className="text-indigo-650" />
                      Reducción Gastos OPEX
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full border bg-indigo-50 border-indigo-100 text-indigo-650">
                      {opexReduction}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={opexReduction}
                    onChange={(e) => setOpexReduction(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-[10px] text-slate-400">Optimización de gastos variables del galpón e insumos.</p>
                </div>

                {/* Slider 3: Prórroga Proveedores */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-650" />
                      Prórroga Proveedores
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-100 text-amber-650">
                      {supplierDelay} días
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="15"
                    value={supplierDelay}
                    onChange={(e) => setSupplierDelay(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-[10px] text-slate-400">Retraso de pagos a distribuidores para amortiguar caja.</p>
                </div>

              </div>

              {/* KPIs Comparativos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Caja Base Diciembre */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block mb-2">Caja Fin de Año (Base)</span>
                    <span className="text-xl font-extrabold text-slate-700">${fmt(baseDecember)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-4 border-t border-slate-100 pt-2 font-medium">
                    Saldo final neto acumulado proyectado sin cambios.
                  </p>
                </div>

                {/* Caja Simulada Diciembre */}
                <div className={`bg-white border p-5 rounded-2xl flex flex-col justify-between shadow-sm border-slate-200 border-l-4 ${simDecember >= 0 ? 'border-l-blue-500' : 'border-l-rose-500 bg-rose-50/5'}`}>
                  <div>
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block mb-2">Caja Fin de Año (Simulado)</span>
                    <span className={`text-xl font-black ${simDecember >= 0 ? 'text-blue-650' : 'text-rose-600'}`}>
                      ${fmt(simDecember)}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-4 border-t border-slate-100 pt-2 font-medium">
                    Saldo final neto proyectado con parámetros actuales.
                  </p>
                </div>

                {/* Impacto neto */}
                <div className={`bg-white border p-5 rounded-2xl flex flex-col justify-between shadow-sm border-slate-200 border-l-4 ${decemberDiff >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                  <div>
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block mb-2">Diferencia en Liquidez</span>
                    <span className={`text-xl font-black ${decemberDiff >= 0 ? 'text-emerald-600' : 'text-rose-650'}`}>
                      {decemberDiff >= 0 ? '+' : ''}${fmt(decemberDiff)}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-4 border-t border-slate-100 pt-2 font-medium">
                    Liquidez neta liberada en el año.
                  </p>
                </div>

              </div>

              {/* Gráfico Comparativo */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Sparkles size={16} className="text-blue-600 animate-pulse" />
                  Proyección Comparativa de Saldos Mensuales (Base vs Simulado)
                </h3>

                {/* Chart Area */}
                <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-6 border-b border-slate-200 pb-2">
                  {MONTHS.map((m, idx) => {
                    const baseVal = simulationData.baseSaldosFinales[idx];
                    const simVal = simulationData.simSaldosFinales[idx];

                    const baseHeight = Math.max(Math.min((Math.abs(baseVal) / maxBarValue) * 100, 100), 2);
                    const simHeight = Math.max(Math.min((Math.abs(simVal) / maxBarValue) * 100, 100), 2);

                    const isBaseNegative = baseVal < 0;
                    const isSimNegative = simVal < 0;

                    return (
                      <div key={m} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-white border border-slate-200 p-2.5 rounded-lg text-[10px] text-slate-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 shadow-xl min-w-[125px]">
                          <p className="font-bold border-b border-slate-100 pb-1 mb-1 text-center text-blue-600">{m} 2026</p>
                          <p className="flex justify-between gap-2"><span>Base:</span> <span className={isBaseNegative ? 'text-rose-600 font-bold' : 'text-slate-600'}>${fmt(baseVal)}</span></p>
                          <p className="flex justify-between gap-2 font-bold"><span>Simulado:</span> <span className={isSimNegative ? 'text-rose-650' : 'text-blue-650'}>${fmt(simVal)}</span></p>
                        </div>

                        {/* Barras */}
                        <div className="w-full flex items-end justify-center gap-1.5 h-full">
                          {/* Barra Base */}
                          <div 
                            className={`w-3 sm:w-5 rounded-t transition-all duration-550 ${isBaseNegative ? 'bg-rose-500/30' : 'bg-slate-250'}`}
                            style={{ height: `${baseHeight}%` }}
                          />
                          {/* Barra Simulada */}
                          <div 
                            className={`w-3 sm:w-5 rounded-t transition-all duration-550 ${isSimNegative ? 'bg-rose-500' : 'bg-gradient-to-t from-blue-500 to-cyan-400 shadow-sm'}`}
                            style={{ height: `${simHeight}%` }}
                          />
                        </div>

                        <span className="text-[10px] text-slate-400 font-bold mt-2">{m}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 justify-center mt-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-slate-250 rounded shadow-sm"></div>
                    <span>Saldo Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-gradient-to-br from-blue-500 to-cyan-400 rounded shadow-sm"></div>
                    <span>Saldo Simulado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-rose-500 rounded shadow-sm"></div>
                    <span>Caja en Déficit</span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico Predictivo */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldAlert size={16} className="text-blue-600" />
                  Diagnóstico Predictivo de Escenario
                </h3>
                
                <div className="space-y-4 text-xs font-semibold">
                  {simDecember < 0 ? (
                    <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                      <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="font-extrabold text-rose-800 mb-1">Riesgo Crítico de Insolvencia Anual</h4>
                        <p className="text-slate-700 leading-relaxed font-normal">
                          Con el escenario simulado, tu saldo de caja disponible sigue cayendo por debajo de cero en el último tramo del año. Esto significa que no tendrás el efectivo suficiente para pagar arriendos o liquidaciones de sueldos sin recurrir a financiamiento externo.
                        </p>
                        <p className="text-slate-500 mt-2 font-bold uppercase text-[10px]">
                          Acción recomendada: Incrementa el crecimiento de ventas por sobre el 15% o evalúa reducir el OPEX variable un 10% adicional.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-250 rounded-xl">
                      <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="font-extrabold text-emerald-800 mb-1">Estructura Financiera Sostenible</h4>
                        <p className="text-slate-700 leading-relaxed font-normal">
                          Los parámetros seleccionados garantizan una caja positiva durante todos los meses del año. Mantienes una proyección de caja final de <strong className="text-emerald-600">${fmt(simDecember)}</strong> en Diciembre, superando la base en <strong className="text-emerald-650">${fmt(decemberDiff)}</strong>.
                        </p>
                        <p className="text-slate-500 mt-2 font-bold uppercase text-[10px]">
                          Acción recomendada: Puedes utilizar este escenario optimizado como presupuesto objetivo para el equipo comercial y el área de abastecimiento durante este año.
                        </p>
                      </div>
                    </div>
                  )}

                  {supplierDelay > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <Clock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="font-extrabold text-amber-800 mb-1">Impacto de la Prórroga de Proveedores</h4>
                        <p className="text-slate-700 leading-relaxed font-normal">
                          Prorrogar los pagos a proveedores por {supplierDelay} días te otorga un alivio de caja inmediato, disminuyendo tus egresos operativos del mes actual. Sin embargo, ten en cuenta que esto acumula pasivos de pago que se concentrarán en los meses subsiguientes, requiriendo un repunte de ventas obligatorio para evitar cuellos de botella futuros.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}
