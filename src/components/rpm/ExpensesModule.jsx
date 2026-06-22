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
  Edit2,
  Building2,
  Receipt,
  CheckCircle2,
  Clock,
  UserPlus,
  X,
  Search,
  Mail,
  Phone,
  BarChart3
} from 'lucide-react';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';
import ConfirmModal from './ConfirmModal';
import ExpensesReport from './ExpensesReport';

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
  const { data: { expenses, allExpenses }, addExpense, deleteExpense, updateExpense, loading } = useNexusRPM();
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
  
  // Estado para la pestaña activa principal y la sub-pestaña de gastos
  const [activeTab, setActiveTab] = useState('gastos'); // 'gastos', 'payable', 'proveedores'
  const [expensesSubTab, setExpensesSubTab] = useState('OPEX'); // 'OPEX' o 'CAPEX'

  // --- NUEVOS ESTADOS DE CUENTAS POR PAGAR Y PROVEEDORES ---
  const [suppliers, setSuppliers] = useState([]);
  const [expenseDetails, setExpenseDetails] = useState({});
  
  // Modal de proveedores
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    nombre: '',
    rut: '',
    plazoPagoDias: 30,
    contactoMail: '',
    contactoFono: ''
  });

  // Buscadores
  const [searchInvoice, setSearchInvoice] = useState('');

  // ── Estado del modal de confirmación (reemplaza window.confirm) ──
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Confirmar',
    onConfirm: null,
  });
  const openConfirm = ({ title, message, variant = 'warning', confirmText = 'Confirmar', onConfirm }) => {
    setConfirmModal({ isOpen: true, title, message, variant, confirmText, onConfirm });
  };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));


  // Formulario de creación: Modo Factura
  const [isFacturaProveedor, setIsFacturaProveedor] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaVencimientoFactura, setFechaVencimientoFactura] = useState('');
  // Día de vencimiento para gastos fijos (1-31)
  const [diaVencimientoFijo, setDiaVencimientoFijo] = useState('');

  // Control de estado de pago para egresos simples (no facturas)
  const [estadoPagoSimple, setEstadoPagoSimple] = useState('Pagado');
  const [fechaVencimientoSimple, setFechaVencimientoSimple] = useState(new Date().toISOString().split('T')[0]);
  const [fechaPagoRealSimple, setFechaPagoRealSimple] = useState(new Date().toISOString().split('T')[0]);


  // Helper para sumar días a una fecha
  const addDays = (dateStr, days) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + Number(days));
    return date.toISOString().split('T')[0];
  };

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
    // Usar la fecha provista o la correspondiente según sea factura o gasto simple
    const startFecha = fechaVal || (isFacturaProveedor ? fechaVencimientoFactura : fecha);

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
          fecha: addMonths(startFecha, i)
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
          fecha: startFecha
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
            fecha: addMonths(startFecha, i)
          });
        }
        
        if (resto > 0) {
          list.push({
            id: `cuota-${cantidadCuotasEnteras}-${Date.now()}-${Math.random()}`,
            numero: cantidadCuotasEnteras + 1,
            monto: resto,
            fecha: addMonths(startFecha, cantidadCuotasEnteras)
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

  // Calcular fecha de vencimiento de factura automáticamente cuando cambia el proveedor o la fecha
  useEffect(() => {
    if (!selectedSupplierId || !fecha) return;
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    if (selectedSupplier) {
      const computedVenc = addDays(fecha, selectedSupplier.plazoPagoDias);
      setFechaVencimientoFactura(computedVenc);
      if (isCuotasEnabled) {
        regenerateCuotasList(monto, computedVenc, numCuotas, tipoCalculoCuotas, montoFijoCuota);
      }
    }
  }, [selectedSupplierId, fecha, suppliers]);

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
    
    // Si corresponde a una factura de proveedor, precargar datos de factura
    const detail = expenseDetails[exp.id];
    if (detail && detail.numeroFactura) {
      setIsFacturaProveedor(true);
      setSelectedSupplierId(detail.supplierId);
      // Remover sufijo de cuota del número de factura para edición limpia
      const cleanNumFactura = detail.numeroFactura.replace(/-C\d+$/, '');
      setNumeroFactura(cleanNumFactura);
      setFechaVencimientoFactura(detail.fechaVencimiento);

      setEstadoPagoSimple('Pagado');
      setFechaVencimientoSimple(exp.fecha);
      setFechaPagoRealSimple(exp.fecha);
      setDiaVencimientoFijo('');
    } else {
      setIsFacturaProveedor(false);
      setSelectedSupplierId('');
      setNumeroFactura('');
      setFechaVencimientoFactura('');
      
      // Si es un egreso simple, precargar metadatos si existen
      if (detail) {
        setEstadoPagoSimple(detail.estadoPago || 'Pagado');
        setFechaVencimientoSimple(detail.fechaVencimiento || exp.fecha);
        setFechaPagoRealSimple(detail.fechaPagoReal || exp.fecha);
        setDiaVencimientoFijo(detail.diaVencimiento || '');
      } else {
        setEstadoPagoSimple('Pagado');
        setFechaVencimientoSimple(exp.fecha);
        setFechaPagoRealSimple(exp.fecha);
        setDiaVencimientoFijo('');
      }
    }

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
    setIsFacturaProveedor(false);
    setSelectedSupplierId('');
    setNumeroFactura('');
    setFechaVencimientoFactura('');
    setDiaVencimientoFijo('');
    setEstadoPagoSimple('Pagado');
    setFechaVencimientoSimple(new Date().toISOString().split('T')[0]);
    setFechaPagoRealSimple(new Date().toISOString().split('T')[0]);
  };

  // Cargar Proveedores, Detalles de Facturas y Categorías desde LocalStorage al iniciar o cambiar de empresa
  useEffect(() => {
    if (!companyId) return;
    const suppliersKey = `nexus_rpm_suppliers_${companyId}`;
    const detailsKey = `nexus_rpm_expense_details_${companyId}`;
    const opexKey = `nexus_rpm_custom_opex_${companyId}`;
    const capexKey = `nexus_rpm_custom_capex_${companyId}`;
    
    setSuppliers(JSON.parse(localStorage.getItem(suppliersKey) || '[]'));
    setExpenseDetails(JSON.parse(localStorage.getItem(detailsKey) || '{}'));
    setCustomOpexCategories(JSON.parse(localStorage.getItem(opexKey) || '[]'));
    setCustomCapexCategories(JSON.parse(localStorage.getItem(capexKey) || '[]'));
  }, [companyId]);


  // Listas de categorías combinadas
  const opexCategories = [...DEFAULT_OPEX_CATEGORIES, ...customOpexCategories];
  const capexCategories = [...DEFAULT_CAPEX_CATEGORIES, ...customCapexCategories];

  // --- useMemo DE CUENTAS POR PAGAR Y PROVEEDORES ---
  const invoices = React.useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    const list = [];
    const expensesList = allExpenses || [];
    
    // Identificar qué egresos ya están como facturas para evitar duplicar
    const facturasAgregadasIds = new Set();

    // 1. Facturas de proveedor (con expenseDetails y número de factura)
    expensesList.forEach(exp => {
      const detail = expenseDetails[exp.id];
      if (detail && detail.numeroFactura) {
        facturasAgregadasIds.add(exp.id);
        const supplier = suppliers.find(s => s.id === detail.supplierId);
        list.push({
          ...exp,
          detail,
          tipoEntrada: 'factura',
          supplierName: supplier ? supplier.nombre : 'Proveedor Desconocido',
          supplierRut: supplier ? supplier.rut : '',
          numeroFactura: detail.numeroFactura,
          fechaVencimiento: detail.fechaVencimiento,
          estadoPago: detail.estadoPago || 'Pendiente',
          fechaPagoReal: detail.fechaPagoReal
        });
      }
    });

    // 2. Gastos Fijos (del mes activo selectedYear-selectedMonth)
    // Se listan todos los gastos fijos. Si no tienen diaVencimiento configurado,
    // se toma por defecto el día de su fecha original de registro.
    expensesList.forEach(exp => {
      if (exp.tipo !== 'Fijo') return;
      if (facturasAgregadasIds.has(exp.id)) return;

      const detail = expenseDetails[exp.id];
      
      // Obtener día de vencimiento por defecto desde la fecha original de registro
      const expDate = new Date(exp.fecha + 'T00:00:00');
      let dia = expDate.getDate();
      if (detail && detail.diaVencimiento) {
        dia = Number(detail.diaVencimiento);
      }

      const vencYear = selectedYear;
      const vencMonth = selectedMonth;
      const daysInMonth = new Date(vencYear, vencMonth + 1, 0).getDate();
      const diaReal = Math.min(dia, daysInMonth);
      const fechaVenc = `${vencYear}-${String(vencMonth + 1).padStart(2,'0')}-${String(diaReal).padStart(2,'0')}`;

      const estado = detail?.estadoPago?.[`${vencYear}-${vencMonth}`] || 'Pendiente';
      const pagoReal = detail?.fechaPagoReal?.[`${vencYear}-${vencMonth}`] || null;

      list.push({
        ...exp,
        detail: detail || {},
        tipoEntrada: 'fijo',
        supplierName: exp.categoria,
        supplierRut: '',
        numeroFactura: `Fijo-${exp.id.slice(-4)}`,
        fechaVencimiento: fechaVenc,
        estadoPago: estado,
        fechaPagoReal: pagoReal,
        esFijo: true,
      });
    });

    // 3. Gastos Variables Simples (que no son facturas)
    expensesList.forEach(exp => {
      if (exp.tipo !== 'Variable') return;
      if (facturasAgregadasIds.has(exp.id)) return;

      const detail = expenseDetails[exp.id];
      const estado = detail?.estadoPago || 'Pagado';
      const vencimiento = detail?.fechaVencimiento || exp.fecha;
      const pagoReal = estado === 'Pagado' ? (detail?.fechaPagoReal || exp.fecha) : null;

      // Mostrar el gasto variable en Cuentas por Pagar si:
      // - Está Pendiente de pago.
      // - Si está Pagado, solo si su fecha de registro o pago real cae en el mes activo.
      const expDate = new Date(exp.fecha + 'T00:00:00');
      const esMesActivo = expDate.getFullYear() === selectedYear && expDate.getMonth() === selectedMonth;
      const pagoRealDate = pagoReal ? new Date(pagoReal + 'T00:00:00') : null;
      const esMesPagoActivo = pagoRealDate && pagoRealDate.getFullYear() === selectedYear && pagoRealDate.getMonth() === selectedMonth;

      if (estado === 'Pendiente' || esMesActivo || esMesPagoActivo) {
        list.push({
          ...exp,
          detail: detail || {},
          tipoEntrada: 'variable',
          supplierName: exp.categoria,
          supplierRut: '',
          numeroFactura: 'S/N (Simple)',
          fechaVencimiento: vencimiento,
          estadoPago: estado,
          fechaPagoReal: pagoReal,
          esVariableSimple: true,
        });
      }
    });

    return list.sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  }, [allExpenses, expenseDetails, suppliers, selectedMonth, selectedYear]);

  const filteredInvoices = React.useMemo(() => {
    const q = searchInvoice.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(inv => 
      inv.supplierName.toLowerCase().includes(q) ||
      inv.numeroFactura.toLowerCase().includes(q) ||
      inv.categoria.toLowerCase().includes(q)
    );
  }, [invoices, searchInvoice]);

  const filteredSuppliers = React.useMemo(() => {
    const q = searchSupplier.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(s => 
      s.nombre.toLowerCase().includes(q) ||
      s.rut.toLowerCase().includes(q) ||
      (s.contactoMail && s.contactoMail.toLowerCase().includes(q))
    );
  }, [suppliers, searchSupplier]);

  const kpis = React.useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    const hoy = new Date(hoyStr + 'T00:00:00');
    
    let totalPendiente = 0;
    let vencido = 0;
    let vence7dias = 0;
    let vence30dias = 0;

    invoices.forEach(inv => {
      if (inv.estadoPago === 'Pendiente') {
        const monto = Number(inv.monto);
        totalPendiente += monto;

        const venc = new Date(inv.fechaVencimiento + 'T00:00:00');
        const diffTime = venc - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          vencido += monto;
        } else if (diffDays <= 7) {
          vence7dias += monto;
        } else if (diffDays <= 30) {
          vence30dias += monto;
        }
      }
    });

    return { totalPendiente, vencido, vence7dias, vence30dias };
  }, [invoices]);


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

    if (isFacturaProveedor && (!selectedSupplierId || !numeroFactura.trim())) {
      alert("Por favor selecciona un proveedor e ingresa el número de factura.");
      return;
    }
    
    setSaving(true);
    
    try {
      if (editingExpense) {
        // Modo Edición
        const result = await updateExpense(editingExpense.id, {
          tipo: isFacturaProveedor ? 'Variable' : recurrencia,
          categoria: finalCategoria,
          monto: Number(monto),
          fecha,
          aplica_credito_iva: aplicaCreditoIva
        });
        
        if (result.error) throw result.error;

        // Si es factura, actualizar metadatos locales
        const detailsKey = `nexus_rpm_expense_details_${companyId}`;
        if (isFacturaProveedor) {
          const updatedDetails = {
            ...expenseDetails,
            [editingExpense.id]: {
              supplierId: selectedSupplierId,
              numeroFactura: numeroFactura.trim(),
              fechaVencimiento: fechaVencimientoFactura || addDays(fecha, 30),
              estadoPago: expenseDetails[editingExpense.id]?.estadoPago || 'Pendiente',
              fechaPagoReal: expenseDetails[editingExpense.id]?.fechaPagoReal || null
            }
          };
          setExpenseDetails(updatedDetails);
          localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));
        } else {
          // Guardar metadatos de egreso simple
          const updatedDetails = { ...expenseDetails };
          
          if (recurrencia === 'Fijo') {
            const prevDetail = expenseDetails[editingExpense.id] || {};
            updatedDetails[editingExpense.id] = {
              diaVencimiento: diaVencimientoFijo || '',
              estadoPago: prevDetail.estadoPago || {},
              fechaPagoReal: prevDetail.fechaPagoReal || {}
            };
          } else {
            // Variable simple
            updatedDetails[editingExpense.id] = {
              estadoPago: estadoPagoSimple,
              fechaVencimiento: fechaVencimientoSimple || fecha,
              fechaPagoReal: estadoPagoSimple === 'Pagado' ? (fechaPagoRealSimple || fecha) : null
            };
          }
          
          setExpenseDetails(updatedDetails);
          localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));
        }
        
        setEditingExpense(null);
      } else if (isFacturaProveedor) {
        // Modo Registro de Factura de Proveedor
        const detailsKey = `nexus_rpm_expense_details_${companyId}`;
        let tempDetails = { ...expenseDetails };

        if (isCuotasEnabled && cuotasList.length > 0) {
          // Factura en Cuotas
          for (const c of cuotasList) {
            const result = await addExpense({
              tipo: 'Variable',
              categoria: `${finalCategoria} (Cuota ${c.numero}/${cuotasList.length})`,
              monto: Number(c.monto),
              fecha: c.fecha, // Fecha de la cuota diferida
              aplica_credito_iva: aplicaCreditoIva
            });
            if (result.error) throw result.error;

            const createdExpense = result.data;
            tempDetails[createdExpense.id] = {
              supplierId: selectedSupplierId,
              numeroFactura: `${numeroFactura.trim()}-C${c.numero}`,
              fechaVencimiento: c.fecha,
              estadoPago: 'Pendiente',
              fechaPagoReal: null
            };
          }
        } else {
          // Factura Única
          const result = await addExpense({
            tipo: 'Variable',
            categoria: finalCategoria,
            monto: Number(monto),
            fecha,
            aplica_credito_iva: aplicaCreditoIva
          });
          if (result.error) throw result.error;

          const createdExpense = result.data;
          tempDetails[createdExpense.id] = {
            supplierId: selectedSupplierId,
            numeroFactura: numeroFactura.trim(),
            fechaVencimiento: fechaVencimientoFactura || addDays(fecha, 30),
            estadoPago: 'Pendiente',
            fechaPagoReal: null
          };
        }

        // Guardar acumulado en localStorage
        setExpenseDetails(tempDetails);
        localStorage.setItem(detailsKey, JSON.stringify(tempDetails));
      } else if (isCuotasEnabled && cuotasList.length > 0) {
        // Modo Registro por Cuotas Egreso Simple
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

        const detailsKey = `nexus_rpm_expense_details_${companyId}`;
        
        if (recurrencia === 'Fijo') {
          const updatedDetails = {
            ...expenseDetails,
            [result.data.id]: {
              diaVencimiento: diaVencimientoFijo || '',
              estadoPago: {},     // clave = 'YYYY-M' por mes
              fechaPagoReal: {}   // clave = 'YYYY-M'
            }
          };
          setExpenseDetails(updatedDetails);
          localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));
        } else {
          // Gasto Variable Simple
          const updatedDetails = {
            ...expenseDetails,
            [result.data.id]: {
              estadoPago: estadoPagoSimple,
              fechaVencimiento: fechaVencimientoSimple || fecha,
              fechaPagoReal: estadoPagoSimple === 'Pagado' ? (fechaPagoRealSimple || fecha) : null
            }
          };
          setExpenseDetails(updatedDetails);
          localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));
        }
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
      setIsFacturaProveedor(false);
      setSelectedSupplierId('');
      setNumeroFactura('');
      setFechaVencimientoFactura('');
      setDiaVencimientoFijo('');
    } catch (err) {
      console.error(err);
      alert("Error al guardar egreso: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // --- HANDLERS PARA PROVEEDORES ---
  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!newSupplier.nombre.trim()) return;

    const suppliersKey = `nexus_rpm_suppliers_${companyId}`;
    let updatedSuppliers;

    if (editingSupplier) {
      updatedSuppliers = suppliers.map(s => s.id === editingSupplier.id ? { ...newSupplier, id: editingSupplier.id } : s);
      setEditingSupplier(null);
    } else {
      const id = `prov-${Date.now()}`;
      updatedSuppliers = [...suppliers, { ...newSupplier, id }];
    }
    
    setSuppliers(updatedSuppliers);
    localStorage.setItem(suppliersKey, JSON.stringify(updatedSuppliers));
    
    // Resetear formulario
    setNewSupplier({
      nombre: '',
      rut: '',
      plazoPagoDias: 30,
      contactoMail: '',
      contactoFono: ''
    });
    setShowSupplierModal(false);
  };

  const handleDeleteSupplier = (id) => {
    const selected = suppliers.find(s => s.id === id);
    if (!selected) return;

    // Verificar si el proveedor tiene facturas asociadas en el sistema global
    const tieneFacturas = allExpenses.some(exp => expenseDetails[exp.id]?.supplierId === id);
    if (tieneFacturas) {
      alert(`No se puede eliminar al proveedor "${selected.nombre}" porque tiene facturas asociadas en el sistema.`);
      return;
    }

    openConfirm({
      title: 'Eliminar Proveedor',
      message: `¿Estás seguro de que deseas eliminar al proveedor "${selected.nombre}"?\nEsta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      onConfirm: () => {
        const suppliersKey = `nexus_rpm_suppliers_${companyId}`;
        const updated = suppliers.filter(s => s.id !== id);
        setSuppliers(updated);
        localStorage.setItem(suppliersKey, JSON.stringify(updated));
        closeConfirm();
      },
    });
  };

  // --- HANDLER PARA REGISTRAR PAGO DE FACTURA ---
  const handleRegisterPayment = async (expId, esFijo = false) => {
    const detail = expenseDetails[expId] || {};

    const mesKey = `${selectedYear}-${selectedMonth}`;

    openConfirm({
      title: esFijo ? 'Registrar Pago de Gasto Fijo' : 'Registrar Pago de Factura',
      message: esFijo
        ? `¿Confirmas el pago de este gasto fijo para ${new Date(selectedYear, selectedMonth).toLocaleString('es-CL', { month: 'long', year: 'numeric' })}?`
        : '¿Confirmas que deseas registrar el pago de esta factura hoy?\nSe marcará como Pagada con la fecha de hoy.',
      variant: 'success',
      confirmText: 'Sí, registrar pago',
      onConfirm: async () => {
        const detailsKey = `nexus_rpm_expense_details_${companyId}`;
        let updatedDetail;
        if (esFijo) {
          // Para gastos fijos: registrar por mes
          updatedDetail = {
            ...detail,
            estadoPago: { ...(detail.estadoPago || {}), [mesKey]: 'Pagado' },
            fechaPagoReal: { ...(detail.fechaPagoReal || {}), [mesKey]: new Date().toISOString().split('T')[0] }
          };
        } else {
          updatedDetail = {
            ...detail,
            estadoPago: 'Pagado',
            fechaPagoReal: new Date().toISOString().split('T')[0]
          };
        }
        const updatedDetails = { ...expenseDetails, [expId]: updatedDetail };
        setExpenseDetails(updatedDetails);
        localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));
        closeConfirm();
      },
    });
  };

  const handleDelete = async (exp) => {
    const inherited = isInherited(exp);
    const hasDetails = !!expenseDetails[exp.id];
    
    const confirmMessage = inherited 
      ? `⚠️ ATENCIÓN: Este es un gasto fijo recurrente heredado de ${getOriginalMonthName(exp.fecha)}.\n\nSi lo eliminas, se borrará de forma permanente de ESTE y TODOS los meses posteriores.`
      : hasDetails
        ? `¿Estás seguro de que deseas eliminar la factura N° ${expenseDetails[exp.id].numeroFactura} por $${fmt(exp.monto)}?`
        : `¿Estás seguro de que deseas eliminar el gasto "${exp.categoria}" por $${fmt(exp.monto)}?`;

    openConfirm({
      title: inherited ? 'Eliminar Gasto Recurrente' : 'Eliminar Gasto',
      message: confirmMessage,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      onConfirm: async () => {
        closeConfirm();
        setDeletingId(exp.id);
        try {
          await deleteExpense(exp.id);
          if (hasDetails) {
            const detailsKey = `nexus_rpm_expense_details_${companyId}`;
            const updated = { ...expenseDetails };
            delete updated[exp.id];
            setExpenseDetails(updated);
            localStorage.setItem(detailsKey, JSON.stringify(updated));
          }
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleStartEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({
      nombre: supplier.nombre,
      rut: supplier.rut,
      plazoPagoDias: supplier.plazoPagoDias,
      contactoMail: supplier.contactoMail || '',
      contactoFono: supplier.contactoFono || ''
    });
    setShowSupplierModal(true);
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

      {/* Modal de Confirmación global (reemplaza window.confirm) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">
            Gestión estructurada y unificada de egresos, facturas de proveedores y cuentas por pagar.
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
          {showForm ? 'Cerrar Formulario' : 'Registrar Nuevo Egreso / Factura'}
        </button>
      </div>

      {/* Formulario de Registro (Creación) */}
      {showForm && !editingExpense && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl mb-8 transition-all duration-300 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Sparkles className="text-blue-500 animate-pulse" size={20} />
            Registrar Nuevo Egreso Financiero
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Tipo de Registro (Es Factura de Proveedor) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo de Registro</label>
                <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3 py-2 rounded-xl border border-slate-200 h-[46px] transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white shadow-sm cursor-pointer"
                    checked={isFacturaProveedor}
                    onChange={(e) => {
                      setIsFacturaProveedor(e.target.checked);
                      if (e.target.checked) {
                        setRecurrencia('Variable');
                      }
                    }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Factura de Proveedor</span>
                    <span className="text-[9px] text-slate-400 block font-semibold">Registra cuenta por pagar</span>
                  </div>
                </label>
              </div>

              {/* Clasificación */}
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

              {/* Recurrencia (Solo si no es Factura) */}
              {!isFacturaProveedor ? (
                <>
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

                    {/* Día de vencimiento para gastos fijos */}
                    {recurrencia === 'Fijo' && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <label className="text-xs font-bold text-amber-700 uppercase block mb-1.5 flex items-center gap-1.5">
                          <Clock size={12} />
                          Día de vencimiento en el mes (opcional)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={diaVencimientoFijo}
                            onChange={e => setDiaVencimientoFijo(e.target.value)}
                            placeholder="Ej: 5 (pago el día 5)"
                            className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-amber-600 font-medium mt-1.5">
                          🟡 Aparecerá en el semáforo de Cuentas por Pagar cada mes.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Estado de Pago para Egresos Simples */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Estado del Pago</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setEstadoPagoSimple('Pagado')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          estadoPagoSimple === 'Pagado' 
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Pagado
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoPagoSimple('Pendiente')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          estadoPagoSimple === 'Pendiente' 
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Pendiente
                      </button>
                    </div>

                    {/* Fecha de Pago Real (si es variable y está Pagado) */}
                    {recurrencia === 'Variable' && estadoPagoSimple === 'Pagado' && (
                      <div className="mt-3">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Pago Real</label>
                        <input
                          type="date"
                          value={fechaPagoRealSimple}
                          onChange={(e) => setFechaPagoRealSimple(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Fecha de Vencimiento (si es variable y está Pendiente) */}
                    {recurrencia === 'Variable' && estadoPagoSimple === 'Pendiente' && (
                      <div className="mt-3">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={fechaVencimientoSimple}
                          onChange={(e) => setFechaVencimientoSimple(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Si es Factura, mostramos el Proveedor */
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Proveedor</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                      required={isFacturaProveedor}
                    >
                      <option value="">Selecciona proveedor</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre} ({s.rut})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(null);
                        setNewSupplier({
                          nombre: '',
                          rut: '',
                          plazoPagoDias: 30,
                          contactoMail: '',
                          contactoFono: ''
                        });
                        setShowSupplierModal(true);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 shrink-0"
                      title="Crear nuevo proveedor"
                    >
                      <UserPlus size={16} />
                      <span>Nuevo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Campos condicionales adicionales para Factura */}
              {isFacturaProveedor && (
                <>
                  {/* Número de Factura */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Número de Factura</label>
                    <input
                      type="text"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      placeholder="Ej: 10452"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                      required={isFacturaProveedor}
                    />
                  </div>
                  
                  {/* Fecha de Vencimiento Factura */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={fechaVencimientoFactura}
                      onChange={(e) => {
                        setFechaVencimientoFactura(e.target.value);
                        if (isCuotasEnabled) regenerateCuotasList(monto, e.target.value, numCuotas, tipoCalculoCuotas, montoFijoCuota);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                      required={isFacturaProveedor}
                    />
                  </div>
                </>
              )}

              {/* Categoría */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Categoría</label>
                {showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ej: Insumos, Arriendo, etc."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
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
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 transition-colors"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
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
                    onChange={(e) => {
                      setMonto(e.target.value);
                      if (isCuotasEnabled) regenerateCuotasList(e.target.value, isFacturaProveedor ? fechaVencimientoFactura : fecha, numCuotas, tipoCalculoCuotas, montoFijoCuota);
                    }}
                    placeholder="Ej: 150000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Fecha (Emisión para Facturas, Registro para egresos normales) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                  {isFacturaProveedor ? 'Fecha de Emisión Factura' : 'Fecha de Registro / Inicio'}
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    if (isCuotasEnabled) regenerateCuotasList(monto, isFacturaProveedor ? fechaVencimientoFactura : e.target.value, numCuotas, tipoCalculoCuotas, montoFijoCuota);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                  required
                />
              </div>

              {/* IVA Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-200 w-full transition-colors h-[46px]">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                    checked={aplicaCreditoIva}
                    onChange={(e) => setAplicaCreditoIva(e.target.checked)}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Aplica Crédito IVA</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Descuenta IVA débito (19%)</span>
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
                          regenerateCuotasList(monto, isFacturaProveedor ? fechaVencimientoFactura : fecha, numCuotas, tipoCalculoCuotas, montoFijoCuota, true);
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
                            regenerateCuotasList(monto, isFacturaProveedor ? fechaVencimientoFactura : fecha, numCuotas, 'dividir', montoFijoCuota);
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
                            regenerateCuotasList(monto, isFacturaProveedor ? fechaVencimientoFactura : fecha, numCuotas, 'monto_fijo', montoFijoCuota);
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
                              regenerateCuotasList(monto, isFacturaProveedor ? fechaVencimientoFactura : fecha, val, tipoCalculoCuotas, montoFijoCuota);
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
                                regenerateCuotasList(monto, isFacturaProveedor ? fechaVencimientoFactura : fecha, numCuotas, tipoCalculoCuotas, e.target.value);
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
                              className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none animate-fade-in"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-blue-800 animate-fade-in">
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
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
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
              <X size={18} />
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
                  
                  {/* Tipo de Registro (Es Factura) */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo de Registro</label>
                    <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border border-slate-200 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white shadow-sm"
                        checked={isFacturaProveedor}
                        onChange={(e) => {
                          setIsFacturaProveedor(e.target.checked);
                          if (e.target.checked) {
                            setRecurrencia('Variable');
                          }
                        }}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Factura de Proveedor</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Vincula a cuentas por pagar</span>
                      </div>
                    </label>
                  </div>

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

                  {/* Recurrencia (Solo si no es Factura) */}
                  {!isFacturaProveedor ? (
                    <>
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

                      {/* Estado de Pago para Egresos Simples (Edición) */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Estado del Pago</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setEstadoPagoSimple('Pagado')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              estadoPagoSimple === 'Pagado' 
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Pagado
                          </button>
                          <button
                            type="button"
                            onClick={() => setEstadoPagoSimple('Pendiente')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              estadoPagoSimple === 'Pendiente' 
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Pendiente
                          </button>
                        </div>

                        {/* Fecha de Pago Real (si es variable y está Pagado) */}
                        {recurrencia === 'Variable' && estadoPagoSimple === 'Pagado' && (
                          <div className="mt-3">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Pago Real</label>
                            <input
                              type="date"
                              value={fechaPagoRealSimple}
                              onChange={(e) => setFechaPagoRealSimple(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                          </div>
                        )}

                        {/* Fecha de Vencimiento (si es variable y está Pendiente) */}
                        {recurrencia === 'Variable' && estadoPagoSimple === 'Pendiente' && (
                          <div className="mt-3">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Vencimiento</label>
                            <input
                              type="date"
                              value={fechaVencimientoSimple}
                              onChange={(e) => setFechaVencimientoSimple(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                          </div>
                        )}

                        {/* Día de vencimiento para fijos */}
                        {recurrencia === 'Fijo' && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <label className="text-xs font-bold text-amber-700 uppercase block mb-1.5 flex items-center gap-1.5">
                              <Clock size={12} />
                              Día de vencimiento en el mes (opcional)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="31"
                                value={diaVencimientoFijo}
                                onChange={e => setDiaVencimientoFijo(e.target.value)}
                                placeholder="Ej: 5 (pago el día 5)"
                                className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                            </div>
                            <p className="text-[10px] text-amber-600 font-medium mt-1.5">
                              🟡 Aparecerá en el semáforo de Cuentas por Pagar cada mes.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Si es Factura, mostramos el Proveedor */
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Proveedor</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedSupplierId}
                          onChange={(e) => setSelectedSupplierId(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
                          required={isFacturaProveedor}
                        >
                          <option value="">Selecciona proveedor</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre} ({s.rut})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSupplier(null);
                            setNewSupplier({
                              nombre: '',
                              rut: '',
                              plazoPagoDias: 30,
                              contactoMail: '',
                              contactoFono: ''
                            });
                            setShowSupplierModal(true);
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-bold px-3 py-2 rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 shrink-0"
                          title="Crear nuevo proveedor"
                        >
                          <UserPlus size={16} />
                          <span>Nuevo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Campos condicionales adicionales para Factura */}
                  {isFacturaProveedor && (
                    <>
                      {/* Número de Factura */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Número de Factura</label>
                        <input
                          type="text"
                          value={numeroFactura}
                          onChange={(e) => setNumeroFactura(e.target.value)}
                          placeholder="Ej: 10452"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
                          required={isFacturaProveedor}
                        />
                      </div>
                      
                      {/* Fecha de Vencimiento Factura */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={fechaVencimientoFactura}
                          onChange={(e) => setFechaVencimientoFactura(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
                          required={isFacturaProveedor}
                        />
                      </div>
                    </>
                  )}

                  {/* Categoría */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Categoría</label>
                    {showNewCategoryInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ej: Insumos, Arriendo, etc."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold"
                      required
                    />
                  </div>

                  {/* IVA Checkbox */}
                  <div className="sm:col-span-2 flex items-center">
                    <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border border-slate-200 w-full transition-colors h-[46px]">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white"
                        checked={aplicaCreditoIva}
                        onChange={(e) => setAplicaCreditoIva(e.target.checked)}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Aplica Crédito IVA</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Descuenta IVA (19%)</span>
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
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegación Principal */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 rounded-xl gap-1.5 max-w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('gastos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'gastos'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Receipt size={15} />
          Gastos del Período
        </button>
        <button
          onClick={() => setActiveTab('payable')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'payable'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <TrendingDown size={15} />
          Cuentas por Pagar
          {kpis.totalPendiente > 0 && (
            <span className="ml-1 text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
              ${fmt(kpis.totalPendiente)}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('proveedores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'proveedores'
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Building2 size={15} />
          Gestión de Proveedores
          <span className="ml-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
            {suppliers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('informe')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'informe'
              ? 'bg-white text-blue-700 shadow-sm border border-blue-200/50'
              : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <BarChart3 size={15} />
          Informe
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA: GASTOS DEL PERIODO */}
      {activeTab === 'gastos' && (
        <div className="space-y-6 animate-fade-in">
          {/* Resumen Cards (OPEX, IVA, CAPEX) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
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

            {/* CAPEX Summary Card */}
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

          {/* Listado con Pestañas Internas (OPEX vs CAPEX) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Barra de Sub-Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
              <button
                onClick={() => setExpensesSubTab('OPEX')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                  expensesSubTab === 'OPEX'
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
                onClick={() => setExpensesSubTab('CAPEX')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                  expensesSubTab === 'CAPEX'
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

            {/* Contenido de Sub-Tab Activo */}
            <div className="p-5">
              {expensesSubTab === 'OPEX' ? (
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
      )}

      {/* CONTENIDO DE PESTAÑA: CUENTAS POR PAGAR */}
      {activeTab === 'payable' && (
        <div className="space-y-6 animate-fade-in">
          {/* Resumen de KPIs de Deuda */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI Total Pendiente */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-500/5 rounded-full blur-xl"></div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Total por Pagar</span>
                  <DollarSign className="text-slate-500" size={18} />
                </div>
                <div className="text-2xl font-black text-slate-800">${fmt(kpis.totalPendiente)}</div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-3">
                Suma total de facturas vigentes por pagar.
              </p>
            </div>

            {/* KPI Vencido */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl"></div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Deuda Vencida</span>
                  <AlertTriangle className="text-rose-500" size={18} />
                </div>
                <div className="text-2xl font-black text-rose-600">${fmt(kpis.vencido)}</div>
              </div>
              <p className="text-[10px] text-rose-400 font-medium mt-3">
                Facturas vencidas que requieren pago inmediato.
              </p>
            </div>

            {/* KPI Vence en 7 Días */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl"></div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Vence en 7 Días</span>
                  <Clock className="text-amber-500" size={18} />
                </div>
                <div className="text-2xl font-black text-amber-600">${fmt(kpis.vence7dias)}</div>
              </div>
              <p className="text-[10px] text-amber-500 font-medium mt-3">
                Compromisos de pago para esta semana.
              </p>
            </div>

            {/* KPI Vence en 30 Días */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl"></div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Vence en 30 Días</span>
                  <Calendar className="text-blue-500" size={18} />
                </div>
                <div className="text-2xl font-black text-blue-600">${fmt(kpis.vence30dias)}</div>
              </div>
              <p className="text-[10px] text-blue-400 font-medium mt-3">
                Compromisos de pago para los próximos 30 días.
              </p>
            </div>
          </div>

          {/* Grilla / Listado de Facturas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Control de Facturas y Vencimientos</h3>
                <p className="text-xs text-slate-400">Control global e histórico de deudas de proveedores.</p>
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  placeholder="Buscar por proveedor, factura o categoría..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="text-slate-400 text-xs py-12 text-center font-medium border border-dashed border-slate-200 rounded-xl">
                No se encontraron facturas registradas en el sistema.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Proveedor / RUT</th>
                      <th className="py-3 px-4">Factura N°</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Fecha Emisión</th>
                      <th className="py-3 px-4">Vencimiento</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredInvoices.map((inv) => {
                      const hoyStr = new Date().toISOString().split('T')[0];
                      const esVencido = inv.estadoPago === 'Pendiente' && inv.fechaVencimiento < hoyStr;
                      
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 block">{inv.supplierName}</span>
                              {inv.esFijo && (
                                <span className="text-[9px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                                  Fijo
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-semibold">{inv.supplierRut}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{inv.numeroFactura}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-500">{inv.categoria}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-semibold">
                            {new Date(inv.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            <span className={esVencido ? 'text-red-500 font-bold' : 'text-slate-600'}>
                              {new Date(inv.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            {esVencido && (
                              <span className="ml-1 text-[8px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold border border-red-150 inline-block uppercase">
                                Vencido
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">${fmt(inv.monto)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                              inv.estadoPago === 'Pagado'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : esVencido
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>
                              {inv.estadoPago === 'Pagado' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              {inv.estadoPago}
                            </span>
                            {inv.estadoPago === 'Pagado' && inv.fechaPagoReal && (
                              <span className="block text-[9px] text-slate-400 mt-0.5">Pagado: {new Date(inv.fechaPagoReal + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.estadoPago === 'Pendiente' && (
                                <button
                                  onClick={() => handleRegisterPayment(inv.id, !!inv.esFijo)}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 shrink-0"
                                  title={inv.esFijo ? 'Registrar Pago de Gasto Fijo' : 'Registrar Pago de Factura'}
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Pagar</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleStartEdit(inv)}
                                className="text-slate-400 hover:text-blue-500 hover:bg-blue-55 p-1 rounded-lg transition-colors shrink-0"
                                title="Editar Factura"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(inv)}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-55 p-1 rounded-lg transition-colors shrink-0"
                                title="Eliminar Factura"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: DIRECTORIO DE PROVEEDORES */}
      {activeTab === 'proveedores' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Directorio de Proveedores</h3>
              <p className="text-xs text-slate-400">Administra los plazos de pago y datos de contacto de tus proveedores comerciales.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchSupplier}
                  onChange={(e) => setSearchSupplier(e.target.value)}
                  placeholder="Buscar proveedor o RUT..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setNewSupplier({
                    nombre: '',
                    rut: '',
                    plazoPagoDias: 30,
                    contactoMail: '',
                    contactoFono: ''
                  });
                  setShowSupplierModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <UserPlus size={15} />
                <span>Nuevo Proveedor</span>
              </button>
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="text-slate-400 text-xs py-12 text-center font-medium border border-dashed border-slate-200 rounded-xl">
              No se encontraron proveedores registrados. Haz clic en "Nuevo Proveedor" para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-150 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Razón Social / Nombre</th>
                    <th className="py-3 px-4">RUT</th>
                    <th className="py-3 px-4">Plazo de Pago</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{sup.nombre}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-650">{sup.rut}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        {sup.plazoPagoDias} días
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">
                        {sup.contactoMail ? (
                          <a href={`mailto:${sup.contactoMail}`} className="hover:underline flex items-center gap-1 text-blue-600 hover:text-blue-700">
                            <Mail size={12} className="text-slate-400" />
                            {sup.contactoMail}
                          </a>
                        ) : (
                          <span className="text-slate-350 italic">No registrado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">
                        {sup.contactoFono ? (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            {sup.contactoFono}
                          </span>
                        ) : (
                          <span className="text-slate-350 italic">No registrado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStartEditSupplier(sup)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-500 p-1.5 rounded-lg border border-slate-200 transition-colors"
                            title="Editar Proveedor"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(sup.id)}
                            className="bg-red-50 hover:bg-red-105 text-red-600 p-1.5 rounded-lg border border-red-200 transition-colors"
                            title="Eliminar Proveedor"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: INFORME */}
      {activeTab === 'informe' && (
        <ExpensesReport
          allExpenses={allExpenses}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          capexCategories={capexCategories}
        />
      )}

      {/* Modal de Proveedor (Creación / Edición) */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-300 transform scale-100 max-h-[95vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            {/* Botón Cerrar */}
            <button 
              onClick={() => setShowSupplierModal(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg animate-fade-in"
            >
              <X size={18} />
            </button>

            {/* Cabecera */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 size={18} />
                </div>
                <div>
                  <span className="block text-slate-800">{editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</span>
                  <span className="block text-xs text-slate-400 font-normal mt-0.5">Ingresa los datos comerciales del proveedor</span>
                </div>
              </h2>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Razón Social / Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Transportes Acme Ltda."
                  value={newSupplier.nombre}
                  onChange={(e) => setNewSupplier({ ...newSupplier, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">RUT / Identificación Tributaria</label>
                <input
                  type="text"
                  placeholder="Ej: 76.123.456-7"
                  value={newSupplier.rut}
                  onChange={(e) => setNewSupplier({ ...newSupplier, rut: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Plazo de Pago (Días de Crédito)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={newSupplier.plazoPagoDias}
                  onChange={(e) => setNewSupplier({ ...newSupplier, plazoPagoDias: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Email de Contacto (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ej: contacto@empresa.com"
                  value={newSupplier.contactoMail}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactoMail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Teléfono de Contacto (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: +56 9 1234 5678"
                  value={newSupplier.contactoFono}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactoFono: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all font-bold"
                >
                  {editingSupplier ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Renderizar fila de gasto individual
  function renderExpenseRow(exp) {
    const isFixed = exp.tipo === 'Fijo';
    const inherited = isInherited(exp);
    const isDeleting = deletingId === exp.id;
    const detail = expenseDetails[exp.id];
    const supplier = detail ? suppliers.find(s => s.id === detail.supplierId) : null;

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

            {/* Badge de Factura si corresponde */}
            {detail && (
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                detail.estadoPago === 'Pagado'
                  ? 'bg-emerald-50 text-emerald-650 border-emerald-200'
                  : 'bg-amber-50 text-amber-650 border-amber-200'
              }`}>
                <Receipt size={10} className="shrink-0" />
                Factura N° {detail.numeroFactura} - {supplier ? supplier.nombre : 'Proveedor'} ({detail.estadoPago})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-semibold">
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
                className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                title="Editar Gasto / Factura"
              >
                <Edit2 size={15} />
              </button>
            )}
            <button
              onClick={() => handleDelete(exp)}
              disabled={isDeleting}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
              title="Eliminar Gasto / Factura"
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
