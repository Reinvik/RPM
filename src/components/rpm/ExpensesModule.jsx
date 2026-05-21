import React, { useState } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, Calendar, Briefcase } from 'lucide-react';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';

const OPEX_CATEGORIES = [
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

const CAPEX_CATEGORIES = [
  'Herramientas',
  'Maquinaria',
  'Infraestructura',
  'Mobiliario',
  'Tecnología',
  'Vehículos'
];

export default function ExpensesModule() {
  const { data: { expenses }, addExpense, loading } = useNexusRPM();
  const { companyId } = useNexusContext();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'Variable', // 'Variable' para OPEX, 'Fijo' para CAPEX
    categoria: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    aplica_credito_iva: false
  });

  const [saving, setSaving] = useState(false);

  const opex = expenses.filter(e => e.tipo === 'Variable');
  const capex = expenses.filter(e => e.tipo === 'Fijo');

  const totalOpex = opex.reduce((sum, e) => sum + Number(e.monto), 0);
  const totalCapex = capex.reduce((sum, e) => sum + Number(e.monto), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoria || !formData.monto) return;
    
    setSaving(true);
    const result = await addExpense({
      ...formData,
      monto: Number(formData.monto)
    });
    setSaving(false);
    
    if (!result.error) {
      setShowForm(false);
      setFormData({
        tipo: 'Variable',
        categoria: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        aplica_credito_iva: false
      });
    }
  };

  const fmt = (num) => Number(num).toLocaleString('es-CL');

  if (loading) {
    return <div className="p-8 text-slate-600">Cargando módulos de gastos...</div>;
  }

  return (
    <div className="p-8 font-sans bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Briefcase className="text-blue-600" size={32} />
            Egresos: OPEX y CAPEX
          </h1>
          <p className="text-slate-500 mt-1">Gestión de gastos operativos e inversiones.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <PlusCircle size={20} />
          {showForm ? 'Cerrar Formulario' : 'Registrar Egreso'}
        </button>
      </div>

      {/* Formulario de Registro */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Registrar Nuevo Egreso</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo de Egreso</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value, categoria: ''})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Variable">Gastos Operacionales (OPEX)</option>
                  <option value="Fijo">Inversiones / Activos (CAPEX)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {(formData.tipo === 'Variable' ? OPEX_CATEGORIES : CAPEX_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Monto ($)</label>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({...formData, monto: e.target.value})}
                  placeholder="Ej: 50000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                  checked={formData.aplica_credito_iva}
                  onChange={(e) => setFormData({...formData, aplica_credito_iva: e.target.checked})}
                />
                <div>
                  <span className="text-sm font-semibold text-slate-700 block">Aplica Crédito IVA</span>
                  <span className="text-xs text-slate-400 block">Descuenta del IVA a pagar mensual</span>
                </div>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 self-end md:self-auto"
              >
                {saving ? 'Guardando...' : 'Guardar Egreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resumen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Card OPEX */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-rose-500" /> OPEX (Gastos Operativos)
            </h2>
            <span className="text-2xl font-bold text-rose-600">${fmt(totalOpex)}</span>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {opex.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">No hay gastos operacionales registrados en este período.</p>}
            {opex.map(exp => (
              <div key={exp.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{exp.categoria}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <Calendar size={12} />
                    {new Date(exp.fecha).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-rose-500 font-bold text-sm">${fmt(exp.monto)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Card CAPEX */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="text-blue-500" /> CAPEX (Inversiones / Activos)
            </h2>
            <span className="text-2xl font-bold text-blue-600">${fmt(totalCapex)}</span>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {capex.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">No hay inversiones registradas en este período.</p>}
            {capex.map(exp => (
              <div key={exp.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{exp.categoria}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <Calendar size={12} />
                    {new Date(exp.fecha).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-blue-500 font-bold text-sm">${fmt(exp.monto)}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
