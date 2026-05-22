import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function ExpenseEntryModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    tipo: 'Fijo',
    categoria: '',
    monto: '',
    aplica_credito_iva: false
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, monto: Number(formData.monto) });
    setFormData({ tipo: 'Fijo', categoria: '', monto: '', aplica_credito_iva: false });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl relative">
        
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">Registrar Gasto Rápido</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Tipo (Radio Buttons rápidos) */}
            <div className="flex gap-4">
              <label className={`flex-1 p-3 rounded-lg border cursor-pointer text-center transition-all ${formData.tipo === 'Fijo' ? 'bg-blue-950 border-blue-500 text-blue-450 font-bold' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                <input type="radio" name="tipo" value="Fijo" className="hidden" checked={formData.tipo === 'Fijo'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} />
                Gasto Fijo
              </label>
              <label className={`flex-1 p-3 rounded-lg border cursor-pointer text-center transition-all ${formData.tipo === 'Variable' ? 'bg-purple-950 border-purple-500 text-purple-450 font-bold' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                <input type="radio" name="tipo" value="Variable" className="hidden" checked={formData.tipo === 'Variable'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} />
                Gasto Variable
              </label>
            </div>

            {/* Categoría y Monto */}
            <div className="space-y-4 mt-2">
              <input 
                type="text" 
                placeholder="Ej: Arriendo, Repuestos, Luz..." 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              />
              
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">$</span>
                <input 
                  type="number" 
                  placeholder="Monto total" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-8 text-white focus:outline-none focus:border-blue-500"
                  value={formData.monto}
                  onChange={(e) => setFormData({...formData, monto: e.target.value})}
                />
              </div>
            </div>

            {/* Toggle IVA */}
            <label className="flex items-center gap-3 p-4 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer mt-2">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-800"
                checked={formData.aplica_credito_iva}
                onChange={(e) => setFormData({...formData, aplica_credito_iva: e.target.checked})}
              />
              <div>
                <p className="text-slate-200 font-medium">Aplica Crédito IVA</p>
                <p className="text-slate-500 text-sm">Descuenta del IVA a pagar mensual</p>
              </div>
            </label>

            {/* Submit */}
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium p-3 rounded-lg mt-4 transition-colors"
            >
              Guardar Egreso
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
