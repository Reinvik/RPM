import React, { useState } from 'react';
import { CheckCircle, Edit2, Save, X, FileText, Calendar, CreditCard, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNexusContext } from '../../context/NexusContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MechanicSettlement({ mechanics }) {
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
    bonos: 0
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
      bonos: mech.bonos || 0
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (mechId) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
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
          bonos: Number(editValues.bonos)
        })
        .eq('id', mechId);

      if (error) throw error;
      
      setEditingId(null);
      window.location.reload(); 
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
      
      // Add Logo
      if (logoUrl) {
        try {
          const img = new Image();
          img.src = logoUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          doc.addImage(img, 'PNG', 10, 10, 30, 30);
        } catch (e) {
          console.error("Error loading logo", e);
        }
      }
      
      // Header Employer Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(10, 10, 80, 25, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(workshopName, 15, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`RUT: 12.345.678-9`, 15, 24); // Placeholder RUT for employer
      doc.text(workshopAddress, 15, 30);
      
      // Header Title Box
      doc.setFillColor(219, 234, 254); // blue-100
      doc.roundedRect(120, 10, 80, 25, 3, 3, 'FD');
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('Liquidación de', 140, 20);
      doc.text('Remuneraciones', 140, 26);
      
      // Employee Info Box
      doc.setDrawColor(15, 23, 42);
      doc.rect(10, 45, 190, 30);
      
      doc.setFontSize(9);
      doc.text(`Nombre: ${mech.name}`, 15, 52);
      doc.text(`RUT: ${mech.rut || 'No especificado'}`, 120, 52);
      doc.text(`Cargo: ${mech.cargo || 'Mecánico'}`, 15, 60);
      doc.text(`Fecha de ingreso: ${mech.fecha_ingreso ? new Date(mech.fecha_ingreso).toLocaleDateString('es-CL') : 'No especificada'}`, 120, 60);
      doc.text(`Días trabajados: ${mech.asistencia || 0}`, 15, 68);
      
      // Table Data
      const comisionMO = mech.mo_generada * (mech.porcentaje_comision_mo / 100);
      const comisionInsumos = (mech.insumos_generados || 0) * (mech.porcentaje_comision_insumos / 100);
      
      // Legal Discounts
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
        startY: 80,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }, // slate-900
        styles: { fontSize: 9 },
        didParseCell: function (data) {
          if (data.cell.text[0] === 'HABERES' || data.cell.text[0] === 'DESCUENTOS LEGALES' || data.cell.text[0] === 'OTROS DESCUENTOS' || data.cell.text[0] === 'TOTALES') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 247, 250];
          }
        }
      });
      
      // Liquido a Pagar
      const finalY = doc.lastAutoTable.finalY + 5;
      doc.rect(10, finalY, 190, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Líquido a pagar:`, 15, finalY + 7);
      doc.text(`$${Math.round(liquidoAPagar).toLocaleString('es-CL')}`, 150, finalY + 7);
      
      // Signatures
      const sigY = finalY + 30;
      doc.line(20, sigY, 80, sigY);
      doc.text('Firma Empleador', 35, sigY + 5);
      
      doc.line(120, sigY, 180, sigY);
      doc.text('Firma Colaborador', 135, sigY + 5);
      
      doc.save(`Liquidacion_${mech.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error al generar PDF: " + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
              <th className="p-4 font-bold">Mecánico</th>
              <th className="p-4 font-bold">Días Trab.</th>
              <th className="p-4 font-bold">Vacaciones</th>
              <th className="p-4 font-bold min-w-[120px]">Sueldo Base</th>
              <th className="p-4 font-bold">Comisiones</th>
              <th className="p-4 font-bold min-w-[120px]">Bonos</th>
              <th className="p-4 font-bold min-w-[120px]">Dctos. Legales</th>
              <th className="p-4 font-bold min-w-[120px]">Préstamos</th>
              <th className="p-4 font-bold">Total Líquido</th>
              <th className="p-4 font-bold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
              
              // Calculate legal discounts
              const afp = currentSueldo * 0.1145;
              const fonasa = currentSueldo * 0.07;
              const seguroCesantia = currentSueldo * 0.006;
              const totalDescuentosLegales = afp + fonasa + seguroCesantia;
              
              const total = currentSueldo + comisionMO + comisionInsumos + currentBonos - totalDescuentosLegales - currentPrestamos - currentDescuentos;
              const isApproved = mech.status === 'approved';

              return (
                <tr key={mech.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      {mech.name}
                      {!isEditing && (
                        <button onClick={() => handleEditClick(mech)} className="text-slate-400 hover:text-blue-600 p-1">
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <CreditCard size={12} />
                        {isEditing ? (
                          <input 
                            type="text" 
                            placeholder="RUT"
                            value={editValues.rut}
                            onChange={(e) => setEditValues({...editValues, rut: e.target.value})}
                            className="bg-slate-50 border border-slate-200 rounded p-0.5 text-xs text-slate-700 w-24"
                          />
                        ) : (
                          currentRut || 'Sin RUT'
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase size={12} />
                        {isEditing ? (
                          <input 
                            type="text" 
                            placeholder="Cargo"
                            value={editValues.cargo}
                            onChange={(e) => setEditValues({...editValues, cargo: e.target.value})}
                            className="bg-slate-50 border border-slate-200 rounded p-0.5 text-xs text-slate-700 w-24"
                          />
                        ) : (
                          currentCargo || 'Mecánico'
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {isEditing ? (
                          <input 
                            type="date" 
                            value={editValues.fecha_ingreso}
                            onChange={(e) => setEditValues({...editValues, fecha_ingreso: e.target.value})}
                            className="bg-slate-50 border border-slate-200 rounded p-0.5 text-xs text-slate-700"
                          />
                        ) : (
                          currentFechaIngreso ? `Ingreso: ${new Date(currentFechaIngreso).toLocaleDateString('es-CL')}` : 'Sin fecha ingreso'
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Días Trabajados */}
                  <td className="p-4 text-slate-600 text-sm">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editValues.asistencia}
                        onChange={(e) => setEditValues({...editValues, asistencia: e.target.value})}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    ) : (
                      `${mech.asistencia || 0} días`
                    )}
                  </td>

                  {/* Vacaciones */}
                  <td className="p-4 text-slate-600 text-sm">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">Acum:</span>
                          <input 
                            type="number" 
                            value={editValues.vacaciones_acumuladas}
                            onChange={(e) => setEditValues({...editValues, vacaciones_acumuladas: e.target.value})}
                            className="w-12 bg-slate-50 border border-slate-200 rounded p-1 text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">Tom:</span>
                          <input 
                            type="number" 
                            value={editValues.vacaciones_tomadas}
                            onChange={(e) => setEditValues({...editValues, vacaciones_tomadas: e.target.value})}
                            className="w-12 bg-slate-50 border border-slate-200 rounded p-1 text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <p>Acum: {mech.vacaciones_acumuladas || 0}</p>
                        <p>Tom: {mech.vacaciones_tomadas || 0}</p>
                      </div>
                    )}
                  </td>

                  {/* Sueldo Base */}
                  <td className="p-4 text-slate-600 text-sm">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input 
                          type="number" 
                          value={editValues.sueldo_base}
                          onChange={(e) => setEditValues({...editValues, sueldo_base: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      `$${mech.sueldo_base.toLocaleString('es-CL')}`
                    )}
                  </td>
                  
                  {/* Comisiones */}
                  <td className="p-4 text-slate-600 text-sm">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">MO:</span>
                          <input 
                            type="number" 
                            value={editValues.porcentaje_comision_mo}
                            onChange={(e) => setEditValues({...editValues, porcentaje_comision_mo: e.target.value})}
                            className="w-12 bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">Ins:</span>
                          <input 
                            type="number" 
                            value={editValues.porcentaje_comision_insumos}
                            onChange={(e) => setEditValues({...editValues, porcentaje_comision_insumos: e.target.value})}
                            className="w-12 bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <p>MO: ${comisionMO.toLocaleString('es-CL')} ({mech.porcentaje_comision_mo}%)</p>
                        <p>Ins: ${comisionInsumos.toLocaleString('es-CL')} ({mech.porcentaje_comision_insumos || 0}%)</p>
                      </div>
                    )}
                  </td>

                  {/* Bonos */}
                  <td className="p-4 text-slate-600 text-sm">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input 
                          type="number" 
                          value={editValues.bonos}
                          onChange={(e) => setEditValues({...editValues, bonos: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      `$${(mech.bonos || 0).toLocaleString('es-CL')}`
                    )}
                  </td>

                  {/* Descuentos Legales */}
                  <td className="p-4 text-slate-500 text-sm">
                    <div className="text-xs">
                      <p>AFP: ${Math.round(afp).toLocaleString('es-CL')}</p>
                      <p>Fonasa: ${Math.round(fonasa).toLocaleString('es-CL')}</p>
                      <p>Seg.C: ${Math.round(seguroCesantia).toLocaleString('es-CL')}</p>
                      <p className="font-bold text-slate-700">Total: ${Math.round(totalDescuentosLegales).toLocaleString('es-CL')}</p>
                    </div>
                  </td>

                  {/* Préstamos */}
                  <td className="p-4 text-slate-600 text-sm">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input 
                          type="number" 
                          value={editValues.prestamos}
                          onChange={(e) => setEditValues({...editValues, prestamos: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      `$${(mech.prestamos || 0).toLocaleString('es-CL')}`
                    )}
                  </td>
                  
                  <td className="p-4 font-bold text-slate-900 text-sm">${Math.round(total).toLocaleString('es-CL')}</td>
                  
                  <td className="p-4 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={handleCancelEdit}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <button 
                          onClick={() => handleSave(mech.id)}
                          disabled={isSaving}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      isApproved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                          <CheckCircle size={16} /> Aprobado
                        </span>
                      ) : (
                        <button 
                          onClick={() => generatePDF(mech)}
                          disabled={generatingPdf === mech.id}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 justify-end ml-auto"
                        >
                          <FileText size={16} />
                          {generatingPdf === mech.id ? 'Generando...' : 'Aprobar Liquidación'}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
