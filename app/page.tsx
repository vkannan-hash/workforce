"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CalendarApp() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState("AL");

  const leaveOptions = ["AL", "AL AM", "AL PM", "EL", "EL AM", "EL PM", "MC", "MC AM", "MC PM", "TO", "CL", "HFM", "UL", "HL", "Others"];

  useEffect(() => {
    fetchData();
  }, [currentMonth]); // Refresh when month changes

  async function fetchData() {
    const { data: leaveData } = await supabase.from('leave_records').select('*');
    const { data: holidayData } = await supabase.from('holidays').select('*');
    if (leaveData) setRecords(leaveData);
    if (holidayData) setHolidays(holidayData);
  }

  async function handleSave() {
    if (!selectedDate) return;
    await supabase.from('leave_records').insert([{ leave_date: selectedDate, leave_type: leaveType }]);
    setSelectedDate(null); // Close modal
    fetchData(); // Refresh calendar
  }

  async function handleDelete(id: string) {
    await supabase.from('leave_records').delete().eq('id', id);
    fetchData();
  }

  // --- Calendar Math ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Create formatting like "2026-03-05" to match Supabase
  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Control */}
        <div className="flex justify-between items-center bg-blue-600 text-white p-6 md:p-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Workforce Calendar</h1>
            <p className="text-blue-200 text-sm mt-1">Click any day to add or manage leave.</p>
          </div>
          <div className="flex items-center gap-4 bg-blue-700 p-2 rounded-2xl">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="px-4 py-2 hover:bg-blue-500 rounded-xl font-bold transition-colors">◀ Prev</button>
            <span className="text-xl font-black min-w-[140px] text-center">{monthNames[month]} {year}</span>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="px-4 py-2 hover:bg-blue-500 rounded-xl font-bold transition-colors">Next ▶</button>
          </div>
        </div>

        {/* Days of the Week */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center font-bold text-slate-500 text-sm uppercase tracking-widest">{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] bg-slate-200 gap-[1px]">
          
          {/* Empty boxes for days before the 1st of the month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50"></div>
          ))}

          {/* Actual Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateString = formatDate(year, month, dayNum);
            
            // Find if this day has a record or holiday
            const dayRecords = records.filter(r => r.leave_date === dateString);
            const dayHoliday = holidays.find(h => h.holiday_date === dateString);
            
            return (
              <div 
                key={dayNum} 
                onClick={() => setSelectedDate(dateString)}
                className="bg-white p-2 hover:bg-blue-50 cursor-pointer transition-colors relative group"
              >
                <span className="font-bold text-slate-400 group-hover:text-blue-600">{dayNum}</span>
                
                <div className="mt-1 flex flex-col gap-1">
                  {/* Show Holiday Badge */}
                  {dayHoliday && (
                    <div className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded truncate border border-yellow-200">
                      🎊 {dayHoliday.holiday_name}
                    </div>
                  )}

                  {/* Show Leave Badges */}
                  {dayRecords.map(record => (
                    <div key={record.id} className="flex justify-between items-center text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded truncate border border-blue-200">
                      <span>{record.leave_type}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                        className="text-red-500 hover:scale-125 ml-2"
                        title="Delete record"
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POPUP MODAL: When you click a day */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Log Leave</h2>
              <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✖</button>
            </div>
            
            <p className="text-sm font-bold text-blue-600 mb-4 bg-blue-50 p-3 rounded-xl inline-block">Date: {selectedDate}</p>
            
            <div className="grid grid-cols-3 gap-2 mb-8 mt-2">
              {leaveOptions.map((type) => (
                <button
                  key={type}
                  onClick={() => setLeaveType(type)}
                  className={`py-3 rounded-xl text-xs font-bold transition-all ${
                    leaveType === type ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-600 transition-colors shadow-lg"
            >
              Save to Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}