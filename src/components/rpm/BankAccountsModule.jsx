import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  Plus,
  Scale,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';

const ACCOUNT_TYPES = [
  'Cuenta Corriente',
  'Cuenta Vista',
  'Cuenta RUT',
  'Caja Chica',
  'Otra'
];

const RECONCILIATION_REASONS = [
  'Comisión cobrada por máquina POS (Transbank/Redelcom)',
  'Cargo por mantención / transferencia bancaria',
  'Retiro en efectivo sin boleta/comprobante',
  'Vuelto o abono en efectivo no registrado',
  'Diferencia por redondeo o ajuste de caja',
  'Otro motivo auditado'
];

const fmt = (n) => Math.round(n || 0).toLocaleString('es-CL');

export default function BankAccountsModule() {
  const { companyId, companyName } = useNexusContext();

  // Estado del interruptor (Desactivado por defecto)
  const storageKey = `nexusRpm_enableBankAccounts_${companyId}`;
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === 'true';
  });

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Acordeón de la Guía Anti-Descuadres
  const [showGuide, setShowGuide] = useState(false);

  // Modales
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    type: 'Cuenta Corriente',
    account_number: '',
    initial_balance: ''
  });

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementAccount, setMovementAccount] = useState(null);
  const [movementType, setMovementType] = useState('deposito'); // 'deposito' | 'retiro'
  const [movementFormData, setMovementFormData] = useState({
    amount: '',
    description: ''
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState(null);

  // Modal de Conciliación y Arqueo
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileAccount, setReconcileAccount] = useState(null);
  const [realBalanceInput, setRealBalanceInput] = useState('');
  const [reconcileReason, setReconcileReason] = useState(RECONCILIATION_REASONS[0]);

  const [submitting, setSubmitting] = useState(false);

  // Cargar cuentas y transacciones al cambiar la empresa
  useEffect(() => {
    if (!companyId) return;
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cuentas bancarias
      const { data: accData, error: accErr } = await supabase
        .schema('garage')
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (accErr) console.error('Error fetching bank accounts:', accErr);
      setAccounts(accData || []);

      // 2. Transacciones
      const { data: txData, error: txErr } = await supabase
        .schema('garage')
        .from('bank_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (txErr) console.error('Error fetching bank transactions:', txErr);
      setTransactions(txData || []);
    } catch (e) {
      console.error('Error loading treasury data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnable = (value) => {
    setIsEnabled(value);
    localStorage.setItem(storageKey, value ? 'true' : 'false');
  };

  // Crear / Editar Cuenta
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountFormData.name.trim()) return;

    setSubmitting(true);
    try {
      const initialBal = Number(accountFormData.initial_balance || 0);

      if (editingAccount) {
        // Actualizar cuenta
        const { error } = await supabase
          .schema('garage')
          .from('bank_accounts')
          .update({
            name: accountFormData.name.trim(),
            type: accountFormData.type,
            account_number: accountFormData.account_number.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
      } else {
        // Crear cuenta nueva
        const { data: newAcc, error: createErr } = await supabase
          .schema('garage')
          .from('bank_accounts')
          .insert({
            company_id: companyId,
            name: accountFormData.name.trim(),
            type: accountFormData.type,
            account_number: accountFormData.account_number.trim(),
            balance: initialBal,
            reconciliation_status: 'cuadrado',
            last_reconciled_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createErr) throw createErr;

        // Registrar transacción de saldo inicial si > 0
        if (initialBal > 0 && newAcc) {
          await supabase
            .schema('garage')
            .from('bank_transactions')
            .insert({
              company_id: companyId,
              account_id: newAcc.id,
              type: 'deposito',
              amount: initialBal,
              balance_after: initialBal,
              description: 'Saldo inicial de apertura de cuenta'
            });
        }
      }

      setShowAccountModal(false);
      setEditingAccount(null);
      setAccountFormData({ name: '', type: 'Cuenta Corriente', account_number: '', initial_balance: '' });
      fetchData();
    } catch (err) {
      console.error('Error saving account:', err);
      alert('Error al guardar la cuenta bancaria: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Desactivar cuenta
  const handleDeleteAccount = async (acc) => {
    if (!window.confirm(`¿Estás seguro de desactivar la cuenta "${acc.name}"?`)) return;
    try {
      const { error } = await supabase
        .schema('garage')
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('id', acc.id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deactivating account:', err);
      alert('Error al desactivar la cuenta: ' + err.message);
    }
  };

  // Depositar / Retirar dinero de una cuenta
  const handleSaveMovement = async (e) => {
    e.preventDefault();
    const amt = Number(movementFormData.amount || 0);
    if (!movementAccount || amt <= 0) return;

    setSubmitting(true);
    try {
      const isDeposit = movementType === 'deposito';
      const currentBal = Number(movementAccount.balance || 0);
      const newBal = isDeposit ? currentBal + amt : currentBal - amt;

      // 1. Actualizar saldo en la cuenta
      const { error: accErr } = await supabase
        .schema('garage')
        .from('bank_accounts')
        .update({
          balance: newBal,
          updated_at: new Date().toISOString()
        })
        .eq('id', movementAccount.id);

      if (accErr) throw accErr;

      // 2. Registrar transacción
      const { error: txErr } = await supabase
        .schema('garage')
        .from('bank_transactions')
        .insert({
          company_id: companyId,
          account_id: movementAccount.id,
          type: movementType,
          amount: amt,
          balance_after: newBal,
          description: movementFormData.description.trim() || (isDeposit ? 'Abono manual' : 'Retiro manual')
        });

      if (txErr) throw txErr;

      setShowMovementModal(false);
      setMovementAccount(null);
      setMovementFormData({ amount: '', description: '' });
      fetchData();
    } catch (err) {
      console.error('Error saving movement:', err);
      alert('Error al procesar el movimiento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Conciliar y Cuadrar Cuenta (Arqueo)
  const handleConfirmReconcile = async (e) => {
    e.preventDefault();
    if (!reconcileAccount) return;

    const rpmBal = Number(reconcileAccount.balance || 0);
    const realBal = Number(realBalanceInput || 0);
    const diff = realBal - rpmBal; // >0 sobra dinero en banco, <0 descuadre

    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();

      if (Math.abs(diff) < 1) {
        // Cuadre exacto ($0 diferencia)
        const { error } = await supabase
          .schema('garage')
          .from('bank_accounts')
          .update({
            reconciliation_status: 'cuadrado',
            last_reconciled_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', reconcileAccount.id);

        if (error) throw error;
      } else {
        // Hay diferencia de cuadre -> Ajuste auditado
        const isPositive = diff > 0;
        const absDiff = Math.abs(diff);

        // 1. Actualizar saldo real y estatus
        const { error: accErr } = await supabase
          .schema('garage')
          .from('bank_accounts')
          .update({
            balance: realBal,
            reconciliation_status: 'cuadrado',
            last_reconciled_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', reconcileAccount.id);

        if (accErr) throw accErr;

        // 2. Insertar movimiento de ajuste auditado
        const { error: txErr } = await supabase
          .schema('garage')
          .from('bank_transactions')
          .insert({
            company_id: companyId,
            account_id: reconcileAccount.id,
            type: isPositive ? 'deposito' : 'retiro',
            amount: absDiff,
            balance_after: realBal,
            description: `Ajuste de Conciliación Auditado: ${reconcileReason}`
          });

        if (txErr) throw txErr;
      }

      setShowReconcileModal(false);
      setReconcileAccount(null);
      setRealBalanceInput('');
      fetchData();
    } catch (err) {
      console.error('Error reconciling account:', err);
      alert('Error al conciliar la cuenta: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Header del Módulo y Switch de Activación */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Cuentas Bancarias y Tesorería</h1>
              <p className="text-xs text-slate-400 font-semibold">{companyName || 'Tu Empresa'} • Control de Fondos y Conciliación</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Abrir Guía Anti-Descuadre */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold px-3 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <BookOpen size={15} />
            Guía Anti-Descuadres
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Switch de Activación (Desactivado por Defecto) */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-xs font-black text-slate-800">
                {isEnabled ? 'Módulo Activo' : 'Desactivado'}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold">
                {isEnabled ? 'Requiere origen de pago' : 'Pagar sin cuenta'}
              </span>
            </div>
            <button
              onClick={() => handleToggleEnable(!isEnabled)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title="Activar o desactivar control de cuentas bancarias"
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 📘 PANORAMA / GUÍA Y PROTOCOLO ANTI-DESCUADRES (Acordeón) */}
      {showGuide && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-md space-y-4 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl"></div>
          
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-amber-600" />
              <h2 className="font-black text-amber-950 text-base">Protocolo y Guía Anti-Descuadres de Tesorería</h2>
            </div>
            <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-full uppercase">
              5 Reglas de Oro
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-700 font-semibold">
            
            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">1. Registro Instantáneo</span>
              <h4 className="font-extrabold text-slate-900 text-xs">Regla "1 Pago = 1 Registro"</h4>
              <p className="text-[11px] text-slate-600">Nunca dejar comprobantes ni egresos para registrar "al final del día". Registra el egreso en el mismo segundo en que sale el dinero.</p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">2. Comisiones POS</span>
              <h4 className="font-extrabold text-slate-900 text-xs">Máquinas de Tarjeta (Transbank)</h4>
              <p className="text-[11px] text-slate-600">Las comisiones por uso de POS descuentan un % directo del banco. Registra la comisión mensual como egreso de costo bancario.</p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">3. Arqueo Diario</span>
              <h4 className="font-extrabold text-slate-900 text-xs">Conteo Físico de Caja Chica</h4>
              <p className="text-[11px] text-slate-600">Antes de cerrar el taller, cuenta el dinero billete por billete. Usa el botón "Conciliar Cuenta" para comprobar el 100% de coincidencia.</p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">4. Vueltos y Retiros</span>
              <h4 className="font-extrabold text-slate-900 text-xs">Vueltos y Gastos Menores</h4>
              <p className="text-[11px] text-slate-600">Si sacas $2.000 para comprar agua o repuestos rápidos, regístralo de inmediato. Un pequeño descuadre diario suma $60.000 al mes.</p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-1 md:col-span-2 lg:col-span-2">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">5. Conciliación Semanal</span>
              <h4 className="font-extrabold text-slate-900 text-xs">Revisión de Cartola Bancaria</h4>
              <p className="text-[11px] text-slate-600">Usa el botón <strong className="text-amber-800">"⚖️ Conciliar / Cuadrar Cuenta"</strong> en cada tarjeta para comparar el saldo real de la web de tu banco contra RPM y certificar el cuadre.</p>
            </div>

          </div>
        </div>
      )}

      {/* Banner Informativo si está desactivado */}
      {!isEnabled && (
        <div className="bg-gradient-to-r from-amber-50/90 to-amber-100/50 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <h3 className="font-extrabold text-amber-900 text-sm">Control de Cuentas Desactivado (Modo Estándar)</h3>
            <p>
              Actualmente estás operando en el modo estándar predeterminado. Al registrar o pagar facturas y egresos, el sistema no requerirá seleccionar una cuenta de origen.
            </p>
            <p className="font-semibold text-amber-800 pt-1">
              💡 Puedes activar la función usando el interruptor superior para administrar tus saldos bancarios y ver de qué cuenta se paga cada egreso.
            </p>
          </div>
        </div>
      )}

      {/* Resumen Total y Botón de Nueva Cuenta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Fondos Disponibles */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between md:col-span-2">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-100">Saldo Total Disponible en Tesorería</span>
              <span className="text-[10px] font-extrabold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
                {accounts.length} Cuentas Activas
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black">${fmt(totalBalance)}</div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-blue-100 font-semibold">
            <span>Suma total acumulada en Cuentas Corrientes, Vista y Cajas</span>
            <button
              onClick={() => {
                setSelectedHistoryAccount(null);
                setShowHistoryModal(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History size={14} />
              Ver Todo el Historial
            </button>
          </div>
        </div>

        {/* Tarjeta de Acción: Crear Nueva Cuenta */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Gestión de Cuentas</span>
            <h3 className="font-extrabold text-slate-800 text-base">¿Deseas agregar una nueva cuenta bancaria o caja?</h3>
            <p className="text-xs text-slate-500 mt-1">Registra cuentas Vista, Corriente, Cuenta RUT o Cajas Chicas.</p>
          </div>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountFormData({ name: '', type: 'Cuenta Corriente', account_number: '', initial_balance: '' });
              setShowAccountModal(true);
            }}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            Crear Nueva Cuenta
          </button>
        </div>

      </div>

      {/* Listado de Tarjetas de Cuentas Bancarias */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            Cuentas Bancarias Registradas ({accounts.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">Cargando cuentas bancarias...</div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <CreditCard size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No hay cuentas bancarias registradas aún.</p>
            <p className="text-xs text-slate-400">Presiona el botón "Crear Nueva Cuenta" para dar de alta tu primera Cuenta Corriente o Vista.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => {
              const bal = Number(acc.balance || 0);
              const isNegative = bal < 0;
              const isCuadrado = acc.reconciliation_status === 'cuadrado';
              const lastReconciled = acc.last_reconciled_at 
                ? new Date(acc.last_reconciled_at).toLocaleDateString('es-CL') 
                : null;

              return (
                <div key={acc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl"></div>
                  
                  {/* Encabezado Cuenta */}
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider inline-block">
                            {acc.type}
                          </span>
                          
                          {/* Badge de Estatus de Cuadre */}
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isCuadrado 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <CheckCircle2 size={11} />
                            {isCuadrado ? 'Cuadrada 100%' : 'Pendiente Auditar'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-800 text-base leading-tight">{acc.name}</h3>
                        {acc.account_number && (
                          <p className="text-xs text-slate-400 font-medium mt-0.5">N° {acc.account_number}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setAccountFormData({
                              name: acc.name,
                              type: acc.type,
                              account_number: acc.account_number || '',
                              initial_balance: ''
                            });
                            setShowAccountModal(true);
                          }}
                          className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Editar Cuenta"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Desactivar Cuenta"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Saldo Actual */}
                    <div className="mt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Disponible</span>
                        {lastReconciled && (
                          <span className="text-[9px] text-slate-400 font-semibold">Auditada: {lastReconciled}</span>
                        )}
                      </div>
                      <div className={`text-2xl font-black ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                        ${fmt(bal)}
                      </div>
                    </div>
                  </div>

                  {/* Botón de Conciliación y Acciones Rápida */}
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                    
                    {/* Botón Destacado: Conciliar / Cuadrar Cuenta */}
                    <button
                      onClick={() => {
                        setReconcileAccount(acc);
                        setRealBalanceInput(acc.balance ? String(acc.balance) : '0');
                        setReconcileReason(RECONCILIATION_REASONS[0]);
                        setShowReconcileModal(true);
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                    >
                      <Scale size={15} className="text-cyan-400" />
                      Conciliar / Cuadrar Cuenta
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setMovementAccount(acc);
                          setMovementType('deposito');
                          setMovementFormData({ amount: '', description: '' });
                          setShowMovementModal(true);
                        }}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <PlusCircle size={13} />
                        Abonar
                      </button>

                      <button
                        onClick={() => {
                          setMovementAccount(acc);
                          setMovementType('retiro');
                          setMovementFormData({ amount: '', description: '' });
                          setShowMovementModal(true);
                        }}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <MinusCircle size={13} />
                        Retirar
                      </button>

                      <button
                        onClick={() => {
                          setSelectedHistoryAccount(acc);
                          setShowHistoryModal(true);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                        title="Ver Historial de Movimientos"
                      >
                        <History size={15} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reciente Registro de Movimientos */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <History size={15} className="text-blue-600" />
            Últimos Movimientos de Tesorería ({transactions.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[9px] border-b border-slate-200">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-3">Cuenta</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-right">Saldo Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {transactions.slice(0, 10).map((tx) => {
                  const acc = accounts.find(a => a.id === tx.account_id);
                  const isDeposit = tx.type === 'deposito';
                  const dateStr = new Date(tx.created_at).toLocaleDateString('es-CL');

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{dateStr}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{acc ? acc.name : 'Cuenta'}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                          isDeposit
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isDeposit ? '+ Abono' : '- Retiro/Pago'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{tx.description}</td>
                      <td className={`py-3 px-4 text-right font-black ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isDeposit ? `+$${fmt(tx.amount)}` : `-$${fmt(tx.amount)}`}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">${fmt(tx.balance_after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Conciliar / Cuadrar Cuenta ── */}
      {showReconcileModal && reconcileAccount && (() => {
        const rpmBal = Number(reconcileAccount.balance || 0);
        const realBal = Number(realBalanceInput || 0);
        const diff = realBal - rpmBal;
        const isPerfect = Math.abs(diff) < 1;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <Scale size={18} className="text-cyan-400" />
                  <h3 className="font-extrabold text-sm">Conciliación y Arqueo de Cuenta</h3>
                </div>
                <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmReconcile} className="p-6 space-y-4 text-xs font-semibold">
                
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Cuenta a Auditado</span>
                  <p className="font-extrabold text-slate-900 text-sm">{reconcileAccount.name}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 font-semibold">Saldo Registrado en RPM:</span>
                    <span className="font-black text-slate-900">${fmt(rpmBal)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-extrabold">
                    Saldo Real Actual ($) <span className="text-slate-400 font-normal">(Cartola del Banco o Conteo Físico)</span> *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="ej. 1500000"
                    value={realBalanceInput}
                    onChange={(e) => setRealBalanceInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-black text-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Resultado del Cálculo de Cuadre */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isPerfect 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {isPerfect ? (
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs">
                      {isPerfect ? '¡Cuenta Cuadrada al 100%!' : `Diferencia de Cuadre: ${diff > 0 ? '+' : ''}$${fmt(diff)}`}
                    </h4>
                    <p className="text-[11px] leading-relaxed">
                      {isPerfect 
                        ? 'El saldo de RPM coincide perfectamente con la cartola o caja. Al confirmar se certificará el estado auditado.' 
                        : `Existe una variación de $${fmt(Math.abs(diff))}. Selecciona la causa a continuación para registrar el ajuste auditado.`}
                    </p>
                  </div>
                </div>

                {!isPerfect && (
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">Causa del Descuadre *</label>
                    <select
                      value={reconcileReason}
                      onChange={(e) => setReconcileReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {RECONCILIATION_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReconcileModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    {submitting ? 'Guardando...' : isPerfect ? 'Certificar Cuadre' : 'Aplicar Ajuste Auditado'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: Crear / Editar Cuenta ── */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">
                {editingAccount ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria / Caja'}
              </h3>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 mb-1 font-bold">Nombre de la Cuenta *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Banco Estado - Cta Corriente"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">Tipo de Cuenta *</label>
                <select
                  value={accountFormData.type}
                  onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">N° de Cuenta / Identificador (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. 123456789"
                  value={accountFormData.account_number}
                  onChange={(e) => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!editingAccount && (
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Saldo Inicial ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={accountFormData.initial_balance}
                    onChange={(e) => setAccountFormData({ ...accountFormData, initial_balance: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Monto de apertura disponible en esta cuenta.</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all"
                >
                  {submitting ? 'Guardando...' : editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Abono / Retiro Manual ── */}
      {showMovementModal && movementAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className={`p-5 border-b border-slate-100 flex justify-between items-center ${
              movementType === 'deposito' ? 'bg-emerald-50' : 'bg-rose-50'
            }`}>
              <h3 className={`font-extrabold text-sm ${movementType === 'deposito' ? 'text-emerald-900' : 'text-rose-900'}`}>
                {movementType === 'deposito' ? '+ Abonar Dinero a Cuenta' : '- Retirar Dinero de Cuenta'}
              </h3>
              <button onClick={() => setShowMovementModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-6 space-y-4 text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Cuenta Seleccionada</span>
                <p className="font-extrabold text-slate-800 text-sm">{movementAccount.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold">Saldo actual: ${fmt(movementAccount.balance)}</p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">Monto ($) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ej. 150000"
                  value={movementFormData.amount}
                  onChange={(e) => setMovementFormData({ ...movementFormData, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">Motivo / Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'deposito' ? 'ej. Depósito por transferencia clientes' : 'ej. Retiro para caja chica'}
                  value={movementFormData.description}
                  onChange={(e) => setMovementFormData({ ...movementFormData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-xl font-bold text-white shadow-md transition-all ${
                    movementType === 'deposito' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Procesando...' : movementType === 'deposito' ? 'Confirmar Abono' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Historial Completo de Transacciones ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Historial de Movimientos de Tesorería
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  {selectedHistoryAccount ? `Filtrado por: ${selectedHistoryAccount.name}` : 'Todas las Cuentas'}
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {transactions.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No hay transacciones registradas.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[9px] border-b border-slate-200">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-3">Cuenta</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4 text-right">Saldo Resultante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {transactions
                      .filter(tx => !selectedHistoryAccount || tx.account_id === selectedHistoryAccount.id)
                      .map((tx) => {
                        const acc = accounts.find(a => a.id === tx.account_id);
                        const isDeposit = tx.type === 'deposito';
                        const dateStr = new Date(tx.created_at).toLocaleString('es-CL');

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 text-slate-400">{dateStr}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{acc ? acc.name : 'Cuenta'}</td>
                            <td className="py-3 px-3">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                isDeposit
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {isDeposit ? '+ Abono' : '- Retiro/Pago'}
                              </span>
                            </td>
                            <td className="py-3 px-4">{tx.description}</td>
                            <td className={`py-3 px-4 text-right font-black ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isDeposit ? `+$${fmt(tx.amount)}` : `-$${fmt(tx.amount)}`}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-800">${fmt(tx.balance_after)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-bold"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
