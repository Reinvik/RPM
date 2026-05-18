import React, { useState } from 'react';
import { Users, PlusCircle } from 'lucide-react';
import MechanicSettlement from './MechanicSettlement';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';
import { supabase } from '../../lib/supabase';

export default function PayrollModule() {
  const { data: { mechanics }, loading } = useNexusRPM();
  const { companyId } = useNexusContext();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sueldo_base: '',
    porcentaje_comision_mo: '',
    porcentaje_comision_insumos: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setSaving(true);
    const { error } = await supabase
      .schema('garage')
      .from('garage_mechanics')
      .insert({
        company_id: companyId,
        name: formData.name,
        sueldo_base: Number(formData.sueldo_base) || 0,
        porcentaje_comision_mo: Number(formData.porcentaje_comision_mo) || 0,
        porcentaje_comision_insumos: Number(formData.porcentaje_comision_insumos) || 0,
        is_active: true
      });
      
    setSaving(false);
    
    if (!error) {
      setShowForm(false);
      setFormData({ name: '', sueldo_base: '', porcentaje_comision_mo: '', porcentaje_comision_insumos: '' });
      window.location.reload(); // Recargar para ver el nuevo mecánico
    } else {
      alert("Error al agregar personal: " + error.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-600">Cargando nómina...</div>;
  }

  return (
    <div className="p-8 font-sans bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            Nómina y Liquidaciones
          </h1>
          <p className="text-slate-500 mt-1">Gestión de sueldos base y comisiones del personal.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <PlusCircle size={20} />
          {showForm ? 'Cerrar Formulario' : 'Agregar Personal'}
        </button>
      </div>

      {/* Formulario de Registro */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Registrar Nuevo Personal</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sueldo Base ($)</label>
              <input
                type="number"
                value={formData.sueldo_base}
                onChange={(e) => setFormData({...formData, sueldo_base: e.target.value})}
                placeholder="Ej: 500000"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">% Comisión MO</label>
              <input
                type="number"
                value={formData.porcentaje_comision_mo}
                onChange={(e) => setFormData({...formData, porcentaje_comision_mo: e.target.value})}
                placeholder="Ej: 30"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">% Comisión Insumos</label>
              <input
                type="number"
                value={formData.porcentaje_comision_insumos}
                onChange={(e) => setFormData({...formData, porcentaje_comision_insumos: e.target.value})}
                placeholder="Ej: 5"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Personal'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-slate-500 mb-6 text-sm">
          Gestión de liquidaciones, sueldos base y comisiones generadas por servicios de taller. 
          Al aprobar una liquidación, se descontará del margen operativo mensual.
        </p>
        <MechanicSettlement mechanics={mechanics} />
      </div>
    </div>
  );
}
