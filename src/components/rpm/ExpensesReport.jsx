import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Filter, Calendar, ArrowUpRight, Minus } from 'lucide-react';

// ─── Paleta de colores ────────────────────────────────────────────────
const PALETTE = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4',
  '#64748b', '#a855f7',
];

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n) => Math.round(n || 0).toLocaleString('es-CL');
const fmtM = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${fmt(n)}`;
};

// ─── Tooltip personalizado ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: ${fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Label interior del Donut ─────────────────────────────────────────
const DonutLabel = ({ cx, cy, total }) => (
  <>
    <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-800" style={{ fontSize: 18, fontWeight: 900 }}>
      {fmtM(total)}
    </text>
    <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10, fontWeight: 600 }}>
      TOTAL EGRESOS
    </text>
  </>
);

// ─────────────────────────────────────────────────────────────────────
export default function ExpensesReport({ allExpenses, selectedMonth, selectedYear, capexCategories = [] }) {
  const [filterClasif, setFilterClasif]     = useState('Todos');  // 'OPEX' | 'CAPEX' | 'Todos'
  const [filterCategoria, setFilterCategoria] = useState('Todas');
  const [chartMode, setChartMode]           = useState('donut');  // 'donut' | 'barras' | 'linea'

  // Helper de clasificación (igual lógica que ExpensesModule)
  const isCapex = (e) => capexCategories.includes(e.categoria);
  const matchClasif = (e) => {
    if (filterClasif === 'Todos') return true;
    if (filterClasif === 'CAPEX') return isCapex(e);
    return !isCapex(e); // OPEX
  };

  // ── 1. Gastos del mes seleccionado ───────────────────────────────
  const monthExpenses = useMemo(() => {
    return (allExpenses || []).filter(e => {
      const d = new Date(e.fecha);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [allExpenses, selectedMonth, selectedYear]);

  // ── 2. Gastos del año seleccionado ───────────────────────────────
  const yearExpenses = useMemo(() => {
    return (allExpenses || []).filter(e => {
      const d = new Date(e.fecha);
      return d.getFullYear() === selectedYear;
    });
  }, [allExpenses, selectedYear]);

  // ── 3. Categorías disponibles en el mes ─────────────────────────
  const categories = useMemo(() => {
    const base = monthExpenses
      .filter(e => matchClasif(e))
      .map(e => e.categoria);
    return ['Todas', ...Array.from(new Set(base)).sort()];
  }, [monthExpenses, filterClasif, capexCategories]);

  // ── 4. Gastos filtrados para gráfico donut/ranking ──────────────
  const filtered = useMemo(() => {
    return monthExpenses.filter(e => {
      const okClasif = matchClasif(e);
      const okCat    = filterCategoria === 'Todas' || e.categoria === filterCategoria;
      return okClasif && okCat;
    });
  }, [monthExpenses, filterClasif, filterCategoria, capexCategories]);

  // ── 5. Agrupado por categoría ─────────────────────────────────
  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      map[e.categoria] = (map[e.categoria] || 0) + Number(e.monto || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const totalMes = filtered.reduce((s, e) => s + Number(e.monto || 0), 0);

  // ── 6. Evolución mensual (barras / línea) ─────────────────────
  const monthlyEvolution = useMemo(() => {
    const data = MONTHS_SHORT.map((m, idx) => {
      const gastos = yearExpenses
        .filter(e => {
          const d = new Date(e.fecha);
          const okClasif = matchClasif(e);
          const okCat    = filterCategoria === 'Todas' || e.categoria === filterCategoria;
          return d.getMonth() === idx && okClasif && okCat;
        })
        .reduce((s, e) => s + Number(e.monto || 0), 0);
      return { mes: m, total: gastos, isSelected: idx === selectedMonth };
    });
    return data;
  }, [yearExpenses, filterClasif, filterCategoria, selectedMonth, capexCategories]);

  // ── 7. Promedio anual y comparativa ──────────────────────────
  const mesesConDatos = monthlyEvolution.filter(m => m.total > 0);
  const promedioAnual = mesesConDatos.length > 0
    ? mesesConDatos.reduce((s, m) => s + m.total, 0) / mesesConDatos.length
    : 0;
  const difVsPromedio = totalMes - promedioAnual;
  const difPct = promedioAnual > 0 ? (difVsPromedio / promedioAnual) * 100 : 0;

  // ── 8. Top categoría del mes ──────────────────────────────────
  const topCategory = byCategory[0] || null;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter size={13} />
            Filtros:
          </div>

          {/* Clasificación */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {['OPEX', 'CAPEX', 'Todos'].map(c => (
              <button
                key={c}
                onClick={() => { setFilterClasif(c); setFilterCategoria('Todas'); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  filterClasif === c
                    ? 'bg-white shadow-sm text-blue-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >{c}</button>
            ))}
          </div>

          {/* Categoría */}
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-400"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>

          {/* Modo gráfico */}
          <div className="ml-auto flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {[
              { key: 'donut',  label: 'Distribución', icon: PieIcon },
              { key: 'barras', label: 'Evolución',     icon: BarChart3 },
              { key: 'linea',  label: 'Tendencia',     icon: TrendingUp },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setChartMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  chartMode === key
                    ? 'bg-white shadow-sm text-blue-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs rápidos ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total mes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            {MONTHS_FULL[selectedMonth]} {selectedYear}
          </p>
          <p className="text-2xl font-black text-slate-900">${fmtM(totalMes)}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Total egresos del mes</p>
        </div>

        {/* Promedio mensual año */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Promedio {selectedYear}</p>
          <p className="text-2xl font-black text-slate-900">{fmtM(promedioAnual)}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Por mes (meses con datos)</p>
        </div>

        {/* Vs promedio */}
        <div className={`rounded-2xl border shadow-sm p-4 ${
          difVsPromedio > 0 ? 'bg-rose-50 border-rose-200' : difVsPromedio < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">vs Promedio Anual</p>
          <div className="flex items-center gap-1.5">
            {difVsPromedio > 0
              ? <TrendingUp size={18} className="text-rose-500" />
              : difVsPromedio < 0
                ? <TrendingDown size={18} className="text-emerald-500" />
                : <Minus size={18} className="text-slate-400" />
            }
            <p className={`text-2xl font-black ${
              difVsPromedio > 0 ? 'text-rose-600' : difVsPromedio < 0 ? 'text-emerald-600' : 'text-slate-600'
            }`}>
              {difVsPromedio > 0 ? '+' : ''}{difPct.toFixed(1)}%
            </p>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            {difVsPromedio > 0 ? 'Sobre el promedio' : difVsPromedio < 0 ? 'Bajo el promedio' : 'Igual al promedio'}
          </p>
        </div>

        {/* Mayor gasto */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Mayor Categoría</p>
          {topCategory ? (
            <>
              <p className="text-sm font-black text-slate-900 leading-tight truncate">{topCategory.name}</p>
              <p className="text-lg font-black text-blue-600 mt-0.5">${fmtM(topCategory.value)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {totalMes > 0 ? ((topCategory.value / totalMes) * 100).toFixed(1) : 0}% del total
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 font-medium mt-1">Sin datos</p>
          )}
        </div>
      </div>

      {/* ── Gráfico principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Gráfico */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {chartMode === 'donut'  ? `Distribución — ${MONTHS_FULL[selectedMonth]}` :
                 chartMode === 'barras' ? `Evolución Mensual ${selectedYear}` :
                                         `Tendencia Anual ${selectedYear}`}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {filterCategoria !== 'Todas' ? `Categoría: ${filterCategoria}` : filterClasif}
              </p>
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full">
              {filterClasif}
            </span>
          </div>

          {/* DONUT */}
          {chartMode === 'donut' && (
            byCategory.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400 text-xs font-medium">
                Sin egresos en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={115}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <DonutLabel cx="50%" cy="50%" total={totalMes} />
                  <Tooltip formatter={(v) => [`$${fmt(v)}`, '']} />
                  <Legend
                    formatter={(value) => <span className="text-[11px] font-semibold text-slate-600">{value}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          )}

          {/* BARRAS */}
          {chartMode === 'barras' && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyEvolution} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Egresos" radius={[6, 6, 0, 0]}>
                  {monthlyEvolution.map((m, i) => (
                    <Cell key={i} fill={m.isSelected ? '#3b82f6' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* LÍNEA */}
          {chartMode === 'linea' && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Egresos"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        key={`dot-${props.index}`}
                        cx={cx} cy={cy} r={payload.isSelected ? 6 : 3.5}
                        fill={payload.isSelected ? '#3b82f6' : '#fff'}
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
                {/* Línea de promedio */}
                {promedioAnual > 0 && (
                  <Line
                    type="monotone"
                    dataKey={() => promedioAnual}
                    name="Promedio"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking por categoría */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-blue-600" />
            Ranking de Categorías
          </h3>

          {byCategory.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs font-medium">
              Sin egresos en este período
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {byCategory.map((item, i) => {
                const pct = totalMes > 0 ? (item.value / totalMes) * 100 : 0;
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="font-semibold text-slate-700 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-800">${fmtM(item.value)}</span>
                        <span className="text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total pie */}
          {byCategory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500">Total {MONTHS_SHORT[selectedMonth]}</span>
              <span className="text-sm font-black text-slate-900">${fmt(totalMes)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla comparativa mes vs año ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-extrabold text-slate-800 mb-1 flex items-center gap-2">
          <Calendar size={16} className="text-blue-600" />
          Comportamiento del Mes vs el Año
        </h3>
        <p className="text-[10px] text-slate-400 font-medium mb-4">
          Compara {MONTHS_FULL[selectedMonth]} con todos los meses de {selectedYear}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="py-2 px-3">Mes</th>
                <th className="py-2 px-3 text-right">Total Egresos</th>
                <th className="py-2 px-3 text-right">vs Promedio</th>
                <th className="py-2 px-3">Barra</th>
              </tr>
            </thead>
            <tbody>
              {monthlyEvolution.map((m, i) => {
                if (m.total === 0) return null;
                const diff = m.total - promedioAnual;
                const diffPct = promedioAnual > 0 ? (diff / promedioAnual) * 100 : 0;
                const maxVal = Math.max(...monthlyEvolution.map(x => x.total));
                const barW = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                return (
                  <tr
                    key={m.mes}
                    className={`border-b border-slate-50 transition-colors ${
                      m.isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-700">
                      <span className={m.isSelected ? 'text-blue-700' : ''}>{MONTHS_FULL[i]}</span>
                      {m.isSelected && (
                        <span className="ml-1.5 text-[9px] font-extrabold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                          actual
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-800">
                      ${fmt(m.total)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold text-[11px] ${
                        diff > 0 ? 'text-rose-500' : diff < 0 ? 'text-emerald-500' : 'text-slate-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 w-32">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barW}%`,
                            backgroundColor: m.isSelected ? '#3b82f6' : '#94a3b8'
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
