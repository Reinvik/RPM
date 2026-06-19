import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

/**
 * Modal de confirmación reutilizable — reemplaza window.confirm()
 * 
 * Props:
 *  isOpen    {boolean}   - Controla visibilidad
 *  title     {string}    - Título del diálogo
 *  message   {string}    - Mensaje o pregunta principal
 *  onConfirm {function}  - Callback al confirmar
 *  onCancel  {function}  - Callback al cancelar
 *  variant   {string}    - 'danger' | 'warning' | 'info' (default: 'warning')
 *  confirmText {string}  - Texto botón confirmar (default: 'Confirmar')
 *  cancelText  {string}  - Texto botón cancelar  (default: 'Cancelar')
 */
export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message = '',
  onConfirm,
  onCancel,
  variant = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}) {
  if (!isOpen) return null;

  const styles = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
      border: 'border-rose-200',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      btn: 'bg-amber-500 hover:bg-amber-600 text-white',
      border: 'border-amber-200',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
      border: 'border-blue-200',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      border: 'border-emerald-200',
    },
  };

  const s = styles[variant] || styles.warning;
  const Icon = s.icon;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border ${s.border} w-full max-w-sm animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${s.iconBg} shrink-0`}>
              <Icon size={20} className={s.iconColor} />
            </span>
            <h3 className="text-sm font-extrabold text-slate-800 leading-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mensaje */}
        {message && (
          <div className="px-5 pb-5">
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm ${s.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
