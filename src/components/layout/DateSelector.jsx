import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useNexusContext } from '../../context/NexusContext';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DateSelector() {
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useNexusContext();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 text-blue-600">
        <Calendar size={18} />
        <span className="font-medium text-sm uppercase tracking-wider">Período</span>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={handlePrevMonth}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
          <span className="text-slate-900 font-bold">{MONTHS[selectedMonth]}</span>
          <span className="text-slate-400">{selectedYear}</span>
        </div>

        <button 
          onClick={handleNextMonth}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="h-4 w-[1px] bg-slate-200 mx-2" />

      <select 
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="bg-transparent text-slate-700 text-sm font-medium outline-none cursor-pointer hover:text-slate-900"
      >
        {[2024, 2025, 2026, 2027].map(y => (
          <option key={y} value={y} className="bg-white text-slate-900">{y}</option>
        ))}
      </select>
    </div>
  );
}
