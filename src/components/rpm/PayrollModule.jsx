import React, { useState } from 'react';
import { Users, PlusCircle } from 'lucide-react';
import MechanicSettlement from './MechanicSettlement';
import { useNexusRPM } from '../../hooks/useNexusRPM';
import { useNexusContext } from '../../context/NexusContext';
import { supabase } from '../../lib/supabase';

export default function PayrollModule() {
  const { data: { mechanics }, loading, refetchData } = useNexusRPM();
  const { companyId } = useNexusContext();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sueldo_base: '',
    porcentaje_comision_mo: '',
    porcentaje_comision_insumos: '',
    tipo: 'Fijo'
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
        tipo: formData.tipo,
        is_active: true
      });
      
    setSaving(false);
    
    if (!error) {
      setShowForm(false);
      setFormData({ name: '', sueldo_base: '', porcentaje_comision_mo: '', porcentaje_comision_insumos: '', tipo: 'Fijo' });
      refetchData(); // Refrescar localmente
    } else {
      alert("Error al agregar personal: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-600">Cargando nómina...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 text-sm">Gestión de sueldos base y comisiones del personal.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm font-semibold"
        >
          <PlusCircle size={20} />
          {showForm ? 'Cerrar Formulario' : 'Agregar Personal'}
        </button>
      </div>

      {/* Formulario de Registro */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl mb-8 transition-all duration-300 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            Registrar Nuevo Personal
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5 items-end">
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Sueldo Base ($)</label>
              <input
                type="number"
                value={formData.sueldo_base}
                onChange={(e) => setFormData({...formData, sueldo_base: e.target.value})}
                placeholder="Ej: 500000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">% Comisión MO</label>
              <input
                type="number"
                value={formData.porcentaje_comision_mo}
                onChange={(e) => setFormData({...formData, porcentaje_comision_mo: e.target.value})}
                placeholder="Ej: 30"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">% Comisión Insumos</label>
              <input
                type="number"
                value={formData.porcentaje_comision_insumos}
                onChange={(e) => setFormData({...formData, porcentaje_comision_insumos: e.target.value})}
                placeholder="Ej: 5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo de Remuneración</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'Fijo'})}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                    formData.tipo === 'Fijo' 
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Fija
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'Variable'})}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                    formData.tipo === 'Variable' 
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Variable
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Personal'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-slate-500 text-sm">
          Gestión de liquidaciones, sueldos base y comisiones generadas por servicios de taller. 
          Al aprobar una liquidación, se descontará del margen operativo mensual.
        </p>
        <MechanicSettlement mechanics={mechanics} onUpdate={refetchData} />
      </div>
    </div>
  );
}
