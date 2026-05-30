import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Briefcase, 
  Trash2, 
  Repeat, 
  DollarSign, 
  AlertTriangle,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';

const DEFAULT_OPEX_CATEGORIES = [
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
  'Pago Publicidad'
];

const DEFAULT_CAPEX_CATEGORIES = [
  'Herramientas',
  'Maquinaria',
  'Infraestructura',
  'Mobiliario',
  'Tecnología',
  'Vehículos'
];

export default function ExpensesModule() {
  const { data: { expenses }, addExpense, deleteExpense, loading } = useNexusRPM();
  const { companyId, selectedMonth, selectedYear } = useNexusContext();
  
  const [showForm, setShowForm] = useState(false);
  const [clasificacion, setClasificacion] = useState('OPEX'); // 'OPEX' o 'CAPEX'
  const [recurrencia, setRecurrencia] = useState('Variable'); // 'Variable' o 'Fijo'
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [aplicaCreditoIva, setAplicaCreditoIva] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Estados para Categorías Personalizadas
  const [customOpexCategories, setCustomOpexCategories] = useState([]);
  const [customCapexCategories, setCustomCapexCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Cargar categorías personalizadas desde LocalStorage al iniciar o cambiar de empresa
  useEffect(() => {
    if (!companyId) return;
    const opexKey = `nexus_rpm_custom_opex_${companyId}`;
    const capexKey = `nexus_rpm_custom_capex_${companyId}`;
    
    setCustomOpexCategories(JSON.parse(localStorage.getItem(opexKey) || '[]'));
    setCustomCapexCategories(JSON.parse(localStorage.getItem(capexKey) || '[]'));
  }, [companyId]);

  // Listas de categorías combinadas
  const opexCategories = [...DEFAULT_OPEX_CATEGORIES, ...customOpexCategories];
  const capexCategories = [...DEFAULT_CAPEX_CATEGORIES, ...customCapexCategories];

  // Clasificar según la categoría (CAPEX explícito y OPEX por fallback resiliente)
  const capex = expenses.filter(e => capexCategories.includes(e.categoria));
  const opex = expenses.filter(e => !capexCategories.includes(e.categoria));

  // Totales de OPEX
  const totalOpex = opex.reduce((sum, e) => sum + Number(e.monto), 0);
  const opexFijos = opex.filter(e => e.tipo === 'Fijo').reduce((sum, e) => sum + Number(e.monto), 0);
  const opexVariables = opex.filter(e => e.tipo === 'Variable').reduce((sum, e) => sum + Number(e.monto), 0);

  // Totales de CAPEX
  const totalCapex = capex.reduce((sum, e) => sum + Number(e.monto), 0);
  const capexFijos = capex.filter(e => e.tipo === 'Fijo').reduce((sum, e) => sum + Number(e.monto), 0);
  const capexVariables = capex.filter(e => e.tipo === 'Variable').reduce((sum, e) => sum + Number(e.monto), 0);

  // Crédito IVA total de este mes (19% de los gastos afectos a IVA)
  const totalIvaCredito = expenses
    .filter(e => e.aplica_credito_iva)
    .reduce((sum, e) => sum + (Number(e.monto) - Number(e.monto) / 1.19), 0);

  // Determinar si el gasto es heredado de un mes anterior
  const isInherited = (exp) => {
    if (!exp.fecha || exp.tipo !== 'Fijo') return false;
    const [yr, mo] = exp.fecha.split('-').map(Number);
    const expYear = yr;
    const expMonth = mo - 1; // 0-indexed
    return expYear < selectedYear || (expYear === selectedYear && expMonth < selectedMonth);
  };

  const getOriginalMonthName = (fechaStr) => {
    if (!fechaStr) return '';
    const [yr, mo] = fechaStr.split('-').map(Number);
    const date = new Date(yr, mo - 1, 1);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let finalCategoria = categoria;
    
    // Procesar categoría personalizada
    if (showNewCategoryInput) {
      if (!newCategoryName.trim()) {
        alert("Por favor ingresa un nombre para la nueva categoría.");
        return;
      }
      finalCategoria = newCategoryName.trim();
      
      // Guardar en el almacenamiento local y actualizar estado
      if (clasificacion === 'OPEX') {
        if (!opexCategories.includes(finalCategoria)) {
          const updated = [...customOpexCategories, finalCategoria];
          setCustomOpexCategories(updated);
          localStorage.setItem(`nexus_rpm_custom_opex_${companyId}`, JSON.stringify(updated));
        }
      } else {
        if (!capexCategories.includes(finalCategoria)) {
          const updated = [...customCapexCategories, finalCategoria];
          setCustomCapexCategories(updated);
          localStorage.setItem(`nexus_rpm_custom_capex_${companyId}`, JSON.stringify(updated));
        }
      }
    }

    if (!finalCategoria || !monto) return;
    
    setSaving(true);
    const result = await addExpense({
      tipo: recurrencia,
      categoria: finalCategoria,
      monto: Number(monto),
      fecha,
      aplica_credito_iva: aplicaCreditoIva
    });
    setSaving(false);
    
    if (!result.error) {
      setShowForm(false);
      setCategoria('');
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      setMonto('');
      setFecha(new Date().toISOString().split('T')[0]);
      setAplicaCreditoIva(false);
      setRecurrencia('Variable');
    }
  };

  const handleDelete = async (exp) => {
    const inherited = isInherited(exp);
    const confirmMessage = inherited 
      ? `⚠️ ATENCIÓN: Este es un gasto fijo recurrente heredado de ${getOriginalMonthName(exp.fecha)}.\n\nSi lo eliminas, se borrará de forma permanente de ESTE y TODOS los meses posteriores.\n\n¿Estás seguro de que deseas eliminar este gasto recurrente?`
      : `¿Estás seguro de que deseas eliminar el gasto "${exp.categoria}" por $${fmt(exp.monto)}?`;

    if (!window.confirm(confirmMessage)) return;

    setDeletingId(exp.id);
    try {
      await deleteExpense(exp.id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const fmt = (num) => Math.round(num).toLocaleString('es-CL');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-600">Cargando registros de egresos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">
            Gestión estructurada de gastos de operación e inversiones, clasificados por recurrencia.
          </p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            setCategoria('');
            setNewCategoryName('');
            setShowNewCategoryInput(false);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all duration-300 ${
            showForm 
              ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-lg'
          }`}
        >
          <PlusCircle size={18} />
          {showForm ? 'Cerrar Formulario' : 'Registrar Nuevo Egreso'}
        </button>
      </div>


      {/* Formulario de Registro */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl mb-8 transition-all duration-300 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Sparkles className="text-blue-500 animate-pulse" size={20} />
            Registrar Nuevo Egreso Financiero
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Clasificación (OPEX vs CAPEX) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Clasificación Financiera</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setClasificacion('OPEX');
                      setCategoria('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      clasificacion === 'OPEX' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    OPEX (Gasto Operativo)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClasificacion('CAPEX');
                      setCategoria('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      clasificacion === 'CAPEX' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    CAPEX (Inversión / Activo)
                  </button>
                </div>
              </div>

              {/* Recurrencia (Fijo vs Variable) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo de Recurrencia</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRecurrencia('Variable')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      recurrencia === 'Variable' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Gasto Variable (Único del mes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurrencia('Fijo')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      recurrencia === 'Fijo' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Gasto Fijo (Repetitivo mensual)
                  </button>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Categoría</label>
                {showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ej: Arriendo, Isapre, etc."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                        setCategoria('');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <select
                    value={categoria}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setShowNewCategoryInput(true);
                      } else {
                        setCategoria(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="">Selecciona una categoría</option>
                    {(clasificacion === 'OPEX' ? opexCategories : capexCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="ADD_NEW" className="text-blue-600 font-extrabold">+ Agregar nueva categoría...</option>
                  </select>
                )}
              </div>

              {/* Monto */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Monto del Egreso ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Ej: 150000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Registro / Inicio</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              {/* IVA Crédito Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-200 w-full transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                    checked={aplicaCreditoIva}
                    onChange={(e) => setAplicaCreditoIva(e.target.checked)}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Aplica Crédito IVA</span>
                    <span className="text-[10px] text-slate-400 block">Descuenta IVA débito (19%)</span>
                  </div>
                </label>
              </div>

            </div>

            {/* Panel de Info / Advertencia si es Gasto Fijo */}
            {recurrencia === 'Fijo' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-blue-700 leading-normal font-medium">
                  <strong>Nota sobre Gastos Fijos:</strong> Este gasto se repetirá automáticamente mes a mes a partir de la fecha seleccionada ({new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}). Afectará al Punto de Equilibrio mensual y al Flujo de Caja anual sin requerir duplicar registros.
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setCategoria('');
                  setNewCategoryName('');
                  setShowNewCategoryInput(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? 'Guardando...' : 'Guardar Egreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resumen Cards (Estructura Premium) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* OPEX Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gastos Operativos (OPEX)</span>
              <TrendingUp className="text-rose-500" size={18} />
            </div>
            <div className="text-2xl font-extrabold text-slate-800">${fmt(totalOpex)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Gastos Fijos</span>
              <span className="text-slate-700">${fmt(opexFijos)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Gastos Variables</span>
              <span className="text-slate-700">${fmt(opexVariables)}</span>
            </div>
          </div>
        </div>

        {/* CAPEX Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Inversión / Activos (CAPEX)</span>
              <TrendingDown className="text-blue-500" size={18} />
            </div>
            <div className="text-2xl font-extrabold text-slate-800">${fmt(totalCapex)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Inversión Fija</span>
              <span className="text-slate-700">${fmt(capexFijos)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Inversión Variable</span>
              <span className="text-slate-700">${fmt(capexVariables)}</span>
            </div>
          </div>
        </div>

        {/* IVA Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Crédito IVA Recuperable</span>
              <Layers className="text-emerald-500" size={18} />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600">${fmt(totalIvaCredito)}</div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100">
            Calculado sobre el 19% de los egresos registrados afectos a impuestos en este periodo.
          </p>
        </div>

      </div>

      {/* Listados de Egresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Bloque OPEX */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Detalle de OPEX (Operacionales)
            </h2>
            <span className="bg-rose-50 text-rose-600 text-xs font-extrabold px-3 py-1 rounded-full border border-rose-100">
              Total: ${fmt(totalOpex)}
            </span>
          </div>

          <div className="p-5 space-y-3.5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {opex.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center font-medium">No hay gastos operacionales registrados en este período.</p>
            ) : (
              opex.map(exp => renderExpenseRow(exp))
            )}
          </div>
        </div>

        {/* Bloque CAPEX */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Detalle de CAPEX (Inversiones)
            </h2>
            <span className="bg-blue-50 text-blue-600 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-100">
              Total: ${fmt(totalCapex)}
            </span>
          </div>

          <div className="p-5 space-y-3.5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {capex.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center font-medium">No hay inversiones registradas en este período.</p>
            ) : (
              capex.map(exp => renderExpenseRow(exp))
            )}
          </div>
        </div>

      </div>

    </div>
  );

  // Renderizar fila de gasto individual
  function renderExpenseRow(exp) {
    const isFixed = exp.tipo === 'Fijo';
    const inherited = isInherited(exp);
    const isDeleting = deletingId === exp.id;

    return (
      <div 
        key={exp.id} 
        className={`flex justify-between items-center p-3.5 rounded-xl border transition-all duration-200 group ${
          inherited 
            ? 'bg-indigo-50/20 border-indigo-100/70 hover:bg-indigo-50/40' 
            : 'bg-slate-50 border-slate-150 hover:bg-slate-100/50'
        }`}
      >
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-800 text-sm truncate">{exp.categoria}</p>
            
            {/* Badges de Recurrencia */}
            {isFixed ? (
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                inherited
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                <Repeat size={10} />
                {inherited ? 'Recurrente' : 'Fijo'}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Calendar size={10} />
                Variable
              </span>
            )}

            {/* Badge de IVA */}
            {exp.aplica_credito_iva && (
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                IVA (Cred.)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <Calendar size={12} />
            <span>
              {inherited 
                ? `Inicio: ${getOriginalMonthName(exp.fecha)}` 
                : new Date(exp.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
              }
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className={`font-extrabold text-sm ${opexCategories.includes(exp.categoria) ? 'text-rose-500' : 'text-blue-600'}`}>
            ${fmt(exp.monto)}
          </p>
          
          <button
            onClick={() => handleDelete(exp)}
            disabled={isDeleting}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Eliminar Gasto"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Trash2 size={15} />
            )}
          </button>
        </div>
      </div>
    );
  }
}
