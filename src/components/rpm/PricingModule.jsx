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
  DollarSign,
  BookOpen,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';

export default function PricingModule() {
  const { companyId } = useNexusContext();
  
  // Pestaña principal activa: 'catalog' o 'simulator'
  const [activeTab, setActiveTab] = useState('catalog');

  // ==========================================
  // ESTADOS COMUNES / INVENTARIO (TAB 1)
  // ==========================================
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Configuraciones Globales
  const [globalTaxRate, setGlobalTaxRate] = useState(19); // 19% IVA por defecto (Chile)
  const [globalLaborPercent, setGlobalLaborPercent] = useState(15); // 15% Mano de obra base

  // Búsqueda, orden y filtros de Rentabilidad Catálogo
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [profitabilityFilter, setProfitabilityFilter] = useState('all'); // all, loss, low, medium, high
  const [sortBy, setSortBy] = useState('name'); // name, price, cost, profit, margin
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Insumo seleccionado para análisis detallado
  const [selectedPartId, setSelectedPartId] = useState(null);

  // Edición Inline de Insumo Seleccionado
  const [editCost, setEditCost] = useState('');
  const [editCostType, setEditCostType] = useState('neto'); // neto o bruto
  const [editLaborPercent, setEditLaborPercent] = useState(15);
  const [editTaxRate, setEditTaxRate] = useState(19);
  const [editPrice, setEditPrice] = useState(''); // Permite modificar el precio de venta

  // Modal para agregar insumo temporal/simulado
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [customCostType, setCustomCostType] = useState('neto');
  const [customLaborPercent, setCustomLaborPercent] = useState(15);

  const [syncingPartId, setSyncingPartId] = useState(null);

  // ==========================================
  // ESTADOS DEL SIMULADOR INDIVIDUAL (TAB 2)
  // ==========================================
  const [simSearchQuery, setSimSearchQuery] = useState('');
  const [simSearchResults, setSimSearchResults] = useState([]);
  const [simSearching, setSimSearching] = useState(false);
  const [simSelectedPart, setSimSelectedPart] = useState(null);

  const [simProductName, setSimProductName] = useState('');
  const [simCostType, setSimCostType] = useState('neto'); // 'neto' o 'bruto'
  const [simCostValue, setSimCostValue] = useState('');
  const [simMarginPercent, setSimMarginPercent] = useState(30);
  const [simMarginType, setSimMarginType] = useState('margin'); // 'markup' o 'margin'
  const [simTaxRate, setSimTaxRate] = useState(19); 
  
  const [simulationList, setSimulationList] = useState([]);
  const [savingPartId, setSavingPartId] = useState(null);

  // ==========================================
  // 1. CARGA DE CATÁLOGO (SUPABASE + LOCALSTORAGE)
  // ==========================================
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
            price: Number(part.price) || 0, // Precio de venta bruto en Supabase
            stock: Number(part.stock) || 0,
            location: part.location || 'Sin ubicación',
            isCustom: false,
            cost: config.cost !== undefined ? Number(config.cost) : 0,
            costType: config.costType || 'neto',
            laborPercent: config.laborPercent !== undefined ? Number(config.laborPercent) : globalLaborPercent,
            taxRate: config.taxRate !== undefined ? Number(config.taxRate) : globalTaxRate
          };
        });

        // Insumos puramente locales/temporales
        const localCustomKey = `nexus_rpm_supplies_custom_${companyId}`;
        const customParts = JSON.parse(localStorage.getItem(localCustomKey) || '[]');
        
        const finalParts = [...formattedParts, ...customParts.map(cp => ({ ...cp, isCustom: true }))];

        setParts(finalParts);

        // Seleccionar por defecto el primer item
        if (finalParts.length > 0 && !selectedPartId) {
          setSelectedPartId(finalParts[0].id);
        }
      } catch (err) {
        console.error("Error cargando insumos del catálogo:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [companyId, refreshTrigger]);

  // Actualizar formulario lateral del catálogo al cambiar de insumo
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

  // ==========================================
  // 2. BUSCADOR PREDICTIVO EN SIMULADOR (TAB 2)
  // ==========================================
  useEffect(() => {
    if (!companyId || simSearchQuery.trim().length < 2) {
      setSimSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setSimSearching(true);
      try {
        const { data, error } = await supabase
          .schema('garage')
          .from('garage_parts')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', `%${simSearchQuery}%`)
          .limit(6);

        if (error) throw error;
        setSimSearchResults(data || []);
      } catch (err) {
        console.error("Error buscando repuestos en simulador:", err);
      } finally {
        setSimSearching(false);
      }
    }, 400);

    return () => clearTimeout(delaySearch);
  }, [simSearchQuery, companyId]);

  // ==========================================
  // 3. OPERACIONES DE CATALOGO (TAB 1)
  // ==========================================
  const handleSavePartConfig = () => {
    if (!selectedPart || !companyId) return;

    const costNum = Number(editCost) || 0;
    const laborNum = Number(editLaborPercent) || 0;
    const taxNum = Number(editTaxRate) || 0;
    const priceNum = Number(editPrice) || 0;

    if (selectedPart.isCustom) {
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
      alert("✅ Insumo personalizado actualizado localmente.");
    } else {
      const localConfigKey = `nexus_rpm_supplies_config_${companyId}`;
      const localConfig = JSON.parse(localStorage.getItem(localConfigKey) || '{}');

      localConfig[selectedPart.id] = {
        cost: costNum,
        costType: editCostType,
        laborPercent: laborNum,
        taxRate: taxNum
      };

      localStorage.setItem(localConfigKey, JSON.stringify(localConfig));
      alert(`✅ Configuración de costos guardada para "${selectedPart.name}".`);
    }

    setRefreshTrigger(prev => prev + 1);
  };

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

      alert(`✅ ¡Sincronizado! El precio en el catálogo de Supabase para "${selectedPart.name}" se actualizó a $${priceNum.toLocaleString('es-CL')} (Bruto).`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error sincronizando precio:", err);
      alert("Error al actualizar precio en Supabase: " + err.message);
    } finally {
      setSyncingPartId(null);
    }
  };

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

    setCustomName('');
    setCustomPrice('');
    setCustomCost('');
    setShowAddCustomModal(false);

    setSelectedPartId(newCustom.id);
    setRefreshTrigger(prev => prev + 1);
    alert(`✅ Insumo simulado "${newCustom.name}" creado.`);
  };

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
    alert("✅ Configuraciones globales aplicadas.");
    setRefreshTrigger(prev => prev + 1);
  };

  // ==========================================
  // CÁLCULOS Y PROCESAMIENTO DE CATÁLOGO (TAB 1)
  // ==========================================
  const processedSupplies = useMemo(() => {
    return parts.map(part => {
      const taxRate = part.taxRate;
      const taxMultiplier = 1 + taxRate / 100;
      
      const priceBruto = part.price;
      const priceNeto = priceBruto / taxMultiplier;
      const taxVenta = priceBruto - priceNeto;

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

      let status = 'loss'; 
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

  const filteredSupplies = useMemo(() => {
    let result = processedSupplies.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(catalogSearchQuery.toLowerCase());
      
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
  }, [processedSupplies, catalogSearchQuery, profitabilityFilter, sortBy, sortOrder]);

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

  const activeSupplyDetails = useMemo(() => {
    if (!selectedPart) return null;
    const fullDetail = filteredSupplies.find(p => p.id === selectedPart.id);
    if (!fullDetail) return null;

    const pv = fullDetail.price; 
    const costPct = pv > 0 ? (fullDetail.costNeto / pv) * 100 : 0;
    const laborPct = pv > 0 ? (fullDetail.laborCost / pv) * 100 : 0;
    const taxPct = pv > 0 ? (fullDetail.taxVenta / pv) * 100 : 0;
    const profitPct = pv > 0 ? (fullDetail.profitNeto / pv) * 100 : 0;

    return {
      ...fullDetail,
      costPct,
      laborPct,
      taxPct,
      profitPct
    };
  }, [selectedPart, filteredSupplies]);

  const requestSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCatalogCSV = () => {
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

  // ==========================================
  // CÁLCULOS Y PROCESAMIENTO DE SIMULADOR (TAB 2)
  // ==========================================
  const handleSelectSimPart = (part) => {
    setSimSelectedPart(part);
    setSimProductName(part.name);
    setSimSearchResults([]);
    setSimSearchQuery('');
  };

  const simTaxMultiplier = 1 + simTaxRate / 100;
  const simCost = Number(simCostValue) || 0;
  
  let simCostNeto = 0;
  let simCostBruto = 0;

  if (simCostType === 'neto') {
    simCostNeto = simCost;
    simCostBruto = simCost * simTaxMultiplier;
  } else {
    simCostBruto = simCost;
    simCostNeto = simCost / simTaxMultiplier;
  }

  let simVentaNeto = 0;
  if (simMarginType === 'markup') {
    simVentaNeto = simCostNeto * (1 + simMarginPercent / 100);
  } else {
    const divisor = 1 - simMarginPercent / 100;
    simVentaNeto = divisor > 0 ? simCostNeto / divisor : 0;
  }

  const simUtilidadNeta = simVentaNeto - simCostNeto;
  const simVentaIva = simVentaNeto * (simTaxRate / 100);
  const simVentaBruto = simVentaNeto + simVentaIva;

  const simMargenRealEfectivo = simVentaNeto > 0 ? (simUtilidadNeta / simVentaNeto) * 100 : 0;

  const simPctCosto = simVentaBruto > 0 ? (simCostNeto / simVentaBruto) * 100 : 0;
  const simPctUtilidad = simVentaBruto > 0 ? (simUtilidadNeta / simVentaBruto) * 100 : 0;
  const simPctIva = simVentaBruto > 0 ? (simVentaIva / simVentaBruto) * 100 : 0;

  const handleAddToList = () => {
    if (!simProductName.trim() || simCost <= 0) {
      alert("Por favor ingresa un nombre y costo válido.");
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      partId: simSelectedPart?.id || null,
      name: simProductName,
      costNeto: simCostNeto,
      costBruto: simCostBruto,
      marginPercent: simMarginPercent,
      marginType: simMarginType,
      utilidadNeta: simUtilidadNeta,
      ventaNeto: simVentaNeto,
      ventaIva: simVentaIva,
      ventaBruto: simVentaBruto,
      precioVentaActual: simSelectedPart?.price || null
    };

    setSimulationList([newItem, ...simulationList]);
    
    setSimProductName('');
    setSimCostValue('');
    setSimSelectedPart(null);
  };

  const handleRemoveFromList = (id) => {
    setSimulationList(simulationList.filter(item => item.id !== id));
  };

  const handleExportSimCSV = () => {
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
      item.costNeto,
      item.costBruto,
      item.marginType === 'margin' ? 'Contribución' : 'Markup',
      `${item.marginPercent}%`,
      item.utilidadNeta,
      item.ventaNeto,
      item.ventaIva,
      item.ventaBruto
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

  const handleSyncWithSupabase = async (item) => {
    if (!item.partId) return;
    setSavingPartId(item.id);

    try {
      const { error } = await supabase
        .schema('garage')
        .from('garage_parts')
        .update({
          price: Math.round(item.ventaBruto),
        })
        .eq('id', item.partId);

      if (error) throw error;

      alert(`✅ Repuesto "${item.name}" actualizado exitosamente a $${Math.round(item.ventaBruto).toLocaleString('es-CL')} (Bruto)`);
      
      setSimulationList(prev => prev.map(sim => {
        if (sim.id === item.id) {
          return { ...sim, precioVentaActual: Math.round(item.ventaBruto) };
        }
        return sim;
      }));

      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error("Error actualizando precio:", err);
      alert("Error al actualizar precio en el inventario: " + err.message);
    } finally {
      setSavingPartId(null);
    }
  };

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

      setSimulationList(prev => prev.map(sim => {
        if (sim.id === item.id) {
          return { ...sim, partId: data.id, precioVentaActual: Math.round(item.ventaBruto) };
        }
        return sim;
      }));

      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error("Error creando repuesto:", err);
      alert("Error al guardar en el catálogo de repuestos: " + err.message);
    } finally {
      setSavingPartId(null);
    }
  };

  const fmt = (num) => Math.round(num || 0).toLocaleString('es-CL');

  // ==========================================
  // LOADER GENERAL
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center flex-col gap-4 text-slate-600">
        <div className="w-10 h-10 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold animate-pulse">Cargando catálogo e inicializando motores financieros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-xl gap-2 max-w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-[#0f172a] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Wrench size={16} />
          Rentabilidad de Catálogo
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
          Fijador y Simulador de Precios
        </button>
      </div>

      {/* PESTAÑA: RENTABILIDAD DEL CATÁLOGO */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* KPIs de Rentabilidad */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Insumos Analizados</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalCount}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Wrench size={22} />
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

          {/* Banner Educativo Principal */}
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
            <BookOpen className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-slate-800 text-sm">¿Cómo se calcula la rentabilidad en RPM?</h4>
              <p className="text-xs text-slate-650 leading-relaxed">
                A diferencia de los cálculos simples de compra/venta, en este módulo calculamos el <strong>Margen de Contribución Neto Real</strong> del taller. Para ello, del precio de venta bruto del repuesto descontamos el <strong>IVA de venta (19%)</strong> y la <strong>Mano de Obra asignada (MO)</strong> que cobras al cliente (comisión del mecánico). Así obtienes la utilidad que de verdad ingresa a tu flujo de caja.
              </p>
            </div>
          </div>

          {/* Filtros e Inicialización */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">IVA por Defecto:</span>
                <input
                  type="number"
                  value={globalTaxRate}
                  onChange={(e) => setGlobalTaxRate(Number(e.target.value))}
                  className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs font-bold text-slate-400">%</span>
              </div>

              <div className="flex items-center gap-1.5">
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
                className="text-xs font-bold text-blue-605 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title="Aplica la configuración de IVA y Mano de Obra a todos los insumos que no tengan configurado un costo"
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
                onClick={handleExportCatalogCSV}
                className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Grilla Principal del Catálogo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Tabla izquierda */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar insumos del taller..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pl-9 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                  />
                  <Search className="absolute left-3 top-3 text-slate-400" size={15} />
                </div>

                <div className="flex gap-2">
                  <select
                    value={profitabilityFilter}
                    onChange={(e) => setProfitabilityFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  >
                    <option value="all">Filtrar por Rentabilidad</option>
                    <option value="high">Excelente Margen ({'>'}40%)</option>
                    <option value="medium">Margen Saludable (20-40%)</option>
                    <option value="low">Margen Bajo (1-20%)</option>
                    <option value="loss">En Pérdida (0% o menos)</option>
                  </select>
                </div>
              </div>

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
                          No se encontraron insumos con los filtros aplicados.
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
                                  Sin Costo
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {item.isCustom && (
                                  <button
                                    onClick={() => handleDeleteCustomPart(item.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                    title="Eliminar insumo simulado"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
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

            {/* Panel de detalle y edición inline (derecha) */}
            <div className="lg:col-span-5 space-y-6">
              {activeSupplyDetails ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6 sticky top-6">
                  
                  <div className="border-b border-slate-100 pb-4 space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                      <Wrench size={10} />
                      Análisis Financiero de Insumo
                    </span>
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{activeSupplyDetails.name}</h2>
                    <div className="flex gap-2 text-[10px] pt-1">
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">Ubicación: {activeSupplyDetails.location}</span>
                      {activeSupplyDetails.isCustom && <span className="bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-md font-semibold">Simulado</span>}
                    </div>
                  </div>

                  {/* Formulario rápido de costos */}
                  <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit2 size={12} />
                      Configurar Costos del Insumo
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Costo Compra</label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Ingresa costo"
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-6 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <DollarSign className="absolute left-2 top-2.5 text-slate-400" size={12} />
                        </div>
                      </div>

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
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Mano de Obra (MO %)</label>
                          <span className="text-[10px] font-bold text-blue-605 bg-blue-50 px-1.5 py-0.2 rounded">{editLaborPercent}%</span>
                        </div>
                        <input
                          type="number"
                          value={editLaborPercent}
                          onChange={(e) => setEditLaborPercent(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          title="Porcentaje del precio neto de venta pagado al mecánico como comisión."
                        />
                      </div>

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
                              : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 shadow-sm'
                            }
                          `}
                        >
                          <RefreshCw size={13} className={syncingPartId !== null ? 'animate-spin' : ''} />
                          {syncingPartId !== null ? 'Sincronizando' : 'Subir a Catálogo'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resultados Detallados */}
                  {activeSupplyDetails.costNeto > 0 ? (
                    <div className="space-y-6">
                      
                      {/* Utilidad Neta de Insumo */}
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

                      {/* Barra de distribución stacked */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distribución del Precio Final (Bruto)</span>
                        <div className="h-7 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-200 bg-slate-100">
                          {activeSupplyDetails.costPct > 0 && (
                            <div 
                              style={{ width: `${activeSupplyDetails.costPct}%` }} 
                              className="bg-slate-400/90 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1"
                              title={`Costo Insumo Neto: ${activeSupplyDetails.costPct.toFixed(1)}%`}
                            >
                              Costo: {fmt(activeSupplyDetails.costNeto)}
                            </div>
                          )}
                          {activeSupplyDetails.laborPct > 0 && (
                            <div 
                              style={{ width: `${activeSupplyDetails.laborPct}%` }} 
                              className="bg-indigo-500/95 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                              title={`Mano Obra: ${activeSupplyDetails.laborPct.toFixed(1)}%`}
                            >
                              MO: {fmt(activeSupplyDetails.laborCost)}
                            </div>
                          )}
                          {activeSupplyDetails.taxPct > 0 && (
                            <div 
                              style={{ width: `${activeSupplyDetails.taxPct}%` }} 
                              className="bg-blue-500/95 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                              title={`IVA Venta: ${activeSupplyDetails.taxPct.toFixed(1)}%`}
                            >
                              IVA: {fmt(activeSupplyDetails.taxVenta)}
                            </div>
                          )}
                          {activeSupplyDetails.profitPct > 0 ? (
                            <div 
                              style={{ width: `${activeSupplyDetails.profitPct}%` }} 
                              className="bg-emerald-500/95 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
                              title={`Ganancia Neta: ${activeSupplyDetails.profitPct.toFixed(1)}%`}
                            >
                              Ganancia: {fmt(activeSupplyDetails.profitNeto)}
                            </div>
                          ) : (
                            activeSupplyDetails.profitPct < 0 && (
                              <div 
                                style={{ width: `${Math.abs(activeSupplyDetails.profitPct)}%` }} 
                                className="bg-rose-650 hover:opacity-90 transition-all flex items-center justify-center text-[9px] text-white font-bold truncate px-1 border-l border-white/20"
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

                      {/* Desglose de Caja */}
                      <div className="space-y-2.5 pt-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desglose de Caja e Impuestos</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 font-medium">Precio Venta Neto</span>
                            <span className="font-bold text-slate-800">${fmt(activeSupplyDetails.priceNeto)}</span>
                          </div>

                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 font-medium">Costo Neto Insumo</span>
                            <span className="font-bold text-slate-800">${fmt(activeSupplyDetails.costNeto)}</span>
                          </div>

                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 font-medium">Mano de Obra Técnico ({activeSupplyDetails.laborPercent}%)</span>
                            <span className="font-bold text-indigo-650">${fmt(activeSupplyDetails.laborCost)}</span>
                          </div>

                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 font-medium">IVA Débito (Venta)</span>
                            <span className="font-bold text-slate-750">${fmt(activeSupplyDetails.taxVenta)}</span>
                          </div>

                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 font-medium">IVA Crédito (Compra)</span>
                            <span className="font-bold text-slate-750">${fmt(activeSupplyDetails.taxCompra)}</span>
                          </div>

                          <div className="flex justify-between items-center p-2 bg-blue-50/50 border border-blue-105 rounded-lg">
                            <span className="text-blue-700 font-bold">IVA Neto a Pago Estimado</span>
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
                    Haz clic sobre cualquier insumo del listado de la izquierda para ver su análisis de costos y ganancias detallado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: FIJADOR Y SIMULADOR DE PRECIOS */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Banner educativo */}
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
            <BookOpen className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-slate-800 text-sm">¿Margen de Contribución o Markup?</h4>
              <p className="text-xs text-slate-650 leading-relaxed">
                En el simulador puedes escoger dos formas distintas de fijar precios. La fórmula de <strong>Margen (Sobre Venta)</strong> calcula el precio final dividiendo el costo por `(1 - margen%)` asegurándote que el porcentaje seleccionado represente tu utilidad real. El <strong>Markup (Sobre Costo)</strong> simplemente multiplica el costo por `(1 + margen%)`; esto es intuitivo pero genera una utilidad real sobre la venta menor. Te aconsejamos usar **Margen (Sobre Venta)** para resguardar la caja.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Formulario simulador */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800">Parámetros del Producto a Simular</h2>
                  {simSelectedPart && (
                    <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-blue-100">
                      <RefreshCw size={12} className="animate-spin-slow" />
                      Repuesto de Inventario
                    </span>
                  )}
                </div>

                {/* Buscador predictivo */}
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Buscar en Catálogo de Repuestos (Opcional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Busca un repuesto existente para auto-completar..."
                      value={simSearchQuery}
                      onChange={(e) => setSimSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                    />
                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                    {simSearching && (
                      <div className="absolute right-3.5 top-3.5">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {simSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {simSearchResults.map(part => (
                        <button
                          key={part.id}
                          onClick={() => handleSelectSimPart(part)}
                          className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center text-sm"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{part.name}</p>
                            <p className="text-xs text-slate-400">Stock: {part.stock} unidades</p>
                          </div>
                          <span className="font-bold text-slate-655">${fmt(part.price)} (Precio Actual)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parámetros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nombre del Producto / Repuesto</label>
                    <input
                      type="text"
                      placeholder="Ej: Amortiguador Trasero"
                      value={simProductName}
                      onChange={(e) => setSimProductName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Costo de Compra</label>
                      <input
                        type="number"
                        placeholder="Costo"
                        value={simCostValue}
                        onChange={(e) => setSimCostValue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo</label>
                      <select
                        value={simCostType}
                        onChange={(e) => setSimCostType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      >
                        <option value="neto">Neto</option>
                        <option value="bruto">Bruto</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Slider de Margen */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Margen Deseado</label>
                        <span className="text-sm font-bold text-blue-650 bg-blue-50 px-2.5 py-0.5 rounded-lg">{simMarginPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={simMarginPercent}
                        onChange={(e) => setSimMarginPercent(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="w-full md:w-auto">
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fórmula de Margen</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setSimMarginType('margin')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${simMarginType === 'margin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Margen (Sobre Venta)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimMarginType('markup')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${simMarginType === 'markup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Markup (Sobre Costo)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-550 leading-normal font-medium">
                      {simMarginType === 'margin' 
                        ? <span><strong>Margen sobre Venta:</strong> Divide el costo neto por `(1 - {simMarginPercent}%)`. El {simMarginPercent}% del precio neto final cobrado será tu ganancia neta.</span>
                        : <span><strong>Markup sobre Costo:</strong> Multiplica el costo neto directamente por `{1 + simMarginPercent/100}`. Tu ganancia neta real representará un {((simVentaNeto - simCostNeto) / (simVentaNeto || 1) * 100).toFixed(0)}% del precio cobrado al cliente.</span>
                      }
                    </p>
                  </div>
                </div>

                {/* Tasa de impuesto e inserción */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-0.5">Impuesto (IVA)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={simTaxRate}
                          onChange={(e) => setSimTaxRate(Number(e.target.value))}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-sm font-semibold text-slate-700"
                        />
                        <span className="text-sm font-bold text-slate-500">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    {simSelectedPart && (
                      <button
                        onClick={() => {
                          setSimSelectedPart(null);
                          setSimProductName('');
                          setSimCostValue('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-5 py-3 rounded-xl font-bold text-sm transition-colors border border-slate-200"
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

            {/* Panel de desglose simulador */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 sticky top-8">
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-2">
                  <Percent className="text-emerald-500" size={20} />
                  Desglose de Simulación
                </h2>

                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Precio Sugerido Venta</span>
                  <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                    ${fmt(simVentaBruto)}
                    <span className="text-xs text-slate-400 font-bold">IVA INC.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs block">Valor Neto</span>
                      <span className="font-bold text-white text-base">${fmt(simVentaNeto)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Utilidad Neto</span>
                      <span className="font-bold text-emerald-400 text-base">+ ${fmt(simUtilidadNeta)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-medium">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">Costo de Compra Neto</span>
                    <span className="font-bold text-slate-855">${fmt(simCostNeto)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">IVA Crédito Compra ({simTaxRate}%)</span>
                    <span className="font-bold text-slate-705">${fmt(simCostBruto - simCostNeto)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border-l-4 border-emerald-500">
                    <span className="text-slate-600 font-bold">Ganancia Neta</span>
                    <span className="font-bold text-emerald-600">${fmt(simUtilidadNeta)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">IVA Débito Venta ({simTaxRate}%)</span>
                    <span className="font-bold text-slate-705">${fmt(simVentaIva)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-blue-700 font-bold">Margen Real Obtenido</span>
                    <span className="font-bold text-blue-700">{simMargenRealEfectivo.toFixed(1)}%</span>
                  </div>
                </div>

                {simVentaBruto > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Distribución del Precio Final</span>
                    <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner border border-slate-200 bg-slate-100">
                      <div 
                        style={{ width: `${simPctCosto}%` }} 
                        className="bg-slate-400 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                        title={`Costo: ${simPctCosto.toFixed(1)}%`}
                      >
                        {simPctCosto > 15 && 'Costo'}
                      </div>
                      <div 
                        style={{ width: `${simPctUtilidad}%` }} 
                        className="bg-emerald-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                        title={`Utilidad: ${simPctUtilidad.toFixed(1)}%`}
                      >
                        {simPctUtilidad > 15 && 'Ganancia'}
                      </div>
                      <div 
                        style={{ width: `${simPctIva}%` }} 
                        className="bg-blue-500 hover:opacity-90 transition-opacity flex items-center justify-center text-[10px] text-white font-bold"
                        title={`IVA: ${simPctIva.toFixed(1)}%`}
                      >
                        {simPctIva > 15 && 'IVA'}
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-extrabold px-1">
                      <span>Costo: {simPctCosto.toFixed(0)}%</span>
                      <span>Ganancia: {simPctUtilidad.toFixed(0)}%</span>
                      <span>IVA: {simPctIva.toFixed(0)}%</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* Tabla de Simulación en Lote */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Tabla de Simulación en Lote</h2>
                <p className="text-slate-400 text-xs mt-0.5">Analiza y compara múltiples productos simulados antes de insertarlos en el catálogo.</p>
              </div>
              {simulationList.length > 0 && (
                <button
                  onClick={handleExportSimCSV}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm font-semibold transition-colors"
                >
                  <Download size={16} />
                  Exportar CSV
                </button>
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
                        No hay productos agregados en el lote de simulación. Completa el formulario de arriba para simular.
                      </td>
                    </tr>
                  ) : (
                    simulationList.map(item => {
                      const isSyncing = savingPartId === item.id;
                      const isNewPart = !item.partId;
                      const currentPrice = item.precioVentaActual;
                      const diff = currentPrice ? Math.round(item.ventaBruto) - currentPrice : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{item.name}</td>
                          <td className="p-4 text-right text-slate-650">${fmt(item.costNeto)}</td>
                          <td className="p-4 text-right font-medium text-blue-600 bg-blue-50/10">
                            {item.marginPercent}% <span className="text-[10px] text-slate-400">({item.marginType === 'margin' ? 'Margen' : 'Markup'})</span>
                          </td>
                          <td className="p-4 text-right text-emerald-600 font-semibold">+${fmt(item.utilidadNeta)}</td>
                          <td className="p-4 text-right text-slate-650">${fmt(item.ventaNeto)}</td>
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
                              <span className="text-slate-405 italic text-xs">No registrado</span>
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
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-650 border-emerald-250'
                                  }
                                `}
                              >
                                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                {diff === 0 ? 'Sincronizado' : 'Actualizar Catálogo'}
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
      )}

      {/* MODAL DE SIMULACIÓN DE INSUMO NUEVO EN CATÁLOGO */}
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
                  placeholder="Ej: Aceite Sintético 5W30 Mobil 1"
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
                    placeholder="Ej: 45000"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none animate-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mano Obra base (MO %)</label>
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
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs py-2.5 rounded-xl transition-colors border border-slate-200"
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
