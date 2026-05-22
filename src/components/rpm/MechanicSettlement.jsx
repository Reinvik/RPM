import React, { useState } from 'react';
import { CheckCircle, Edit2, Save, X, FileText, Calendar, CreditCard, Briefcase, Repeat } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MechanicSettlement({ mechanics, onUpdate }) {
  const { companyId } = useNexusContext();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ 
    sueldo_base: 0, 
    porcentaje_comision_mo: 0, 
    porcentaje_comision_insumos: 0,
    prestamos: 0,
    descuentos: 0,
    asistencia: 0,
    vacaciones_acumuladas: 0,
    vacaciones_tomadas: 0,
    fecha_ingreso: '',
    rut: '',
    cargo: '',
    bonos: 0,
    tipo: 'Fijo'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  // Default data as fallback
  const defaultMechanics = [
    { id: 1, name: 'Carlos Mendoza', sueldo_base: 500000, porcentaje_comision_mo: 30, mo_generada: 1200000, status: 'pending' }
  ];

  const data = mechanics && mechanics.length > 0 ? mechanics : defaultMechanics;

  const handleEditClick = (mech) => {
    setEditingId(mech.id);
    setEditValues({
      sueldo_base: mech.sueldo_base,
      porcentaje_comision_mo: mech.porcentaje_comision_mo,
      porcentaje_comision_insumos: mech.porcentaje_comision_insumos || 0,
      prestamos: mech.prestamos || 0,
      descuentos: mech.descuentos || 0,
      asistencia: mech.asistencia || 0,
      vacaciones_acumuladas: mech.vacaciones_acumuladas || 0,
      vacaciones_tomadas: mech.vacaciones_tomadas || 0,
      fecha_ingreso: mech.fecha_ingreso || '',
      rut: mech.rut || '',
      cargo: mech.cargo || '',
      bonos: mech.bonos || 0,
      tipo: mech.tipo || 'Fijo'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (mechId) => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .schema('garage')
        .from('garage_mechanics')
        .update({
          sueldo_base: Number(editValues.sueldo_base),
          porcentaje_comision_mo: Number(editValues.porcentaje_comision_mo),
          porcentaje_comision_insumos: Number(editValues.porcentaje_comision_insumos),
          prestamos: Number(editValues.prestamos),
          descuentos: Number(editValues.descuentos),
          asistencia: Number(editValues.asistencia),
          vacaciones_acumuladas: Number(editValues.vacaciones_acumuladas),
          vacaciones_tomadas: Number(editValues.vacaciones_tomadas),
          fecha_ingreso: editValues.fecha_ingreso || null,
          rut: editValues.rut || null,
          cargo: editValues.cargo || null,
          bonos: Number(editValues.bonos),
          tipo: editValues.tipo
        })
        .eq('id', mechId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert("⚠️ No se guardaron los cambios. Es posible que no tengas permisos (RLS) para editar este mecánico o que el registro no exista.");
      } else {
        setEditingId(null);
        if (onUpdate) onUpdate();
        else window.location.reload(); 
      }
    } catch (err) {
      console.error("Error updating mechanic:", err);
      alert("Error al guardar. " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (mech) => {
    setGeneratingPdf(mech.id);
    try {
      const doc = new jsPDF();
      
      // Fetch settings
      const { data: settings } = await supabase
        .schema('garage')
        .from('garage_settings')
        .select('logo_url, workshop_name, address')
        .eq('company_id', companyId)
        .single();
        
      const workshopName = settings?.workshop_name || 'Mi Taller';
      const workshopAddress = settings?.address || 'Dirección no especificada';
      const logoUrl = settings?.logo_url;
      
      // --- DISEÑO DE CABECERA PREMIUM ---
      let employerStartX = 15;
      
      // Dibujar logo si existe
      if (logoUrl) {
        try {
          const img = new Image();
          img.src = logoUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          doc.addImage(img, 'PNG', 15, 12, 22, 22);
          employerStartX = 42; // Movemos los datos de la empresa a la derecha del logo
        } catch (e) {
          console.error("Error loading logo", e);
        }
      }

      // Datos del Empleador (Sin bordes rígidos, estilo premium limpio)
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(workshopName, employerStartX, 17);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`RUT: 12.345.678-9`, employerStartX, 23);
      doc.text(workshopAddress, employerStartX, 28);

      // Título y detalles a la derecha
      doc.setTextColor(29, 78, 216); // blue-700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("LIQUIDACIÓN DE REMUNERACIONES", 110, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const currentMonthYear = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      const capitalMonthYear = currentMonthYear.charAt(0).toUpperCase() + currentMonthYear.slice(1);
      doc.text(`Período: ${capitalMonthYear}`, 110, 24);
      doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-CL')}`, 110, 29);

      // Línea divisoria decorativa
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(10, 38, 200, 38);

      // --- DATOS DEL COLABORADOR ---
      // Panel con fondo suave y bordes finos
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.roundedRect(10, 43, 190, 28, 2, 2, 'FD'); // Caja con fondo y borde

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // slate-700

      const currentCargo = mech.cargo || 'Mecánico';
      const joinDate = mech.fecha_ingreso ? new Date(mech.fecha_ingreso).toLocaleDateString('es-CL') : 'No especificada';

      // Columna 1 de datos
      doc.setFont("helvetica", "bold");
      doc.text("Colaborador:", 15, 50);
      doc.setFont("helvetica", "normal");
      doc.text(mech.name, 40, 50);

      doc.setFont("helvetica", "bold");
      doc.text("Cargo:", 15, 57);
      doc.setFont("helvetica", "normal");
      doc.text(currentCargo, 40, 57);

      doc.setFont("helvetica", "bold");
      doc.text("Días Trab.:", 15, 64);
      doc.setFont("helvetica", "normal");
      doc.text(`${mech.asistencia || 0} días`, 40, 64);

      // Columna 2 de datos
      doc.setFont("helvetica", "bold");
      doc.text("RUT Colaborador:", 115, 50);
      doc.setFont("helvetica", "normal");
      doc.text(mech.rut || 'No especificado', 148, 50);

      doc.setFont("helvetica", "bold");
      doc.text("Fecha Ingreso:", 115, 57);
      doc.setFont("helvetica", "normal");
      doc.text(joinDate, 148, 57);

      doc.setFont("helvetica", "bold");
      doc.text("Tipo Contrato:", 115, 64);
      doc.setFont("helvetica", "normal");
      doc.text((mech.tipo || 'Fijo') === 'Fijo' ? 'Sueldo Fijo' : 'Sueldo Variable / Comisión', 148, 64);

      // --- TABLA DE DETALLES (HABERES Y DESCUENTOS) ---
      const comisionMO = mech.mo_generada * (mech.porcentaje_comision_mo / 100);
      const comisionInsumos = (mech.insumos_generados || 0) * (mech.porcentaje_comision_insumos / 100);
      
      // Descuentos Legales
      const afp = mech.sueldo_base * 0.1145; // 11.45%
      const fonasa = mech.sueldo_base * 0.07; // 7%
      const seguroCesantia = mech.sueldo_base * 0.006; // 0.6%
      const totalDescuentosLegales = afp + fonasa + seguroCesantia;
      
      const prestamos = mech.prestamos || 0;
      const descuentos = mech.descuentos || 0;
      
      const totalHaberes = mech.sueldo_base + comisionMO + comisionInsumos + (mech.bonos || 0);
      const totalDescuentos = totalDescuentosLegales + prestamos + descuentos;
      const liquidoAPagar = totalHaberes - totalDescuentos;
      
      const tableData = [
        ['Detalle', 'Haberes', 'Descuentos'],
        ['HABERES', '', ''],
        ['Sueldo Base', `$${mech.sueldo_base.toLocaleString('es-CL')}`, ''],
        [`Comisión MO (${mech.porcentaje_comision_mo}%)`, `$${comisionMO.toLocaleString('es-CL')}`, ''],
        [`Comisión Insumos (${mech.porcentaje_comision_insumos || 0}%)`, `$${comisionInsumos.toLocaleString('es-CL')}`, ''],
        ['Bonos', `$${(mech.bonos || 0).toLocaleString('es-CL')}`, ''],
        ['DESCUENTOS LEGALES', '', ''],
        ['11,45% Cotización AFP', '', `$${Math.round(afp).toLocaleString('es-CL')}`],
        ['7% FONASA', '', `$${Math.round(fonasa).toLocaleString('es-CL')}`],
        ['0,6% Seguro de Cesantía', '', `$${Math.round(seguroCesantia).toLocaleString('es-CL')}`],
        ['OTROS DESCUENTOS', '', ''],
        ['Préstamos', '', `$${prestamos.toLocaleString('es-CL')}`],
        ['Descuentos varios', '', `$${descuentos.toLocaleString('es-CL')}`],
        ['TOTALES', `$${totalHaberes.toLocaleString('es-CL')}`, `$${Math.round(totalDescuentos).toLocaleString('es-CL')}`]
      ];
      
      autoTable(doc, {
        startY: 77,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'plain',
        headStyles: { 
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5
        },
        styles: { 
          fontSize: 8.5,
          textColor: [51, 65, 85], // Slate 700
          lineColor: [226, 232, 240], // Slate 200
          lineWidth: 0.5
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' },
          2: { halign: 'right' }
        },
        didParseCell: function (data) {
          const rowText = data.row.cells[0].text[0];
          // Si es título de sección
          if (rowText === 'HABERES' || rowText === 'DESCUENTOS LEGALES' || rowText === 'OTROS DESCUENTOS') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249]; // Slate 100
            data.cell.styles.textColor = [15, 23, 42]; // Slate 900
          }
          // Si es la fila de totales
          if (rowText === 'TOTALES') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [226, 232, 240]; // Slate 200
            data.cell.styles.textColor = [15, 23, 42]; // Slate 900
          }
        }
      });
      
      // --- LÍQUIDO A PAGAR DESTACADO ---
      const finalY = doc.lastAutoTable.finalY + 6;
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.setLineWidth(0.5);
      doc.roundedRect(10, finalY, 190, 12, 1.5, 1.5, 'FD');

      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(6, 78, 59); // emerald-800
      doc.text(`LÍQUIDO A PAGAR:`, 15, finalY + 8);
      
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87); // emerald-700
      const formattedLiquido = `$${Math.round(liquidoAPagar).toLocaleString('es-CL')}`;
      doc.text(formattedLiquido, 195 - doc.getTextWidth(formattedLiquido), finalY + 8.5);
      
      // --- SECCIÓN DE FIRMAS ---
      const sigY = finalY + 32;
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.setLineWidth(0.5);
      
      // Firma Empleador
      doc.line(25, sigY, 85, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Firma Empleador / Taller', 38, sigY + 5);
      
      // Firma Colaborador
      doc.line(125, sigY, 185, sigY);
      doc.text('Firma Colaborador', 142, sigY + 5);
      
      // Recibo de conformidad sutil
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Declaro recibir a mi entera conformidad el saldo líquido indicado en este documento.', 45, sigY + 16);
      
      // Registrar el gasto en Supabase
      const { error: expenseError } = await supabase
        .schema('garage')
        .from('financial_expenses')
        .insert({
          company_id: companyId,
          tipo: mech.tipo || 'Fijo',
          categoria: 'Pago Sueldos',
          monto: Math.round(liquidoAPagar),
          fecha: new Date().toISOString().split('T')[0],
          aplica_credito_iva: false
        });

      if (expenseError) {
        console.error("Error al registrar egreso de sueldo:", expenseError);
        alert("Advertencia: Se generó el PDF pero no se pudo registrar el gasto automático: " + expenseError.message);
      } else {
        const tipoMsg = (mech.tipo || 'Fijo') === 'Fijo' ? 'egreso fijo recurrente' : 'egreso variable';
        alert(`✅ Liquidación aprobada y ${tipoMsg} de sueldo registrado por $${Math.round(liquidoAPagar).toLocaleString('es-CL')}`);
        if (onUpdate) onUpdate();
      }

      doc.save(`Liquidacion_${mech.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error al generar PDF: " + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((mech) => {
        const isEditing = editingId === mech.id;
        
        const currentSueldo = isEditing ? Number(editValues.sueldo_base) : mech.sueldo_base;
        const currentPorcMO = isEditing ? Number(editValues.porcentaje_comision_mo) : mech.porcentaje_comision_mo;
        const currentPorcInsumos = isEditing ? Number(editValues.porcentaje_comision_insumos) : (mech.porcentaje_comision_insumos || 0);
        const currentPrestamos = isEditing ? Number(editValues.prestamos) : (mech.prestamos || 0);
        const currentDescuentos = isEditing ? Number(editValues.descuentos) : (mech.descuentos || 0);
        const currentAsistencia = isEditing ? Number(editValues.asistencia) : (mech.asistencia || 0);
        const currentVacaciones = isEditing ? Number(editValues.vacaciones_acumuladas) : (mech.vacaciones_acumuladas || 0);
        const currentVacacionesTomadas = isEditing ? Number(editValues.vacaciones_tomadas) : (mech.vacaciones_tomadas || 0);
        const currentFechaIngreso = isEditing ? editValues.fecha_ingreso : (mech.fecha_ingreso || '');
        const currentRut = isEditing ? editValues.rut : (mech.rut || '');
        const currentCargo = isEditing ? editValues.cargo : (mech.cargo || '');
        const currentBonos = isEditing ? Number(editValues.bonos) : (mech.bonos || 0);
        
        const comisionMO = mech.mo_generada * (currentPorcMO / 100);
        const comisionInsumos = (mech.insumos_generados || 0) * (currentPorcInsumos / 100);
        
        // Calcular descuentos legales
        const afp = currentSueldo * 0.1145;
        const fonasa = currentSueldo * 0.07;
        const seguroCesantia = currentSueldo * 0.006;
        const totalDescuentosLegales = afp + fonasa + seguroCesantia;
        
        const totalHaberes = currentSueldo + comisionMO + comisionInsumos + currentBonos;
        const totalDescuentos = totalDescuentosLegales + currentPrestamos + currentDescuentos;
        const total = totalHaberes - totalDescuentos;
        const isApproved = mech.status === 'approved';

        const initials = mech.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return (
          <div key={mech.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between">
            {/* Si está editando */}
            {isEditing ? (
              <div className="p-6 space-y-4 text-xs">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{mech.name}</h3>
                    <span className="text-[10px] text-slate-400">Editando Ficha de Colaborador</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">RUT</label>
                    <input 
                      type="text" 
                      placeholder="RUT"
                      value={editValues.rut}
                      onChange={(e) => setEditValues({...editValues, rut: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cargo</label>
                    <input 
                      type="text" 
                      placeholder="Cargo"
                      value={editValues.cargo}
                      onChange={(e) => setEditValues({...editValues, cargo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fecha Ingreso</label>
                    <input 
                      type="date" 
                      value={editValues.fecha_ingreso}
                      onChange={(e) => setEditValues({...editValues, fecha_ingreso: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Remuneración</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setEditValues({...editValues, tipo: 'Fijo'})}
                        className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                          editValues.tipo === 'Fijo' 
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Fija
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditValues({...editValues, tipo: 'Variable'})}
                        className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                          editValues.tipo === 'Variable' 
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Variable
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Días Trabajados</label>
                    <input 
                      type="number" 
                      value={editValues.asistencia}
                      onChange={(e) => setEditValues({...editValues, asistencia: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vac. Acumuladas</label>
                    <input 
                      type="number" 
                      value={editValues.vacaciones_acumuladas}
                      onChange={(e) => setEditValues({...editValues, vacaciones_acumuladas: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vac. Tomadas</label>
                    <input 
                      type="number" 
                      value={editValues.vacaciones_tomadas}
                      onChange={(e) => setEditValues({...editValues, vacaciones_tomadas: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide block">Parámetros de Liquidación</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Sueldo Base ($)</label>
                      <input 
                        type="number" 
                        value={editValues.sueldo_base}
                        onChange={(e) => setEditValues({...editValues, sueldo_base: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Bonos ($)</label>
                      <input 
                        type="number" 
                        value={editValues.bonos}
                        onChange={(e) => setEditValues({...editValues, bonos: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">% Comisión MO</label>
                      <input 
                        type="number" 
                        value={editValues.porcentaje_comision_mo}
                        onChange={(e) => setEditValues({...editValues, porcentaje_comision_mo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">% Comisión Insumos</label>
                      <input 
                        type="number" 
                        value={editValues.porcentaje_comision_insumos}
                        onChange={(e) => setEditValues({...editValues, porcentaje_comision_insumos: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Préstamos ($)</label>
                      <input 
                        type="number" 
                        value={editValues.prestamos}
                        onChange={(e) => setEditValues({...editValues, prestamos: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Descuentos Varios ($)</label>
                      <input 
                        type="number" 
                        value={editValues.descuentos}
                        onChange={(e) => setEditValues({...editValues, descuentos: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Haberes:</span>
                    <span className="font-semibold text-slate-800">${Math.round(totalHaberes).toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Descuentos:</span>
                    <span className="font-semibold text-rose-600">-${Math.round(totalDescuentos).toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-700">Líquido Estimado:</span>
                    <span className="text-emerald-600">${Math.round(total).toLocaleString('es-CL')}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button 
                    onClick={handleCancelEdit}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1 text-[11px]"
                  >
                    <X size={14} /> Cancelar
                  </button>
                  <button 
                    onClick={() => handleSave(mech.id)}
                    disabled={isSaving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1 text-[11px] disabled:opacity-50"
                  >
                    <Save size={14} /> Guardar
                  </button>
                </div>
              </div>
            ) : (
              /* Vista de Ficha de Colaborador */
              <>
                <div className="p-6 space-y-4">
                  {/* Cabecera de la Tarjeta */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-sm">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{mech.name}</h3>
                          <button onClick={() => handleEditClick(mech)} className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors">
                            <Edit2 size={13} />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <p className="text-xs font-semibold text-blue-600">{currentCargo || 'Mecánico'}</p>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 border leading-none ${
                            (mech.tipo || 'Fijo') === 'Fijo'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {(mech.tipo || 'Fijo') === 'Fijo' ? (
                              <>
                                <Repeat size={8} /> Recurrente
                              </>
                            ) : (
                              <>
                                <Calendar size={8} /> Variable
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isApproved ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle size={12} /> Aprobado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informacion Ficha */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-bold uppercase text-[9px]">RUT</span>
                      <span className="text-slate-700 font-bold truncate block">{currentRut || 'Sin RUT'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase text-[9px]">Días Trab.</span>
                      <span className="text-slate-700 font-bold block">{currentAsistencia} días</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase text-[9px]">Vacaciones</span>
                      <span className="text-slate-700 font-bold block">Acum: {currentVacaciones} | T: {currentVacacionesTomadas}</span>
                    </div>
                  </div>

                  {/* Desglose Haberes / Descuentos */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    
                    {/* HABERES */}
                    <div className="space-y-2 border-r border-slate-100 pr-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Haberes</span>
                      <div className="space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex justify-between">
                          <span>Sueldo Base:</span>
                          <span className="font-semibold text-slate-700">${currentSueldo.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Comisión MO:</span>
                          <span className="font-semibold text-slate-700">${Math.round(comisionMO).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Comisión Ins:</span>
                          <span className="font-semibold text-slate-700">${Math.round(comisionInsumos).toLocaleString('es-CL')}</span>
                        </div>
                        {currentBonos > 0 && (
                          <div className="flex justify-between">
                            <span>Bonos:</span>
                            <span className="font-semibold text-emerald-600">+${currentBonos.toLocaleString('es-CL')}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t border-slate-100 font-bold text-slate-800">
                          <span>T. Haberes:</span>
                          <span>${Math.round(totalHaberes).toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                    </div>

                    {/* DESCUENTOS */}
                    <div className="space-y-2 pl-1">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Descuentos</span>
                      <div className="space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Leyes AFP/Salud:</span>
                          <span>${Math.round(totalDescuentosLegales).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Préstamos:</span>
                          <span className="font-semibold text-slate-700">${currentPrestamos.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Varios:</span>
                          <span className="font-semibold text-slate-700">${currentDescuentos.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-slate-100 font-bold text-slate-800">
                          <span>T. Dctos:</span>
                          <span className="text-rose-600">-${Math.round(totalDescuentos).toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Footer de la tarjeta con Liquido a Pagar y Botones */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Líquido a Pagar</span>
                    <span className="text-lg font-extrabold text-emerald-600">${Math.round(total).toLocaleString('es-CL')}</span>
                  </div>

                  <div>
                    {isApproved ? (
                      <button 
                        onClick={() => generatePDF(mech)}
                        disabled={generatingPdf === mech.id}
                        className="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <FileText size={14} className="text-blue-500" />
                        {generatingPdf === mech.id ? 'Descargando...' : 'Descargar PDF'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => generatePDF(mech)}
                        disabled={generatingPdf === mech.id}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={14} className="text-emerald-400" />
                        {generatingPdf === mech.id ? 'Generando...' : 'Aprobar Liquidación'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

