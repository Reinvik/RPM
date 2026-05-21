import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNexusContext } from '../context/NexusContext';

export const useNexusRPM = () => {
  const { companyId, selectedMonth, selectedYear } = useNexusContext();
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);
  const [data, setData] = useState({
    salesTotal: 0,
    fixedCosts: 0,
    variableCosts: 0,
    expenses: [],
    mechanics: [],
    yearlyCashflow: { ingresos: { facturas: [], boletas: [] }, gastos: {} }
  });

  useEffect(() => {
    if (!companyId) return;

    const fetchFinancialData = async () => {
      setLoading(true);
      const currentMonth = selectedMonth;
      const currentYear = selectedYear;

      try {
        // 1. Obtener gastos financieros (schema garage)
        const { data: expensesData, error: expError } = await supabase
          .schema('garage')
          .from('financial_expenses')
          .select('*')
          .eq('company_id', companyId);

        if (expError) console.error("Error fetching expenses:", expError);

        // 2. Obtener mecánicos y su rendimiento (schema garage)
        const { data: mechanicsData, error: mechError } = await supabase
          .schema('garage')
          .from('garage_mechanics')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (mechError) console.error("Error fetching mechanics:", mechError);

        // 3. Obtener ventas del mes actual de POS (garage_sala_ventas)
        // Usamos los valores definidos al inicio del hook (líneas 22-23) basados en el contexto global
        
        const { data: posSales, error: posError } = await supabase
          .schema('garage')
          .from('garage_sala_ventas')
          .select('total, sold_at, document_type')
          .eq('company_id', companyId);

        if (posError) console.error("Error fetching POS sales:", posError);

        // 4. Obtener ventas del mes actual de Taller (garage_tickets)
        const { data: ticketSales, error: ticketError } = await supabase
          .schema('garage')
          .from('garage_tickets')
          .select('id, cost, close_date, status, mechanic, mechanic_ids, services, spare_parts, document_type')
          .eq('company_id', companyId)
          .in('status', ['Entregado', 'Finalizado']);

        if (ticketError) console.error("Error fetching ticket sales:", ticketError);

        // Procesar datos para RPM (Mes actual)
        const expenses = expensesData || [];
        let fixedCosts = 0;
        let variableCosts = 0;

        expenses.forEach(exp => {
          const expDate = new Date(exp.fecha);
          if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            if (exp.categoria !== 'Pago Sueldos') {
              if (exp.tipo === 'Fijo') fixedCosts += Number(exp.monto);
              if (exp.tipo === 'Variable') variableCosts += Number(exp.monto);
            }
          }
        });

        // Sumar Sueldos al Punto de Equilibrio (Mes actual)
        const mechs = mechanicsData || [];
        mechs.forEach(mech => {
          fixedCosts += Number(mech.sueldo_base || 0);
          
          // Buscar tickets de este mes para comisiones
          const ticketsMes = (ticketSales || []).filter(t => {
            if (!t.close_date) return false;
            const cd = new Date(t.close_date);
            if (cd.getMonth() !== currentMonth || cd.getFullYear() !== currentYear) return false;
            return t.mechanic === mech.id || (Array.isArray(t.mechanic_ids) && t.mechanic_ids.includes(mech.id)) ||
                   t.mechanic === mech.name || (Array.isArray(t.mechanic_ids) && t.mechanic_ids.includes(mech.name));
          });

          ticketsMes.forEach(t => {
            if (t.services && Array.isArray(t.services)) {
              t.services.forEach(item => {
                if (item.type !== 'product') {
                  variableCosts += (Number(item.costo || item.price || item.total || 0) * (Number(mech.porcentaje_comision_mo || 0) / 100));
                }
              });
            }
            if (t.spare_parts && Array.isArray(t.spare_parts)) {
              t.spare_parts.forEach(item => {
                if (item.type === 'service') {
                  variableCosts += (Number(item.costo || item.price || item.total || 0) * (Number(mech.porcentaje_comision_mo || 0) / 100));
                } else if (mech.porcentaje_comision_insumos > 0) {
                  variableCosts += (Number(item.costo || item.price || item.total || 0) * (Number(mech.porcentaje_comision_insumos || 0) / 100));
                }
              });
            }
          });
        });

        // Estructura de Flujo de Caja Anual
        const yearlyCashflow = {
          ingresos: {
            facturas: Array(12).fill(0),
            boletas: Array(12).fill(0)
          },
          gastos: {}
        };

        let salesTotal = 0; // Mes actual
        
        // Sumar ventas POS
        (posSales || []).forEach(sale => {
          if (!sale.sold_at) return;
          const saleDate = new Date(sale.sold_at);
          if (saleDate.getFullYear() === currentYear) {
            const m = saleDate.getMonth();
            const val = Number(sale.total || 0);
            if (sale.document_type === 'Factura') yearlyCashflow.ingresos.facturas[m] += val;
            else yearlyCashflow.ingresos.boletas[m] += val; // boletas o nulos
            
            if (m === currentMonth) salesTotal += val;
          }
        });

        // Sumar ventas Tickets
        (ticketSales || []).forEach(ticket => {
          if (!ticket.close_date) return;
          const closeDate = new Date(ticket.close_date);
          if (closeDate.getFullYear() === currentYear) {
            const m = closeDate.getMonth();
            const val = Number(ticket.cost || 0);
            if (ticket.document_type === 'Factura') yearlyCashflow.ingresos.facturas[m] += val;
            else yearlyCashflow.ingresos.boletas[m] += val;
            
            if (m === currentMonth) salesTotal += val;
          }
        });

        // Sumar Gastos al Flujo Anual
        expenses.forEach(exp => {
          const expDate = new Date(exp.fecha);
          if (expDate.getFullYear() === currentYear) {
            const m = expDate.getMonth();
            if (!yearlyCashflow.gastos[exp.categoria]) {
              yearlyCashflow.gastos[exp.categoria] = Array(12).fill(0);
            }
            yearlyCashflow.gastos[exp.categoria][m] += Number(exp.monto);
          }
        });

        // 5. Calcular Pago de Sueldos Mensual para el Flujo de Caja
        const pagoSueldosAnual = Array(12).fill(0);
        
        for (let m = 0; m < 12; m++) {
          let totalSueldosMes = 0;
          
          mechs.forEach(mech => {
            // Sueldo base (estimación con valor actual)
            totalSueldosMes += Number(mech.sueldo_base || 0);
            
            // Comisiones del mes m
            const ticketsMes = (ticketSales || []).filter(t => {
              if (!t.close_date) return false;
              const cd = new Date(t.close_date);
              if (cd.getMonth() !== m || cd.getFullYear() !== currentYear) return false;
              return t.mechanic === mech.id || (Array.isArray(t.mechanic_ids) && t.mechanic_ids.includes(mech.id)) ||
                     t.mechanic === mech.name || (Array.isArray(t.mechanic_ids) && t.mechanic_ids.includes(mech.name));
            });

            ticketsMes.forEach(t => {
              // MO
              if (t.services && Array.isArray(t.services)) {
                t.services.forEach(item => {
                  if (item.type !== 'product') {
                    totalSueldosMes += (Number(item.costo || item.price || item.total || 0) * (Number(mech.porcentaje_comision_mo || 0) / 100));
                  }
                });
              }
              // Insumos
              if (t.spare_parts && Array.isArray(t.spare_parts)) {
                t.spare_parts.forEach(item => {
                  if (item.type === 'service') {
                    totalSueldosMes += (Number(item.costo || item.price || item.total || 0) * (Number(mech.porcentaje_comision_mo || 0) / 100));
                  } else if (mech.porcentaje_comision_insumos > 0) {
                    totalSueldosMes += (Number(item.costo || item.price || item.total || 0) * (Number(mech.porcentaje_comision_insumos || 0) / 100));
                  }
                });
              }
            });
          });
          pagoSueldosAnual[m] = totalSueldosMes;
        }
        yearlyCashflow.gastos["Pago Sueldos"] = pagoSueldosAnual;

        // Formatear mecánicos para el componente (Mes seleccionado solamente)
        const mechanics = (mechanicsData || []).map(m => {
          let mo_generada = 0;
          let insumos_generados = 0;
          
          // Buscar tickets de este mes, cerrados/entregados, asignados a este mecánico
          const ticketsMecanico = (ticketSales || []).filter(t => {
            if (!t.close_date) return false;
            const cd = new Date(t.close_date);
            if (cd.getMonth() !== currentMonth || cd.getFullYear() !== currentYear) return false;
            
            // Coincidencia por ID o Nombre (algunos tickets viejos pueden tener nombres)
            const isIdMatch = t.mechanic === m.id || (Array.isArray(t.mechanic_ids) && t.mechanic_ids.includes(m.id));
            const isNameMatch = t.mechanic === m.name || (Array.isArray(t.mechanic_ids) && t.mechanic_ids.includes(m.name));
            
            return isIdMatch || isNameMatch;
          });

          ticketsMecanico.forEach(t => {
            // Procesar arreglo de servicios
            if (t.services && Array.isArray(t.services)) {
              t.services.forEach(item => {
                const monto = Number(item.costo || item.price || item.total || 0);
                if (item.type === 'product') {
                  insumos_generados += monto;
                } else {
                  mo_generada += monto;
                }
              });
            }
            // Procesar arreglo de repuestos
            if (t.spare_parts && Array.isArray(t.spare_parts)) {
              t.spare_parts.forEach(item => {
                const monto = Number(item.costo || item.price || item.total || 0);
                if (item.type === 'service') {
                  mo_generada += monto;
                } else {
                  insumos_generados += monto;
                }
              });
            }
          });

          return {
            id: m.id,
            name: m.name,
            sueldo_base: Number(m.sueldo_base) || 0,
            porcentaje_comision_mo: Number(m.porcentaje_comision_mo) || 0,
            porcentaje_comision_insumos: Number(m.porcentaje_comision_insumos) || 0,
            mo_generada,
            insumos_generados,
            status: 'pending'
          };
        });

        const filteredExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.fecha);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });

        setData({
          salesTotal,
          fixedCosts,
          variableCosts,
          expenses: filteredExpenses,
          mechanics,
          yearlyCashflow
        });

      } catch (err) {
        console.error("Error global fetching RPM data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [companyId, selectedMonth, selectedYear, trigger]);

  const addExpense = async (expenseData) => {
    if (!companyId) return { error: 'No company ID' };
    
    const { data: newExpense, error } = await supabase
      .schema('garage')
      .from('financial_expenses')
      .insert([{
        ...expenseData,
        company_id: companyId
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding expense:", error);
      return { error };
    }

    // Actualizar estado local
    setData(prev => {
      const expenses = [...prev.expenses, newExpense];
      let fixedCosts = prev.fixedCosts;
      let variableCosts = prev.variableCosts;
      
      if (newExpense.tipo === 'Fijo') fixedCosts += Number(newExpense.monto);
      if (newExpense.tipo === 'Variable') variableCosts += Number(newExpense.monto);

      return {
        ...prev,
        expenses,
        fixedCosts,
        variableCosts
      };
    });

    return { data: newExpense };
  };

  return { data, loading, addExpense, refetchData: () => setTrigger(prev => prev + 1) };
};
