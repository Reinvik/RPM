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
  Sparkles,
  Edit2
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
  const { data: { expenses }, addExpense, deleteExpense, updateExpense, loading } = useNexusRPM();
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

  // Estados para Edición y Registro en Cuotas
  const [editingExpense, setEditingExpense] = useState(null);
  const [isCuotasEnabled, setIsCuotasEnabled] = useState(false);
  const [numCuotas, setNumCuotas] = useState(3);
  const [tipoCalculoCuotas, setTipoCalculoCuotas] = useState('dividir'); // 'dividir' o 'monto_fijo'
  const [montoFijoCuota, setMontoFijoCuota] = useState('');
  const [cuotasList, setCuotasList] = useState([]);

  // Estados para Categorías Personalizadas
  const [customOpexCategories, setCustomOpexCategories] = useState([]);
  const [customCapexCategories, setCustomCapexCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Estado para la pestaña activa (OPEX por defecto, priorizándolo sobre CAPEX)
  const [activeTab, setActiveTab] = useState('OPEX');

  // Helper para sumar meses a una fecha
  const addMonths = (dateStr, months) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  // Generar la lista de cuotas automáticamente cuando cambian los inputs principales o el modo de cálculo
  const regenerateCuotasList = (montoVal, fechaVal, numCuotasVal, tipoCalculoVal, montoFijoVal, enabled = isCuotasEnabled) => {
    if (!enabled || !montoVal || Number(montoVal) <= 0) {
      setCuotasList([]);
      return;
    }

    const total = Number(montoVal);
    const list = [];

    if (tipoCalculoVal === 'dividir') {
      if (numCuotasVal < 2) return;
      const baseMonto = Math.floor(total / numCuotasVal);
      
      for (let i = 0; i < numCuotasVal; i++) {
        const cuotaMonto = i === numCuotasVal - 1 
          ? total - (baseMonto * (numCuotasVal - 1)) 
          : baseMonto;
        
        list.push({
          id: `cuota-${i}-${Date.now()}-${Math.random()}`,
          numero: i + 1,
          monto: cuotaMonto,
          fecha: addMonths(fechaVal, i)
        });
      }
    } else {
      // Modo Monto Fijo + Resto Final
      const valorCuota = Number(montoFijoVal);
      if (!valorCuota || valorCuota <= 0) return;

      if (valorCuota >= total) {
        list.push({
          id: `cuota-0-${Date.now()}-${Math.random()}`,
          numero: 1,
          monto: total,
          fecha: fechaVal
        });
      } else {
        const cantidadCuotasEnteras = Math.floor(total / valorCuota);
        
        // Limitar a un máximo de 60 cuotas para evitar congelar el navegador por valores pequeños intermedios
        if (cantidadCuotasEnteras > 60) {
          return;
        }

        const resto = total % valorCuota;
        
        for (let i = 0; i < cantidadCuotasEnteras; i++) {
          list.push({
            id: `cuota-${i}-${Date.now()}-${Math.random()}`,
            numero: i + 1,
            monto: valorCuota,
            fecha: addMonths(fechaVal, i)
          });
        }
        
        if (resto > 0) {
          list.push({
            id: `cuota-${cantidadCuotasEnteras}-${Date.now()}-${Math.random()}`,
            numero: cantidadCuotasEnteras + 1,
            monto: resto,
            fecha: addMonths(fechaVal, cantidadCuotasEnteras)
          });
        }
      }
    }
    setCuotasList(list);
  };


  // Manejar el cambio individual de una cuota
  const handleCuotaChange = (index, field, value) => {
    const updated = [...cuotasList];
    const parsedValue = field === 'monto' ? Number(value || 0) : value;

    updated[index] = {
      ...updated[index],
      [field]: parsedValue
    };

    setCuotasList(updated);

    if (field === 'monto') {
      const newTotal = updated.reduce((sum, c) => sum + Number(c.monto || 0), 0);
      setMonto(newTotal.toString());
    }
  };

  // Manejar inicio de la edición de un gasto
  const handleStartEdit = (exp) => {
    setEditingExpense(exp);
    setClasificacion(capexCategories.includes(exp.categoria) ? 'CAPEX' : 'OPEX');
    setRecurrencia(exp.tipo);
    // Remover sufijo de cuotas si lo tuviera, para facilitar edición
    const cleanCategoria = exp.categoria.replace(/\s\(Cuota\s\d+\/\d+\)$/, '');
    setCategoria(cleanCategoria);
    setMonto(exp.monto.toString());
    setFecha(exp.fecha);
    setAplicaCreditoIva(exp.aplica_credito_iva);
    setIsCuotasEnabled(false);
    setCuotasList([]);
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingExpense(null);
    setClasificacion('OPEX');
    setRecurrencia('Variable');
    setCategoria('');
    setMonto('');
    setFecha(new Date().toISOString().split('T')[0]);
    setAplicaCreditoIva(false);
    setIsCuotasEnabled(false);
    setTipoCalculoCuotas('dividir');
    setMontoFijoCuota('');
    setCuotasList([]);
  };

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
    
    try {
      if (editingExpense) {
        // Modo Edición
        const result = await updateExpense(editingExpense.id, {
          tipo: recurrencia,
          categoria: finalCategoria,
          monto: Number(monto),
          fecha,
          aplica_credito_iva: aplicaCreditoIva
        });
        
        if (result.error) throw result.error;
        setEditingExpense(null);
      } else if (isCuotasEnabled && cuotasList.length > 0) {
        // Modo Registro por Cuotas
        for (const c of cuotasList) {
          const result = await addExpense({
            tipo: 'Variable',
            categoria: `${finalCategoria} (Cuota ${c.numero}/${cuotasList.length})`,
            monto: Number(c.monto),
            fecha: c.fecha,
            aplica_credito_iva: aplicaCreditoIva
          });
          if (result.error) throw result.error;
        }
      } else {
        // Modo Creación Única Estándar
        const result = await addExpense({
          tipo: recurrencia,
          categoria: finalCategoria,
          monto: Number(monto),
          fecha,
          aplica_credito_iva: aplicaCreditoIva
        });
        
        if (result.error) throw result.error;
      }
      
      // Resetear campos
      setShowForm(false);
      setCategoria('');
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      setMonto('');
      setFecha(new Date().toISOString().split('T')[0]);
      setAplicaCreditoIva(false);
      setRecurrencia('Variable');
      setIsCuotasEnabled(false);
      setTipoCalculoCuotas('dividir');
      setMontoFijoCuota('');
      setCuotasList([]);
    } catch (err) {
      console.error(err);
      alert("Error al guardar egreso: " + (err.message || err));
    } finally {
      setSaving(false);
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
      {showForm && !editingExpense && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl mb-8 transition-all duration-300 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Sparkles className="text-blue-500 animate-pulse" size={20} />
            Registrar Nuevo Egreso Financiero
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Clasificación (OPEX por defecto) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Clasificación</label>
                <select
                  value={clasificacion}
                  onChange={(e) => {
                    setClasificacion(e.target.value);
                    setCategoria('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                >
                  <option value="OPEX">OPEX (Gasto Operativo)</option>
                  <option value="CAPEX">CAPEX (Inversión / Activo)</option>
                </select>
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
                    Variable (Único del mes)
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
                    Fijo (Repetitivo mensual)
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
                    onChange={(e) => {
                      setMonto(e.target.value);
                      if (isCuotasEnabled) regenerateCuotasList(e.target.value, fecha, numCuotas, tipoCalculoCuotas, montoFijoCuota);
                    }}
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
                  onChange={(e) => {
                    setFecha(e.target.value);
                    if (isCuotasEnabled) regenerateCuotasList(monto, e.target.value, numCuotas, tipoCalculoCuotas, montoFijoCuota);
                  }}
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

            {/* Sección de Registro en Cuotas Flexibles */}
            {recurrencia === 'Variable' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                      checked={isCuotasEnabled}
                      onChange={(e) => {
                        setIsCuotasEnabled(e.target.checked);
                        if (e.target.checked) {
                          regenerateCuotasList(monto, fecha, numCuotas, tipoCalculoCuotas, montoFijoCuota, true);
                        } else {
                          setCuotasList([]);
                        }
                      }}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">¿Dividir este egreso en cuotas?</span>
                      <span className="text-[10px] text-slate-400 block">Registrar montos diferidos en múltiples meses</span>
                    </div>
                  </label>

                  {isCuotasEnabled && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex bg-slate-200 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setTipoCalculoCuotas('dividir');
                            regenerateCuotasList(monto, fecha, numCuotas, 'dividir', montoFijoCuota);
                          }}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                            tipoCalculoCuotas === 'dividir'
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          Dividir Total
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoCalculoCuotas('monto_fijo');
                            regenerateCuotasList(monto, fecha, numCuotas, 'monto_fijo', montoFijoCuota);
                          }}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                            tipoCalculoCuotas === 'monto_fijo'
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          Monto Fijo + Resto
                        </button>
                      </div>

                      {tipoCalculoCuotas === 'dividir' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Cantidad:</span>
                          <input 
                            type="number" 
                            min="2" 
                            max="48"
                            value={numCuotas} 
                            onChange={(e) => {
                              const val = Math.max(2, Number(e.target.value));
                              setNumCuotas(val);
                              regenerateCuotasList(monto, fecha, val, tipoCalculoCuotas, montoFijoCuota);
                            }}
                            className="w-14 bg-white border border-slate-200 rounded-lg p-1 text-center text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Monto Cuota:</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1 text-[10px] text-slate-400 font-bold">$</span>
                            <input 
                              type="number" 
                              placeholder="Monto"
                              value={montoFijoCuota} 
                              onChange={(e) => {
                                setMontoFijoCuota(e.target.value);
                                regenerateCuotasList(monto, fecha, numCuotas, tipoCalculoCuotas, e.target.value);
                              }}
                              className="w-24 bg-white border border-slate-200 rounded-lg p-1 pl-4.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>


                {isCuotasEnabled && cuotasList.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Planificación y Ajuste de Cuotas</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                      {cuotasList.map((cuota, idx) => (
                        <div key={cuota.id || idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-sm">
                          <span className="text-xs font-bold text-slate-500 shrink-0">Cuota {cuota.numero}</span>
                          <div className="flex gap-2 flex-1">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1.5 text-[11px] text-slate-400 font-bold">$</span>
                              <input 
                                type="number" 
                                value={cuota.monto} 
                                onChange={(e) => handleCuotaChange(idx, 'monto', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <input 
                              type="date" 
                              value={cuota.fecha} 
                              onChange={(e) => handleCuotaChange(idx, 'fecha', e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-blue-800">
                      <span>Total acumulado en cuotas:</span>
                      <span>${Number(monto || 0).toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                )}
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
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Guardando...' : 'Guardar Egreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Edición */}
      {editingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-xl relative overflow-hidden transition-all duration-300 transform scale-100 max-h-[95vh] flex flex-col">
            {/* Banner superior decorativo */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            
            {/* Botón Cerrar */}
            <button 
              onClick={handleCancelEdit} 
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
              title="Cerrar ventana"
            >
              <span className="sr-only">Cerrar</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cabecera */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Edit2 size={18} />
                </div>
                <div>
                  <span className="block text-slate-800">Editar Egreso Financiero</span>
                  <span className="block text-xs text-slate-400 font-normal mt-0.5">Modifica los detalles del registro seleccionado</span>
                </div>
              </h2>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <form id="edit-expense-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Clasificación */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Clasificación</label>
                    <select
                      value={clasificacion}
                      onChange={(e) => {
                        setClasificacion(e.target.value);
                        setCategoria('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold"
                    >
                      <option value="OPEX">OPEX (Gasto Operativo)</option>
                      <option value="CAPEX">CAPEX (Inversión / Activo)</option>
                    </select>
                  </div>

                  {/* Recurrencia */}
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
                        Variable (Único)
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
                        Fijo (Mensual)
                      </button>
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Categoría</label>
                    {showNewCategoryInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ej: Arriendo, Isapre, etc."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
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
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Monto ($)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        placeholder="Ej: 150000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
                        required
                      />
                    </div>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Registro</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      required
                    />
                  </div>

                  {/* IVA Checkbox */}
                  <div className="sm:col-span-2 flex items-center">
                    <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border border-slate-200 w-full transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white"
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

                {/* Nota de gasto fijo */}
                {recurrencia === 'Fijo' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                    <Info className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-amber-700 leading-normal font-medium">
                      <strong>Aviso sobre Gasto Fijo:</strong> Estás editando un gasto recurrente. Los cambios afectarán la proyección de este gasto en todos los meses siguientes en los que se replique.
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Pie del modal */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-expense-form"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumen Cards (Estructura Premium Priorizando OPEX) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* OPEX Summary Card (Destacado - 2 Columnas) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gastos Operativos (OPEX)</span>
              <TrendingUp className="text-rose-500" size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800">${fmt(totalOpex)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-500">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Gastos Fijos</span>
              <span className="text-slate-700 text-sm font-extrabold">${fmt(opexFijos)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Gastos Variables</span>
              <span className="text-slate-700 text-sm font-extrabold">${fmt(opexVariables)}</span>
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
            <div className="text-2xl font-black text-emerald-600">${fmt(totalIvaCredito)}</div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100">
            19% recuperable de egresos afectos a impuestos de este periodo.
          </p>
        </div>

        {/* CAPEX Summary Card (Diseño secundario / minimalista) */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col justify-between opacity-85 hover:opacity-100 transition-opacity">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Activos / CAPEX</span>
              <TrendingDown className="text-slate-400" size={16} />
            </div>
            <div className="text-xl font-bold text-slate-600">${fmt(totalCapex)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/50 text-[10px] font-semibold text-slate-400">
            <div>
              <span className="block text-[9px] uppercase">Fijo</span>
              <span className="text-slate-500 font-bold">${fmt(capexFijos)}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase">Variable</span>
              <span className="text-slate-500 font-bold">${fmt(capexVariables)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Pestañas de Navegación de Detalles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Barra de Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('OPEX')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'OPEX'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Gastos Operacionales (OPEX)
            <span className="ml-1 text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
              ${fmt(totalOpex)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CAPEX')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'CAPEX'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Inversión / Activos (CAPEX)
            <span className="ml-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
              ${fmt(totalCapex)}
            </span>
          </button>
        </div>

        {/* Contenido del Tab Activo */}
        <div className="p-5">
          {activeTab === 'OPEX' ? (
            <div className="space-y-3 pr-1">
              {opex.length === 0 ? (
                <p className="text-slate-400 text-xs py-12 text-center font-medium">
                  No hay gastos operacionales registrados en este período.
                </p>
              ) : (
                opex.map(exp => renderExpenseRow(exp))
              )}
            </div>
          ) : (
            <div className="space-y-3 pr-1">
              {capex.length === 0 ? (
                <p className="text-slate-400 text-xs py-12 text-center font-medium">
                  No hay inversiones de capital (CAPEX) registradas en este período.
                </p>
              ) : (
                capex.map(exp => renderExpenseRow(exp))
              )}
            </div>
          )}
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

        <div className="flex items-center gap-2">
          <p className={`font-extrabold text-sm ${opexCategories.includes(exp.categoria) ? 'text-rose-500' : 'text-blue-600'}`}>
            ${fmt(exp.monto)}
          </p>
          
          <div className="flex items-center gap-1">
            {!inherited && (
              <button
                onClick={() => handleStartEdit(exp)}
                className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Editar Gasto"
              >
                <Edit2 size={15} />
              </button>
            )}
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
      </div>
    );
  }
}
