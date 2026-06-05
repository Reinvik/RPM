import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  TrendingUp, 
  Calendar, 
  Trash2, 
  DollarSign, 
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  Building2,
  Receipt,
  CheckCircle2,
  Clock,
  UserPlus,
  ArrowRight,
  FileText,
  Mail,
  Phone,
  Search,
  X
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

export default function PayableModule() {
  const { data: { expenses }, addExpense, deleteExpense, updateExpense, loading } = useNexusRPM();
  const { companyId } = useNexusContext();

  const [activeTab, setActiveTab] = useState('facturas'); // 'facturas' o 'proveedores'
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Estados de Proveedores
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    nombre: '',
    rut: '',
    plazoPagoDias: 30,
    contactoMail: '',
    contactoFono: ''
  });

  // Estados de Facturas
  const [expenseDetails, setExpenseDetails] = useState({});
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');
  
  // Categorías personalizadas
  const [customOpexCategories, setCustomOpexCategories] = useState([]);
  const [customCapexCategories, setCustomCapexCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [newInvoice, setNewInvoice] = useState({
    supplierId: '',
    numeroFactura: '',
    montoTotal: '',
    clasificacion: 'OPEX',
    categoria: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    aplicaCreditoIva: false
  });

  // Cargar Proveedores, Detalles de Gastos y Categorías desde LocalStorage al iniciar
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
  const opexCategories = useMemo(() => [...DEFAULT_OPEX_CATEGORIES, ...customOpexCategories], [customOpexCategories]);
  const capexCategories = useMemo(() => [...DEFAULT_CAPEX_CATEGORIES, ...customCapexCategories], [customCapexCategories]);

  // Helper para sumar días a una fecha
  const addDays = (dateStr, days) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + Number(days));
    return date.toISOString().split('T')[0];
  };

  // Calcular fecha de vencimiento automática cuando cambia la fecha de emisión o el proveedor
  useEffect(() => {
    if (!newInvoice.supplierId || !newInvoice.fechaEmision) return;
    const selectedSupplier = suppliers.find(s => s.id === newInvoice.supplierId);
    if (selectedSupplier) {
      setNewInvoice(prev => ({
        ...prev,
        fechaVencimiento: addDays(prev.fechaEmision, selectedSupplier.plazoPagoDias)
      }));
    }
  }, [newInvoice.supplierId, newInvoice.fechaEmision, suppliers]);

  // Cruzar egresos de Supabase con los detalles locales de facturas
  const invoices = useMemo(() => {
    const list = [];
    expenses.forEach(exp => {
      const detail = expenseDetails[exp.id];
      if (detail) {
        const supplier = suppliers.find(s => s.id === detail.supplierId);
        list.push({
          ...exp,
          detail,
          supplierName: supplier ? supplier.nombre : 'Proveedor Desconocido',
          supplierRut: supplier ? supplier.rut : '',
          numeroFactura: detail.numeroFactura,
          fechaVencimiento: detail.fechaVencimiento,
          estadoPago: detail.estadoPago || 'Pendiente',
          fechaPagoReal: detail.fechaPagoReal
        });
      }
    });
    return list.sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  }, [expenses, expenseDetails, suppliers]);

  // Filtrar facturas según búsqueda
  const filteredInvoices = useMemo(() => {
    const q = searchInvoice.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(inv => 
      inv.supplierName.toLowerCase().includes(q) ||
      inv.numeroFactura.toLowerCase().includes(q) ||
      inv.categoria.toLowerCase().includes(q)
    );
  }, [invoices, searchInvoice]);

  // Filtrar proveedores según búsqueda
  const filteredSuppliers = useMemo(() => {
    const q = searchSupplier.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(s => 
      s.nombre.toLowerCase().includes(q) ||
      s.rut.toLowerCase().includes(q) ||
      (s.contactoMail && s.contactoMail.toLowerCase().includes(q))
    );
  }, [suppliers, searchSupplier]);

  // Cálculos de KPIs de Deudas
  const kpis = useMemo(() => {
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

  // Guardar Proveedor
  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!newSupplier.nombre.trim()) return;

    const suppliersKey = `nexus_rpm_suppliers_${companyId}`;
    const id = `prov-${Date.now()}`;
    const updatedSuppliers = [...suppliers, { ...newSupplier, id }];
    
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

  // Eliminar Proveedor
  const handleDeleteSupplier = (id) => {
    const selected = suppliers.find(s => s.id === id);
    if (!selected) return;

    // Verificar si el proveedor tiene facturas asociadas
    const tieneFacturas = invoices.some(inv => inv.detail.supplierId === id);
    if (tieneFacturas) {
      alert(`No se puede eliminar el proveedor "${selected.nombre}" porque tiene facturas asociadas en el sistema.`);
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${selected.nombre}"?`)) return;

    const suppliersKey = `nexus_rpm_suppliers_${companyId}`;
    const updated = suppliers.filter(s => s.id !== id);
    setSuppliers(updated);
    localStorage.setItem(suppliersKey, JSON.stringify(updated));
  };

  // Guardar Factura
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    
    let finalCategoria = newInvoice.categoria;

    // Procesar categoría personalizada si se seleccionó
    if (showNewCategoryInput) {
      if (!newCategoryName.trim()) {
        alert("Por favor ingresa el nombre de la categoría.");
        return;
      }
      finalCategoria = newCategoryName.trim();
      
      if (newInvoice.clasificacion === 'OPEX') {
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

    if (!newInvoice.supplierId || !newInvoice.numeroFactura || !newInvoice.montoTotal || !finalCategoria) {
      alert("Por favor rellena todos los campos requeridos.");
      return;
    }

    setSaving(true);

    try {
      // 1. Guardar como egreso financiero en Supabase (para sumarse en caja)
      const res = await addExpense({
        tipo: 'Variable',
        categoria: finalCategoria,
        monto: Number(newInvoice.montoTotal),
        fecha: newInvoice.fechaEmision,
        aplica_credito_iva: newInvoice.aplicaCreditoIva
      });

      if (res.error) throw res.error;

      // 2. Guardar los metadatos de factura y vencimiento en localStorage vinculados al ID de Supabase
      const createdExpense = res.data;
      const detailsKey = `nexus_rpm_expense_details_${companyId}`;
      const updatedDetails = {
        ...expenseDetails,
        [createdExpense.id]: {
          supplierId: newInvoice.supplierId,
          numeroFactura: newInvoice.numeroFactura,
          fechaVencimiento: newInvoice.fechaVencimiento || addDays(newInvoice.fechaEmision, 30),
          estadoPago: 'Pendiente',
          fechaPagoReal: null
        }
      };

      setExpenseDetails(updatedDetails);
      localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));

      // Resetear formulario
      setNewInvoice({
        supplierId: '',
        numeroFactura: '',
        montoTotal: '',
        clasificacion: 'OPEX',
        categoria: '',
        fechaEmision: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
        aplicaCreditoIva: false
      });
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setShowInvoiceModal(false);

    } catch (err) {
      console.error(err);
      alert("Error al registrar factura: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Registrar pago de una factura
  const handleRegisterPayment = async (expId) => {
    const detail = expenseDetails[expId];
    if (!detail) return;

    if (!window.confirm("¿Confirmas que deseas registrar el pago de esta factura hoy?")) return;

    const detailsKey = `nexus_rpm_expense_details_${companyId}`;
    const updatedDetails = {
      ...expenseDetails,
      [expId]: {
        ...detail,
        estadoPago: 'Pagado',
        fechaPagoReal: new Date().toISOString().split('T')[0]
      }
    };

    // Opcionalmente podemos actualizar la fecha del gasto en Supabase a la fecha de hoy para que se compute en caja hoy
    // Pero para mantener la consistencia de la factura original y evitar desbalances, solo actualizamos el estado de pago local.
    setExpenseDetails(updatedDetails);
    localStorage.setItem(detailsKey, JSON.stringify(updatedDetails));
  };

  // Eliminar Factura
  const handleDeleteInvoice = async (exp) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la factura N° ${exp.numeroFactura} del proveedor "${exp.supplierName}"?`)) return;

    setDeletingId(exp.id);
    try {
      // 1. Eliminar egreso de Supabase
      const res = await deleteExpense(exp.id);
      if (res.error) throw res.error;

      // 2. Eliminar del mapa de localStorage
      const detailsKey = `nexus_rpm_expense_details_${companyId}`;
      const updated = { ...expenseDetails };
      delete updated[exp.id];
      
      setExpenseDetails(updated);
      localStorage.setItem(detailsKey, JSON.stringify(updated));

    } catch (err) {
      console.error(err);
      alert("Error al eliminar factura: " + (err.message || err));
    } finally {
      setDeletingId(null);
    }
  };

  const fmt = (num) => Math.round(num).toLocaleString('es-CL');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-600">Sincronizando cuentas y vencimientos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Resumen Cards (Deuda Operativa) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Deuda Total */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Deuda Pendiente</span>
              <Layers className="text-slate-500" size={18} />
            </div>
            <div className="text-2xl font-black text-slate-800">${fmt(kpis.totalPendiente)}</div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100">
            Total facturas pendientes por pagar a proveedores.
          </p>
        </div>

        {/* Vencido (Rojo) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between border-l-4 border-l-rose-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Deudas Vencidas</span>
              <AlertTriangle className="text-rose-500" size={18} />
            </div>
            <div className="text-2xl font-black text-rose-600">${fmt(kpis.vencido)}</div>
          </div>
          <p className="text-[10px] text-rose-500/80 font-medium mt-4 pt-3 border-t border-slate-100">
            Pasados de la fecha de vencimiento acordada.
          </p>
        </div>

        {/* Vence Pronto (Amarillo) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vence en 7 Días</span>
              <Clock className="text-amber-500" size={18} />
            </div>
            <div className="text-2xl font-black text-amber-600">${fmt(kpis.vence7dias)}</div>
          </div>
          <p className="text-[10px] text-amber-600/80 font-medium mt-4 pt-3 border-t border-slate-100">
            Próximos vencimientos esta semana.
          </p>
        </div>

        {/* Vence en el Mes (Azul) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between border-l-4 border-l-cyan-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vence en 30 Días</span>
              <Calendar className="text-cyan-500" size={18} />
            </div>
            <div className="text-2xl font-black text-cyan-600">${fmt(kpis.vence30dias)}</div>
          </div>
          <p className="text-[10px] text-cyan-600/80 font-medium mt-4 pt-3 border-t border-slate-100">
            Compromisos con vencimiento a mediano plazo.
          </p>
        </div>

      </div>

      {/* Tabs y Contenido */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Barra de Tabs y Botones de Creación */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-200 bg-slate-50/50 p-3 gap-3">
          <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('facturas')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'facturas'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={14} />
              Facturas y Cuentas por Pagar
            </button>
            <button
              onClick={() => setActiveTab('proveedores')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'proveedores'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={14} />
              Gestión de Proveedores
            </button>
          </div>

          <div className="flex gap-2">
            {activeTab === 'facturas' ? (
              <button
                onClick={() => {
                  if (suppliers.length === 0) {
                    alert("Debes registrar al menos un proveedor en la pestaña 'Gestión de Proveedores' antes de ingresar facturas.");
                    return;
                  }
                  setShowInvoiceModal(true);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <PlusCircle size={15} />
                Ingresar Factura
              </button>
            ) : (
              <button
                onClick={() => setShowSupplierModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <UserPlus size={15} />
                Nuevo Proveedor
              </button>
            )}
          </div>
        </div>

        {/* Contenido de Facturas */}
        {activeTab === 'facturas' && (
          <div className="p-6 space-y-4">
            
            {/* Buscador de Facturas */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por proveedor, N° factura o categoría..."
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
              />
            </div>

            {/* Listado de Facturas */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                    <th className="p-4">Proveedor</th>
                    <th className="p-4">Factura N°</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Emisión</th>
                    <th className="p-4">Vencimiento</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                        No se encontraron facturas registradas.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const isVencida = inv.estadoPago === 'Pendiente' && new Date(inv.fechaVencimiento + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
                      const isDeleting = deletingId === inv.id;
                      
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{inv.supplierName}</td>
                          <td className="p-4 font-semibold text-slate-600">{inv.numeroFactura}</td>
                          <td className="p-4">
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              {inv.categoria}
                            </span>
                          </td>
                          <td className="p-4 font-extrabold text-slate-800">${fmt(inv.monto)}</td>
                          <td className="p-4 text-slate-500">
                            {new Date(inv.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                          </td>
                          <td className={`p-4 font-bold ${isVencida ? 'text-rose-500' : 'text-slate-650'}`}>
                            {new Date(inv.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-CL')}
                          </td>
                          <td className="p-4">
                            {inv.estadoPago === 'Pagado' ? (
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                Pagada
                              </span>
                            ) : (
                              <span className={`font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                                isVencida 
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' 
                                  : 'bg-amber-50 text-amber-600 border-amber-250'
                              }`}>
                                <Clock size={10} />
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center items-center gap-1.5">
                              {inv.estadoPago === 'Pendiente' && (
                                <button
                                  onClick={() => handleRegisterPayment(inv.id)}
                                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-600 font-bold px-2.5 py-1.5 rounded-lg border border-cyan-200 transition-colors"
                                  title="Registrar Pago"
                                >
                                  Pagar
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteInvoice(inv)}
                                disabled={isDeleting}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                title="Eliminar Factura"
                              >
                                {isDeleting ? (
                                  <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
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
        )}

        {/* Contenido de Proveedores */}
        {activeTab === 'proveedores' && (
          <div className="p-6 space-y-4">
            
            {/* Buscador de Proveedores */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre, RUT o email..."
                value={searchSupplier}
                onChange={(e) => setSearchSupplier(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
              />
            </div>

            {/* Listado de Proveedores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSuppliers.length === 0 ? (
                <p className="col-span-full py-8 text-center text-slate-400 font-medium text-xs">
                  No se encontraron proveedores registrados.
                </p>
              ) : (
                filteredSuppliers.map(s => (
                  <div key={s.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{s.nombre}</h3>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wider">{s.rut || 'Sin RUT'}</span>
                        </div>
                        <span className="bg-cyan-50 text-cyan-600 border border-cyan-150 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                          {s.plazoPagoDias} Días
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        {s.contactoMail && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={13} className="text-slate-400" />
                            <span>{s.contactoMail}</span>
                          </div>
                        )}
                        {s.contactoFono && (
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="text-slate-400" />
                            <span>{s.contactoFono}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 mt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeleteSupplier(s.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        title="Eliminar Proveedor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* Modal de Nuevo Proveedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-300 transform scale-100">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-cyan-600"></div>
            
            <button 
              onClick={() => setShowSupplierModal(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-650 transition-colors p-1 hover:bg-slate-100 rounded-lg"
            >
              <X size={16} />
            </button>

            <div className="p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="text-cyan-600" size={18} />
                Registrar Nuevo Proveedor
              </h2>
              
              <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Repuestos e Insumos Ltda."
                    value={newSupplier.nombre}
                    onChange={(e) => setNewSupplier({...newSupplier, nombre: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">RUT / ID Tributario</label>
                    <input
                      type="text"
                      placeholder="Ej: 76.123.456-7"
                      value={newSupplier.rut}
                      onChange={(e) => setNewSupplier({...newSupplier, rut: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Días de Crédito *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="180"
                      value={newSupplier.plazoPagoDias}
                      onChange={(e) => setNewSupplier({...newSupplier, plazoPagoDias: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Email de Contacto</label>
                  <input
                    type="email"
                    placeholder="Ej: ventas@proveedor.cl"
                    value={newSupplier.contactoMail}
                    onChange={(e) => setNewSupplier({...newSupplier, contactoMail: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Teléfono / Fono</label>
                  <input
                    type="text"
                    placeholder="Ej: +56 9 8765 4321"
                    value={newSupplier.contactoFono}
                    onChange={(e) => setNewSupplier({...newSupplier, contactoFono: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md"
                  >
                    Guardar Proveedor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nueva Factura */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-300 transform scale-100 my-8">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-cyan-600"></div>
            
            <button 
              onClick={() => {
                setShowInvoiceModal(false);
                setShowNewCategoryInput(false);
                setNewCategoryName('');
              }} 
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-650 transition-colors p-1 hover:bg-slate-100 rounded-lg"
            >
              <X size={16} />
            </button>

            <div className="p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Receipt className="text-cyan-600" size={18} />
                Ingresar Factura de Proveedor
              </h2>
              
              <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Proveedor */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Proveedor *</label>
                    <select
                      required
                      value={newInvoice.supplierId}
                      onChange={(e) => setNewInvoice({...newInvoice, supplierId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-semibold"
                    >
                      <option value="">Selecciona un proveedor</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre} ({s.plazoPagoDias} días)</option>
                      ))}
                    </select>
                  </div>

                  {/* Factura N° */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Factura Número *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 8902"
                      value={newInvoice.numeroFactura}
                      onChange={(e) => setNewInvoice({...newInvoice, numeroFactura: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-semibold"
                    />
                  </div>

                  {/* Monto Total */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Monto Total ($) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ej: 150000"
                      value={newInvoice.montoTotal}
                      onChange={(e) => setNewInvoice({...newInvoice, montoTotal: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Clasificación */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Clasificación *</label>
                    <select
                      value={newInvoice.clasificacion}
                      onChange={(e) => setNewInvoice({...newInvoice, clasificacion: e.target.value, categoria: ''})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-semibold"
                    >
                      <option value="OPEX">OPEX (Gasto Operativo)</option>
                      <option value="CAPEX">CAPEX (Activo / Inversión)</option>
                    </select>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Categoría *</label>
                    {showNewCategoryInput ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          required
                          placeholder="Nueva cat."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                          className="bg-slate-100 hover:bg-slate-200 p-2 rounded-xl border border-slate-200"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <select
                        required
                        value={newInvoice.categoria}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setShowNewCategoryInput(true);
                          } else {
                            setNewInvoice({...newInvoice, categoria: e.target.value});
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      >
                        <option value="">Selecciona categoría</option>
                        {(newInvoice.clasificacion === 'OPEX' ? opexCategories : capexCategories).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="ADD_NEW" className="text-cyan-600 font-extrabold">+ Agregar...</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fecha de Emisión */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Fecha Emisión *</label>
                    <input
                      type="date"
                      required
                      value={newInvoice.fechaEmision}
                      onChange={(e) => setNewInvoice({...newInvoice, fechaEmision: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                    />
                  </div>

                  {/* Fecha de Vencimiento */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Fecha Vencimiento *</label>
                    <input
                      type="date"
                      required
                      value={newInvoice.fechaVencimiento}
                      onChange={(e) => setNewInvoice({...newInvoice, fechaVencimiento: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* IVA Checkbox */}
                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-200 w-full transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-cyan-650 focus:ring-cyan-500 bg-white"
                      checked={newInvoice.aplicaCreditoIva}
                      onChange={(e) => setNewInvoice({...newInvoice, aplicaCreditoIva: e.target.checked})}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Aplica Crédito IVA</span>
                      <span className="text-[10px] text-slate-400 block">Descuenta IVA débito (19%)</span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvoiceModal(false);
                      setShowNewCategoryInput(false);
                      setNewCategoryName('');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? 'Ingresando...' : 'Ingresar Factura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
