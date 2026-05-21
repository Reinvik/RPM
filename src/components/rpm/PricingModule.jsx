import React, { useState, useEffect } from 'react';
import { Calculator, Search, Plus, Trash2, Download, Save, RefreshCw, AlertCircle, Percent, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';

export default function PricingModule() {
  const { companyId } = useNexusContext();
  
  // Estados para búsqueda de repuestos existentes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  // Estados del formulario
  const [productName, setProductName] = useState('');
  const [costType, setCostType] = useState('neto'); // 'neto' o 'bruto'
  const [costValue, setCostValue] = useState('');
  const [marginPercent, setMarginPercent] = useState(30);
  const [marginType, setMarginType] = useState('margin'); // 'markup' (sobre costo) o 'margin' (sobre precio de venta)
  const [taxRate, setTaxRate] = useState(19); // 19% por defecto en Chile
  
  // Listado de simulaciones temporales (lote)
  const [simulationList, setSimulationList] = useState([]);

  // Estados de carga e interfaz
  const [savingPartId, setSavingPartId] = useState(null);
  const [creatingPart, setCreatingPart] = useState(false);

  // Buscar repuestos en Supabase al cambiar la consulta
  useEffect(() => {
    if (!companyId || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .schema('garage')
          .from('garage_parts')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', `%${searchQuery}%`)
          .limit(6);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Error buscando repuestos:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, companyId]);

  // Manejar selección de un repuesto existente
  const handleSelectPart = (part) => {
    setSelectedPart(part);
    setProductName(part.name);
    // Asumimos que el precio de venta actual en garage_parts es bruto
    // Si no tenemos costo cargado, dejamos que el usuario lo ingrese.
    setSearchResults([]);
    setSearchQuery('');
  };

  // Cálculos matemáticos
  const taxMultiplier = 1 + taxRate / 100;
  const cost = Number(costValue) || 0;
  
  let costNeto = 0;
  let costBruto = 0;

  if (costType === 'neto') {
    costNeto = cost;
    costBruto = cost * taxMultiplier;
  } else {
    costBruto = cost;
    costNeto = cost / taxMultiplier;
  }

  let ventaNeto = 0;
  if (marginType === 'markup') {
    ventaNeto = costNeto * (1 + marginPercent / 100);
  } else {
    // Evitar división por cero si el margen es 100% o más en contribución
    const divisor = 1 - marginPercent / 100;
    ventaNeto = divisor > 0 ? costNeto / divisor : 0;
  }

  const utilidadNeta = ventaNeto - costNeto;
  const ventaIva = ventaNeto * (taxRate / 100);
  const ventaBruto = ventaNeto + ventaIva;

  // Porcentaje real de margen obtenido sobre la venta
  const margenRealEfectivo = ventaNeto > 0 ? (utilidadNeta / ventaNeto) * 100 : 0;

  // Agregar cálculo actual a la lista
  const handleAddToList = () => {
    if (!productName.trim() || cost <= 0) {
      alert("Por favor ingresa un nombre y costo válido.");
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      partId: selectedPart?.id || null,
      name: productName,
      costNeto,
      costBruto,
      marginPercent,
      marginType,
      utilidadNeta,
      ventaNeto,
      ventaIva,
      ventaBruto,
      precioVentaActual: selectedPart?.price || null
    };

    setSimulationList([newItem, ...simulationList]);
    
    // Resetear formulario parcial
    setProductName('');
    setCostValue('');
    setSelectedPart(null);
  };

  // Eliminar de la lista
  const handleRemoveFromList = (id) => {
    setSimulationList(simulationList.filter(item => item.id !== id));
  };

  // Exportar lista a CSV
  const handleExportCSV = () => {
    if (simulationList.length === 0) return;
    
    const headers = [
      'Producto',
      'Costo Neto',
      'Costo Bruto',
      'Tipo Margen',
      'Margen %',
      'Utilidad Neta',
      'Precio Neto Venta',
      'IVA Venta',
      'Precio Bruto Venta (Final)'
    ];

    const rows = simulationList.map(item => [
      item.name,
      Math.round(item.costNeto),
      Math.round(item.costBruto),
      item.marginType === 'margin' ? 'Contribución' : 'Markup',
      `${item.marginPercent}%`,
      Math.round(item.utilidadNeta),
      Math.round(item.ventaNeto),
      Math.round(item.ventaIva),
      Math.round(item.ventaBruto)
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.map(val => typeof val === 'number' ? val : `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Calculo_Precios_Productos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Actualizar precio de repuesto existente en Supabase
  const handleSyncWithSupabase = async (item) => {
    if (!item.partId) return;
    setSavingPartId(item.id);

    try {
      const { error } = await supabase
        .schema('garage')
        .from('garage_parts')
        .update({
          price: Math.round(item.ventaBruto),
          // Opcionalmente se podría guardar el costo si la tabla lo soportara en el futuro
        })
        .eq('id', item.partId);

      if (error) throw error;

      alert(`✅ Repuesto "${item.name}" actualizado exitosamente a $${Math.round(item.ventaBruto).toLocaleString('es-CL')} (Bruto)`);
      
      // Actualizar visualmente la lista
      setSimulationList(prev => prev.map(sim => {
        if (sim.id === item.id) {
          return { ...sim, precioVentaActual: Math.round(item.ventaBruto) };
        }
        return sim;
      }));

    } catch (err) {
      console.error("Error actualizando precio:", err);
      alert("Error al actualizar precio en el inventario: " + err.message);
    } finally {
      setSavingPartId(null);
    }
  };

  // Crear nuevo repuesto en Supabase
  const handleCreateInSupabase = async (item) => {
    if (!companyId) return;
    setSavingPartId(item.id);

    try {
      const { data, error } = await supabase
        .schema('garage')
        .from('garage_parts')
        .insert({
          company_id: companyId,
          name: item.name,
          price: Math.round(item.ventaBruto),
          stock: 0,
          min_stock: 0,
          type: 'product'
        })
        .select()
        .single();

      if (error) throw error;

      alert(`✅ Repuesto "${item.name}" creado e insertado en el catálogo con precio de venta $${Math.round(item.ventaBruto).toLocaleString('es-CL')} (Bruto)`);

      // Actualizar el item de la simulación con el ID real recién creado
      setSimulationList(prev => prev.map(sim => {
        if (sim.id === item.id) {
          return { ...sim, partId: data.id, precioVentaActual: Math.round(item.ventaBruto) };
        }
        return sim;
      }));

    } catch (err) {
      console.error("Error creando repuesto:", err);
      alert("Error al guardar en el catálogo de repuestos: " + err.message);
    } finally {
      setSavingPartId(null);
    }
  };

  const fmt = (num) => Math.round(num).toLocaleString('es-CL');

  // Cálculos dinámicos para el gráfico visual (porcentaje relativo sobre el precio bruto)
  const pctCosto = ventaBruto > 0 ? (costNeto / ventaBruto) * 100 : 0;
  const pctUtilidad = ventaBruto > 0 ? (utilidadNeta / ventaBruto) * 100 : 0;
  const pctIva = ventaBruto > 0 ? (ventaIva / ventaBruto) * 100 : 0;

  return (
    <div className="p-8 font-sans bg-slate-50 min-h-screen text-slate-900">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calculator className="text-blue-600" size={32} />
            Fijación y Cálculo de Precios
          </h1>
          <p className="text-slate-500 mt-1">
            Calcula el margen de ganancia de tus repuestos e insumos, desglosa el IVA y sincronízalo con tu inventario.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Panel Formulario e Inputs (Izquierda) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">Parámetros del Producto</h2>
              {selectedPart && (
                <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-blue-100">
                  <RefreshCw size={12} className="animate-spin-slow" />
                  Repuesto del Inventario
                </span>
              )}
            </div>

            {/* Buscador de inventario */}
            <div className="relative">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Buscar en Catálogo de Repuestos (Opcional)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: Filtro de aceite, Pastillas de freno..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                {searching && (
                  <div className="absolute right-3.5 top-3.5">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Resultados predictivos */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {searchResults.map(part => (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part)}
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{part.name}</p>
                        <p className="text-xs text-slate-400">Stock: {part.stock} unidades</p>
                      </div>
                      <span className="font-bold text-slate-600">${fmt(part.price)} (Precio Actual)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inputs del Producto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nombre del Producto / Repuesto</label>
                <input
                  type="text"
                  placeholder="Ej: Ampolleta H7"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Costo de Compra</label>
                  <input
                    type="number"
                    placeholder="Monto"
                    value={costValue}
                    onChange={(e) => setCostValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo</label>
                  <select
                    value={costType}
                    onChange={(e) => setCostType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="neto">Neto</option>
                    <option value="bruto">Bruto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Margen y Tipo de Margen */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Margen Deseado</label>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">{marginPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fórmula de Margen</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMarginType('margin')}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${marginType === 'margin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Margen (Sobre Venta)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarginType('markup')}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${marginType === 'markup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Markup (Sobre Costo)
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensaje de Info sobre Tipo de Margen */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500 leading-normal">
                  {marginType === 'margin' 
                    ? <strong>Margen sobre Venta:</strong> 
                    : <strong>Markup sobre Costo:</strong>
                  } {marginType === 'margin'
                    ? "Asegura la rentabilidad real en tu balance. Con un margen del 30%, el 30% del precio de venta neto será tu utilidad neta."
                    : "Suma el porcentaje directamente al costo de compra neto. Al sumar 30% al costo, tu utilidad final real sobre la venta será de un 23%."
                  }
                </p>
              </div>
            </div>

            {/* IVA Selector y Botón Agregar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-0.5">Impuesto (IVA)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-sm font-semibold text-slate-700"
                    />
                    <span className="text-sm font-bold text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5">
                {selectedPart && (
                  <button
                    onClick={() => {
                      setSelectedPart(null);
                      setProductName('');
                      setCostValue('');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={handleAddToList}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Plus size={18} />
                  Simular y Añadir
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Panel de Resultados Detallado (Derecha) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 sticky top-8">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Percent className="text-emerald-500" size={20} />
              Desglose de Resultados
            </h2>

            {/* Tarjeta de Precios Sugeridos */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Precio Sugerido Venta</span>
              <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                ${fmt(ventaBruto)}
                <span className="text-xs text-slate-400 font-bold">IVA INC.</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10 text-sm">
                <div>
                  <span className="text-slate-400 text-xs block">Valor Neto</span>
                  <span className="font-bold text-white text-base">${fmt(ventaNeto)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Utilidad Neto</span>
                  <span className="font-bold text-emerald-400 text-base">+ ${fmt(utilidadNeta)}</span>
                </div>
              </div>
            </div>

            {/* Detalle Operativo de Costos */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">Costo de Compra Neto</span>
                <span className="font-bold text-slate-800">${fmt(costNeto)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">IVA Crédito Compra ({taxRate}%)</span>
                <span className="font-bold text-slate-700">${fmt(costBruto - costNeto)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl border-l-4 border-emerald-500">
                <span className="text-slate-600 font-semibold">Ganancia Neta</span>
                <span className="font-bold text-emerald-600">${fmt(utilidadNeta)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">IVA Débito Venta ({taxRate}%)</span>
                <span className="font-bold text-slate-700">${fmt(ventaIva)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-blue-700 font-bold">Margen Real Obtenido</span>
                <span className="font-bold text-blue-700">{margenRealEfectivo.toFixed(1)}%</span>
              </div>
            </div>

            {/* Barra Visual de Distribución de Precio Final */}
            {ventaBruto > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Distribución del Precio Final</span>
                <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
                  <div 
                    style={{ width: `${pctCosto}%` }} 
                    className="bg-slate-400 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                    title={`Costo: ${pctCosto.toFixed(1)}%`}
                  >
                    {pctCosto > 15 && 'Costo'}
                  </div>
                  <div 
                    style={{ width: `${pctUtilidad}%` }} 
                    className="bg-emerald-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                    title={`Utilidad: ${pctUtilidad.toFixed(1)}%`}
                  >
                    {pctUtilidad > 15 && 'Ganancia'}
                  </div>
                  <div 
                    style={{ width: `${pctIva}%` }} 
                    className="bg-blue-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                    title={`IVA: ${pctIva.toFixed(1)}%`}
                  >
                    {pctIva > 15 && 'IVA'}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                  <span>Costo: {pctCosto.toFixed(0)}%</span>
                  <span>Ganancia: {pctUtilidad.toFixed(0)}%</span>
                  <span>IVA: {pctIva.toFixed(0)}%</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Listado Masivo de Simulaciones (Lote) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tabla de Simulación en Lote</h2>
            <p className="text-slate-400 text-xs mt-0.5">Simula y compara múltiples repuestos antes de guardarlos.</p>
          </div>
          {simulationList.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm font-semibold transition-colors"
              >
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold">
                <th className="p-4">Producto</th>
                <th className="p-4 text-right">Costo Neto</th>
                <th className="p-4 text-right">Margen</th>
                <th className="p-4 text-right">Utilidad Neta</th>
                <th className="p-4 text-right">Precio Neto Venta</th>
                <th className="p-4 text-right">Precio Bruto (Sugerido)</th>
                <th className="p-4 text-right">Precio Venta Actual</th>
                <th className="p-4 text-right">Catálogo Supabase</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {simulationList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                    No hay productos agregados en el lote de simulación. Completa el formulario de arriba para añadir.
                  </td>
                </tr>
              ) : (
                simulationList.map(item => {
                  const isSyncing = savingPartId === item.id;
                  const isNewPart = !item.partId;
                  const currentPrice = item.precioVentaActual;
                  
                  // Comparar si el precio nuevo es mayor o menor al actual
                  const diff = currentPrice ? Math.round(item.ventaBruto) - currentPrice : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{item.name}</td>
                      <td className="p-4 text-right text-slate-600">${fmt(item.costNeto)}</td>
                      <td className="p-4 text-right font-medium text-blue-600 bg-blue-50/10">
                        {item.marginPercent}% <span className="text-[10px] text-slate-400">({item.marginType === 'margin' ? 'Margen' : 'Markup'})</span>
                      </td>
                      <td className="p-4 text-right text-emerald-600 font-semibold">+${fmt(item.utilidadNeta)}</td>
                      <td className="p-4 text-right text-slate-600">${fmt(item.ventaNeto)}</td>
                      <td className="p-4 text-right font-extrabold text-slate-900 bg-slate-50/50">${fmt(item.ventaBruto)}</td>
                      <td className="p-4 text-right text-slate-500 font-semibold">
                        {currentPrice ? (
                          <div>
                            <p>${fmt(currentPrice)}</p>
                            {diff !== 0 && (
                              <p className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {diff > 0 ? '▲ +' : '▼ -'}${fmt(Math.abs(diff))}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No registrado</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isNewPart ? (
                          <button
                            onClick={() => handleCreateInSupabase(item)}
                            disabled={isSyncing}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Save size={13} />
                            Crear Producto
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSyncWithSupabase(item)}
                            disabled={isSyncing || diff === 0}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all inline-flex items-center gap-1.5 disabled:opacity-50
                              ${diff === 0 
                                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                              }
                            `}
                          >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                            {diff === 0 ? 'Sincronizado' : 'Actualizar Precio'}
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveFromList(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
