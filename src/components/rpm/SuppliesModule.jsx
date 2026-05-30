import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Percent, 
  Info, 
  Settings, 
  ArrowUpDown, 
  ChevronRight, 
  Edit2, 
  TrendingUp, 
  TrendingDown,
  Wrench,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';

export default function SuppliesModule() {
  const { companyId } = useNexusContext();

  // Estados de catálogo y configuración
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Configuraciones Globales
  const [globalTaxRate, setGlobalTaxRate] = useState(19); // 19% IVA por defecto (Chile)
  const [globalLaborPercent, setGlobalLaborPercent] = useState(15); // 15% Mano de obra por defecto

  // Estados para búsqueda, orden y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [profitabilityFilter, setProfitabilityFilter] = useState('all'); // all, loss, low, medium, high
  const [sortBy, setSortBy] = useState('name'); // name, price, cost, profit, margin
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Estado del Insumo Seleccionado para Detalle
  const [selectedPartId, setSelectedPartId] = useState(null);

  // Edición Inline de Insumo Seleccionado
  const [editCost, setEditCost] = useState('');
  const [editCostType, setEditCostType] = useState('neto'); // neto o bruto
  const [editLaborPercent, setEditLaborPercent] = useState(15);
  const [editTaxRate, setEditTaxRate] = useState(19);
  const [editPrice, setEditPrice] = useState(''); // Permite modificar el precio de venta

  // Estado para crear Insumo Temporal / Personalizado
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [customCostType, setCustomCostType] = useState('neto');
  const [customLaborPercent, setCustomLaborPercent] = useState(15);

  // Estado de sincronización en Supabase
  const [syncingPartId, setSyncingPartId] = useState(null);

  // 1. Cargar datos de Supabase y fusionar con configuraciones locales
  useEffect(() => {
    if (!companyId) return;

    const fetchParts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .schema('garage')
          .from('garage_parts')
          .select('*')
          .eq('company_id', companyId)
          .eq('type', 'product');

        if (error) throw error;

        // Cargar costos y comisiones de localStorage
        const localConfigKey = `nexus_rpm_supplies_config_${companyId}`;
        const localConfig = JSON.parse(localStorage.getItem(localConfigKey) || '{}');

        // Formatear insumos del catálogo
        const formattedParts = (data || []).map(part => {
          const config = localConfig[part.id] || {};
          return {
            id: part.id,
            name: part.name,
            price: Number(part.price) || 0, // Precio venta bruto actual en Supabase
            stock: Number(part.stock) || 0,
            location: part.location || 'Sin ubicación',
            isCustom: false,
            // Valores específicos del insumo (costo, mano de obra, impuesto)
            cost: config.cost !== undefined ? Number(config.cost) : 0,
            costType: config.costType || 'neto',
            laborPercent: config.laborPercent !== undefined ? Number(config.laborPercent) : globalLaborPercent,
            taxRate: config.taxRate !== undefined ? Number(config.taxRate) : globalTaxRate
          };
        });

        // Cargar insumos puramente temporales/personalizados creados por el usuario
        const localCustomKey = `nexus_rpm_supplies_custom_${companyId}`;
        const customParts = JSON.parse(localStorage.getItem(localCustomKey) || '[]');
        
        const finalParts = [...formattedParts, ...customParts.map(cp => ({ ...cp, isCustom: true }))];

        setParts(finalParts);

        // Seleccionar el primer insumo por defecto si hay alguno disponible
        if (finalParts.length > 0 && !selectedPartId) {
          setSelectedPartId(finalParts[0].id);
        }
      } catch (err) {
        console.error("Error cargando insumos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [companyId, refreshTrigger]);

  // Actualizar los inputs del formulario de edición cuando cambia el insumo seleccionado
  const selectedPart = useMemo(() => {
    const part = parts.find(p => p.id === selectedPartId);
    if (part) {
      setEditCost(part.cost === 0 ? '' : part.cost.toString());
      setEditCostType(part.costType);
      setEditLaborPercent(part.laborPercent);
      setEditTaxRate(part.taxRate);
      setEditPrice(part.price.toString());
    }
    return part;
  }, [selectedPartId, parts]);

  // 2. Guardar configuraciones del insumo actual (costo y mano de obra) en localStorage
  const handleSavePartConfig = () => {
    if (!selectedPart || !companyId) return;

    const costNum = Number(editCost) || 0;
    const laborNum = Number(editLaborPercent) || 0;
    const taxNum = Number(editTaxRate) || 0;
    const priceNum = Number(editPrice) || 0;

    if (selectedPart.isCustom) {
      // Es un producto personalizado local, actualizamos la lista guardada en local
      const localCustomKey = `nexus_rpm_supplies_custom_${companyId}`;
      const customParts = JSON.parse(localStorage.getItem(localCustomKey) || '[]');
      
      const updatedCustoms = customParts.map(cp => {
        if (cp.id === selectedPart.id) {
          return {
            ...cp,
            price: priceNum,
            cost: costNum,
            costType: editCostType,
            laborPercent: laborNum,
            taxRate: taxNum
          };
        }
        return cp;
      });

      localStorage.setItem(localCustomKey, JSON.stringify(updatedCustoms));
      alert("✅ Insumo personalizado actualizado en el almacenamiento local.");
    } else {
      // Es un producto de Supabase, guardamos sus configuraciones financieras asociadas localmente
      const localConfigKey = `nexus_rpm_supplies_config_${companyId}`;
      const localConfig = JSON.parse(localStorage.getItem(localConfigKey) || '{}');

      localConfig[selectedPart.id] = {
        cost: costNum,
        costType: editCostType,
        laborPercent: laborNum,
        taxRate: taxNum
      };

      localStorage.setItem(localConfigKey, JSON.stringify(localConfig));
      alert(`✅ Configuración de rentabilidad guardada para "${selectedPart.name}".`);
    }

    setRefreshTrigger(prev => prev + 1);
  };

  // 3. Sincronizar el nuevo precio de venta bruto con el catálogo de Supabase
  const handleSyncPriceWithSupabase = async () => {
    if (!selectedPart || selectedPart.isCustom || !companyId) return;
    
    const priceNum = Math.round(Number(editPrice)) || 0;
    if (priceNum <= 0) {
      alert("Por favor ingresa un precio de venta válido.");
      return;
    }

    setSyncingPartId(selectedPart.id);
    try {
      const { error } = await supabase
        .schema('garage')
        .from('garage_parts')
        .update({ price: priceNum })
        .eq('id', selectedPart.id);

      if (error) throw error;

      alert(`✅ ¡Sincronizado! El precio de venta en el catálogo de Supabase para "${selectedPart.name}" se actualizó a $${priceNum.toLocaleString('es-CL')} (Bruto).`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error sincronizando precio:", err);
      alert("Error al actualizar precio en Supabase: " + err.message);
    } finally {
      setSyncingPartId(null);
    }
  };

  // 4. Crear un insumo personalizado / simulado localmente
  const handleCreateCustomPart = (e) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice || !companyId) {
      alert("Completa el nombre y el precio de venta.");
      return;
    }

    const priceNum = Number(customPrice) || 0;
    const costNum = Number(customCost) || 0;
    const laborNum = Number(customLaborPercent) || 0;

    const newCustom = {
      id: `custom-${Date.now()}`,
      name: customName,
      price: priceNum,
      stock: 0,
      location: 'Simulado / Local',
      cost: costNum,
      costType: customCostType,
      laborPercent: laborNum,
      taxRate: globalTaxRate
    };

    const localCustomKey = `nexus_rpm_supplies_custom_${companyId}`;
    const customParts = JSON.parse(localStorage.getItem(localCustomKey) || '[]');
    localStorage.setItem(localCustomKey, JSON.stringify([newCustom, ...customParts]));

    // Resetear formulario
    setCustomName('');
    setCustomPrice('');
    setCustomCost('');
    setShowAddCustomModal(false);

    // Seleccionar el nuevo item creado y refrescar
    setSelectedPartId(newCustom.id);
    setRefreshTrigger(prev => prev + 1);
    alert(`✅ Insumo simulado "${newCustom.name}" creado.`);
  };

  // Eliminar un insumo personalizado/simulado
  const handleDeleteCustomPart = (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este insumo simulado?")) return;

    const localCustomKey = `nexus_rpm_supplies_custom_${companyId}`;
    const customParts = JSON.parse(localStorage.getItem(localCustomKey) || '[]');
    const updated = customParts.filter(cp => cp.id !== id);
    localStorage.setItem(localCustomKey, JSON.stringify(updated));

    if (selectedPartId === id) {
      setSelectedPartId(null);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  // 5. Aplicar costos y MO globales a todos los insumos que actualmente no tengan costos cargados
  const handleApplyGlobalDefaults = () => {
    if (!companyId || parts.length === 0) return;
    if (!window.confirm(`¿Deseas aplicar la tasa de IVA (${globalTaxRate}%) y Mano de Obra (${globalLaborPercent}%) por defecto a todos los insumos cargados?`)) return;

    const localConfigKey = `nexus_rpm_supplies_config_${companyId}`;
    const localConfig = JSON.parse(localStorage.getItem(localConfigKey) || '{}');

    parts.forEach(part => {
      if (!part.isCustom) {
        const config = localConfig[part.id] || {};
        localConfig[part.id] = {
          cost: config.cost !== undefined ? config.cost : 0,
          costType: config.costType || 'neto',
          laborPercent: globalLaborPercent,
          taxRate: globalTaxRate
        };
      }
    });

    localStorage.setItem(localConfigKey, JSON.stringify(localConfig));
    alert("✅ Configuraciones globales aplicadas a los insumos del catálogo.");
    setRefreshTrigger(prev => prev + 1);
  };

  // 6. Cálculos de Rentabilidad Detallados para cada Insumo
  const processedSupplies = useMemo(() => {
    return parts.map(part => {
      const taxRate = part.taxRate;
      const taxMultiplier = 1 + taxRate / 100;
      
      // Venta
      const priceBruto = part.price;
      const priceNeto = priceBruto / taxMultiplier;
      const taxVenta = priceBruto - priceNeto;

      // Costo de compra
      const costRaw = part.cost;
      let costNeto = 0;
      let costBruto = 0;

      if (part.costType === 'neto') {
        costNeto = costRaw;
        costBruto = costRaw * taxMultiplier;
      } else {
        costBruto = costRaw;
        costNeto = costRaw / taxMultiplier;
      }
      const taxCompra = costBruto - costNeto;

      // Mano de Obra (se calcula sobre el precio de venta neto)
      const laborCost = priceNeto * (part.laborPercent / 100);

      // Costo Total Neto
      const totalCostNeto = costNeto + laborCost;

      // Utilidad Neta
      const profitNeto = priceNeto - totalCostNeto;

      // Porcentaje de Margen (Contribución sobre venta neta)
      const marginPercent = priceNeto > 0 ? (profitNeto / priceNeto) * 100 : 0;

      // IVA neto a pagar (Débito - Crédito)
      const netTaxToPay = taxVenta - taxCompra;

      // Calificación de Rentabilidad
      let status = 'loss'; // pérdida
      let statusLabel = 'Pérdida';
      if (marginPercent > 40) {
        status = 'high';
        statusLabel = 'Excelente Margen';
      } else if (marginPercent >= 20) {
        status = 'medium';
        statusLabel = 'Margen Saludable';
      } else if (marginPercent > 0) {
        status = 'low';
        statusLabel = 'Margen Bajo';
      }

      return {
        ...part,
        priceNeto,
        taxVenta,
        costNeto,
        costBruto,
        taxCompra,
        laborCost,
        totalCostNeto,
        profitNeto,
        marginPercent,
        netTaxToPay,
        status,
        statusLabel
      };
    });
  }, [parts, globalLaborPercent, globalTaxRate]);

  // 7. Filtrado y Ordenamiento
  const filteredSupplies = useMemo(() => {
    let result = processedSupplies.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (profitabilityFilter === 'all') return matchSearch;
      return matchSearch && item.status === profitabilityFilter;
    });

    // Ordenar
    result.sort((a, b) => {
      let fieldA, fieldB;
      if (sortBy === 'name') {
        fieldA = a.name.toLowerCase();
        fieldB = b.name.toLowerCase();
      } else if (sortBy === 'price') {
        fieldA = a.price;
        fieldB = b.price;
      } else if (sortBy === 'cost') {
        fieldA = a.costNeto;
        fieldB = b.costNeto;
      } else if (sortBy === 'profit') {
        fieldA = a.profitNeto;
        fieldB = b.profitNeto;
      } else if (sortBy === 'margin') {
        fieldA = a.marginPercent;
        fieldB = b.marginPercent;
      }

      if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [processedSupplies, searchQuery, profitabilityFilter, sortBy, sortOrder]);

  // 8. Totales de Resumen de los Insumos Filtrados
  const summary = useMemo(() => {
    const totalCount = filteredSupplies.length;
    const lossCount = filteredSupplies.filter(i => i.status === 'loss').length;
    const lowCount = filteredSupplies.filter(i => i.status === 'low').length;
    const healthyCount = filteredSupplies.filter(i => i.status === 'medium' || i.status === 'high').length;
    
    const avgMargin = totalCount > 0 
      ? filteredSupplies.reduce((acc, curr) => acc + curr.marginPercent, 0) / totalCount 
      : 0;

    return {
      totalCount,
      lossCount,
      lowCount,
      healthyCount,
      avgMargin
    };
  }, [filteredSupplies]);

  // 9. Exportar a CSV
  const handleExportCSV = () => {
    if (filteredSupplies.length === 0) return;
    
    const headers = [
      'Insumo / Repuesto',
      'Tipo Insumo',
      'Precio Venta Bruto',
      'Precio Venta Neto',
      'IVA Débito (Venta)',
      'Costo Compra Neto',
      'Costo Mano Obra',
      'Costo Total Neto',
      'Utilidad Neta',
      'Margen de Ganancia %',
      'Estado Rentabilidad'
    ];

    const rows = filteredSupplies.map(item => [
      item.name,
      item.isCustom ? 'Simulado/Local' : 'Catálogo Taller',
      Math.round(item.price),
      Math.round(item.priceNeto),
      Math.round(item.taxVenta),
      Math.round(item.costNeto),
      Math.round(item.laborCost),
      Math.round(item.totalCostNeto),
      Math.round(item.profitNeto),
      `${item.marginPercent.toFixed(1)}%`,
      item.statusLabel
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.map(val => typeof val === 'number' ? val : `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rentabilidad_Insumos_${companyId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmt = (num) => Math.round(num || 0).toLocaleString('es-CL');

  // Valores de desglose visual para el insumo actualmente seleccionado
  const activeSupplyDetails = useMemo(() => {
    if (!selectedPart) return null;
    const fullDetail = filteredSupplies.find(p => p.id === selectedPart.id);
    if (!fullDetail) return null;

    const pv = fullDetail.price; // Bruto es el 100% de la barra visual
    const costPct = pv > 0 ? (fullDetail.costNeto / pv) * 100 : 0;
    const laborPct = pv > 0 ? (fullDetail.laborCost / pv) * 100 : 0;
    const taxPct = pv > 0 ? (fullDetail.taxVenta / pv) * 100 : 0;
    // La utilidad representa el remanente en la barra visual
    const profitPct = pv > 0 ? (fullDetail.profitNeto / pv) * 100 : 0;

    return {
      ...fullDetail,
      costPct,
      laborPct,
      taxPct,
      profitPct
    };
  }, [selectedPart, filteredSupplies]);

  // Cambiar sentido del ordenamiento o columna
  const requestSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
    }
  };

  const setSort = (field) => {
    setSortBy(field);
    setSortOrder('asc');
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center flex-col gap-4 text-slate-600">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold animate-pulse">Analizando catálogo de insumos y costos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* KPIs Rápidos y Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Insumos Analizados</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalCount}</h3>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Calculator size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Margen Promedio Neto</p>
            <h3 className="text-2xl font-extrabold text-cyan-600 mt-1">{summary.avgMargin.toFixed(1)}%</h3>
          </div>
          <div className="h-12 w-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
            <Percent size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Márgenes Saludables</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.healthyCount}</h3>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pérdidas o Sin Margen</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${summary.lossCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>{summary.lossCount}</h3>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${summary.lossCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <TrendingDown size={22} />
          </div>
        </div>

      </div>

      {/* Panel de Filtros Globales e Inicialización */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase">IVA por Defecto:</span>
            <input
              type="number"
              value={globalTaxRate}
              onChange={(e) => setGlobalTaxRate(Number(e.target.value))}
              className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-xs font-bold text-slate-400">%</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase">Mano Obra Base:</span>
            <input
              type="number"
              value={globalLaborPercent}
              onChange={(e) => setGlobalLaborPercent(Number(e.target.value))}
              className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-xs font-bold text-slate-400">%</span>
          </div>

          <button
            onClick={handleApplyGlobalDefaults}
            className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <Settings size={13} />
            Aplicar Base a Todo
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => setShowAddCustomModal(true)}
            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Simular Insumo Nuevo
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>

      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Table & Search (8 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Header de Búsqueda y Filtros */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Buscador */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar insumos del taller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pl-9 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={15} />
            </div>

            {/* Selector de Margen */}
            <div className="flex gap-2">
              <select
                value={profitabilityFilter}
                onChange={(e) => setProfitabilityFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Filtro Rentabilidad (Todos)</option>
                <option value="high">Excelente Margen ({'>'}40%)</option>
                <option value="medium">Margen Saludable (20-40%)</option>
                <option value="low">Margen Bajo (1-20%)</option>
                <option value="loss">En Pérdida (0% o menos)</option>
              </select>
            </div>

          </div>

          {/* Tabla de Insumos */}
          <div className="overflow-x-auto flex-1 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-extrabold sticky top-0 z-10">
                  <th className="p-3">
                    <button onClick={() => requestSort('name')} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
                      Insumo / Repuesto
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button onClick={() => requestSort('price')} className="flex items-center gap-1 hover:text-slate-800 transition-colors ml-auto">
                      Venta (Bruto)
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button onClick={() => requestSort('cost')} className="flex items-center gap-1 hover:text-slate-800 transition-colors ml-auto">
                      Costo Neto
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button onClick={() => requestSort('margin')} className="flex items-center gap-1 hover:text-slate-800 transition-colors ml-auto">
                      Margen %
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSupplies.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                      No se encontraron insumos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredSupplies.map(item => {
                    const isSelected = selectedPartId === item.id;
                    const margin = item.marginPercent;
                    
                    let badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                    if (item.status === 'high') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    else if (item.status === 'medium') badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-100';
                    else if (item.status === 'low') badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';

                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedPartId(item.id)}
                        className={`hover:bg-slate-50/70 transition-all cursor-pointer ${isSelected ? 'bg-blue-50/50 font-medium' : ''}`}
                      >
                        <td className="p-3 max-w-[200px]">
                          <div className="font-bold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            {item.isCustom ? (
                              <span className="bg-indigo-50 text-indigo-500 font-semibold px-1.5 py-0.2 rounded-md">Simulado</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-md">Catálogo</span>
                            )}
                            <span>Stock: {item.stock}</span>
                          </div>
                        </td>
                        
                        <td className="p-3 text-right font-bold text-slate-900">${fmt(item.price)}</td>
                        
                        <td className="p-3 text-right text-slate-500">
                          {item.costNeto > 0 ? (
                            `$${fmt(item.costNeto)}`
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin costo</span>
                          )}
                        </td>

                        <td className={`p-3 text-right font-extrabold ${margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          {item.costNeto > 0 ? `${margin.toFixed(1)}%` : '--'}
                        </td>

                        <td className="p-3 text-center">
                          {item.costNeto > 0 ? (
                            <span className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold ${badgeClass}`}>
                              {item.statusLabel}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400 text-[10px]">
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {item.isCustom ? (
                              <button
                                onClick={() => handleDeleteCustomPart(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Eliminar insumo simulado"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : null}
                            <ChevronRight size={14} className={`text-slate-400 transition-transform ${isSelected ? 'translate-x-1 text-blue-500' : ''}`} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Side: Advanced Analysis & In-line Editing (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {activeSupplyDetails ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6 sticky top-6">
              
              {/* Header de Insumo Activo */}
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                  <Wrench size={10} />
                  Análisis Financiero de Insumo
                </span>
                <h2 className="text-lg font-black text-slate-800 leading-tight">{activeSupplyDetails.name}</h2>
                <div className="flex gap-2 text-[10px] pt-1">
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">Ubicación: {activeSupplyDetails.location}</span>
                  {activeSupplyDetails.isCustom && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-semibold">Simulación en Memoria</span>}
                </div>
              </div>

              {/* Formulario de Configuración Rápida */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 size={12} />
                  Configurar Costos del Insumo
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Costo de compra */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Costo Compra</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-6 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <DollarSign className="absolute left-2 top-2.5 text-slate-400" size={12} />
                    </div>
                  </div>

                  {/* Tipo de costo */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de Costo</label>
                    <select
                      value={editCostType}
                      onChange={(e) => setEditCostType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="neto">Neto</option>
                      <option value="bruto">Bruto</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Porcentaje de Mano de Obra */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Mano Obra (MO %)</label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">{editLaborPercent}%</span>
                    </div>
                    <input
                      type="number"
                      value={editLaborPercent}
                      onChange={(e) => setEditLaborPercent(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Precio de Venta (Simulado o catálogado) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Precio Venta (Bruto)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-6 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <DollarSign className="absolute left-2 top-2.5 text-slate-400" size={12} />
                    </div>
                  </div>
                </div>

                {/* Acciones de guardado */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSavePartConfig}
                    className="flex-1 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save size={13} />
                    Guardar Costo
                  </button>

                  {!activeSupplyDetails.isCustom && (
                    <button
                      onClick={handleSyncPriceWithSupabase}
                      disabled={syncingPartId !== null || Number(editPrice) === activeSupplyDetails.price}
                      className={`flex-1 border text-xs font-bold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5
                        ${Number(editPrice) === activeSupplyDetails.price
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600'
                        }
                      `}
                    >
                      <RefreshCw size={13} className={syncingPartId !== null ? 'animate-spin' : ''} />
                      {syncingPartId !== null ? 'Sincronizando' : 'Subir a Supabase'}
                    </button>
                  )}
                </div>

              </div>

              {/* Tarjeta de Margen y Desglose */}
              {activeSupplyDetails.costNeto > 0 ? (
                <div className="space-y-6">
                  
                  {/* KPI de Ganancia principal */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    
                    <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">Utilidad Neta por Insumo</span>
                    <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                      ${fmt(activeSupplyDetails.profitNeto)}
                      <span className="text-xs text-slate-400 font-bold">NETO</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Porcentaje de Margen</span>
                        <span className={`font-extrabold text-base ${activeSupplyDetails.marginPercent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {activeSupplyDetails.marginPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Costo Total Neto</span>
                        <span className="font-bold text-slate-200 text-base">${fmt(activeSupplyDetails.totalCostNeto)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra Stacked Visual Animada */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distribución del Precio Final (Bruto)</span>
                    <div className="h-7 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-200">
                      {activeSupplyDetails.costPct > 0 && (
                        <div 
                          style={{ width: `${activeSupplyDetails.costPct}%` }} 
                          className="bg-slate-400/90 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1"
                          title={`Costo Insumo: ${activeSupplyDetails.costPct.toFixed(1)}%`}
                        >
                          Costo: {fmt(activeSupplyDetails.costNeto)}
                        </div>
                      )}
                      {activeSupplyDetails.laborPct > 0 && (
                        <div 
                          style={{ width: `${activeSupplyDetails.laborPct}%` }} 
                          className="bg-indigo-500/90 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                          title={`Mano Obra: ${activeSupplyDetails.laborPct.toFixed(1)}%`}
                        >
                          MO: {fmt(activeSupplyDetails.laborCost)}
                        </div>
                      )}
                      {activeSupplyDetails.taxPct > 0 && (
                        <div 
                          style={{ width: `${activeSupplyDetails.taxPct}%` }} 
                          className="bg-blue-500/90 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                          title={`IVA Venta: ${activeSupplyDetails.taxPct.toFixed(1)}%`}
                        >
                          IVA: {fmt(activeSupplyDetails.taxVenta)}
                        </div>
                      )}
                      {activeSupplyDetails.profitPct > 0 ? (
                        <div 
                          style={{ width: `${activeSupplyDetails.profitPct}%` }} 
                          className="bg-emerald-500/90 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                          title={`Ganancia Neta: ${activeSupplyDetails.profitPct.toFixed(1)}%`}
                        >
                          Ganancia: {fmt(activeSupplyDetails.profitNeto)}
                        </div>
                      ) : (
                        activeSupplyDetails.profitPct < 0 && (
                          <div 
                            style={{ width: `${Math.abs(activeSupplyDetails.profitPct)}%` }} 
                            className="bg-rose-600 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                            title={`Déficit: ${activeSupplyDetails.profitPct.toFixed(1)}%`}
                          >
                            Pérdida: {fmt(Math.abs(activeSupplyDetails.profitNeto))}
                          </div>
                        )
                      )}
                    </div>
                    
                    <div className="flex flex-wrap justify-between text-[9px] text-slate-400 font-extrabold px-1 gap-y-1">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Costo Compra: {activeSupplyDetails.costPct.toFixed(0)}%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Mano Obra: {activeSupplyDetails.laborPct.toFixed(0)}%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> IVA Venta: {activeSupplyDetails.taxPct.toFixed(0)}%</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${activeSupplyDetails.profitNeto > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> 
                        {activeSupplyDetails.profitNeto > 0 ? 'Utilidad' : 'Pérdida'}: {activeSupplyDetails.profitPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Tabla de desglose de costos detallada */}
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desglose de Caja e Impuestos</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 font-medium">Precio Venta Neto</span>
                        <span className="font-bold text-slate-800">${fmt(activeSupplyDetails.priceNeto)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 font-medium">Costo Neto Insumo</span>
                        <span className="font-bold text-slate-800">${fmt(activeSupplyDetails.costNeto)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 font-medium">Mano de Obra del Técnico ({activeSupplyDetails.laborPercent}%)</span>
                        <span className="font-bold text-indigo-600">${fmt(activeSupplyDetails.laborCost)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 font-medium">IVA Débito (Venta)</span>
                        <span className="font-bold text-slate-700">${fmt(activeSupplyDetails.taxVenta)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 font-medium">IVA Crédito (Compra)</span>
                        <span className="font-bold text-slate-700">${fmt(activeSupplyDetails.taxCompra)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                        <span className="text-blue-700 font-bold">IVA Neto a Pagar</span>
                        <span className="font-bold text-blue-700">${fmt(activeSupplyDetails.netTaxToPay)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 text-center text-slate-400">
                  <AlertCircle size={20} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-500">Sin Datos Financieros</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ingresa un costo de compra arriba para calcular y desglosar automáticamente la rentabilidad de este insumo.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
              <Info size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Selecciona un Insumo</p>
              <p className="text-xs text-slate-400 mt-1">
                Haz clic sobre cualquiera de los insumos del listado de la izquierda para ver su análisis de costos y ganancias detallado.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal de Simulación de Insumo Nuevo */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="text-blue-600 animate-spin-slow" size={20} />
                <h3 className="font-bold text-slate-900">Simular Insumo Nuevo</h3>
              </div>
              <button 
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomPart} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre del Insumo / Repuesto</label>
                <input
                  type="text"
                  placeholder="Ej: Neumático Michelin 17''"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Precio Venta (Bruto)</label>
                  <input
                    type="number"
                    placeholder="Monto"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mano Obra asignada (MO %)</label>
                  <input
                    type="number"
                    placeholder="15"
                    value={customLaborPercent}
                    onChange={(e) => setCustomLaborPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Costo Compra</label>
                  <input
                    type="number"
                    placeholder="Ej: 20000"
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de Costo</label>
                  <select
                    value={customCostType}
                    onChange={(e) => setCustomCostType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="neto">Neto</option>
                    <option value="bruto">Bruto</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors"
                >
                  Crear y Simular
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
