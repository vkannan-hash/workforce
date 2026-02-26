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

  useEffect(() => { fetchData(); }, [currentMonth]);

  async function fetchData() {
    const { data: leaveData } = await supabase.from('leave_records').select('*');
    const { data: holidayData } = await supabase.from('holidays').select('*');
    if (leaveData) setRecords(leaveData);
    if (holidayData) setHolidays(holidayData);
  }

  async function handleSave() {
    if (!selectedDate) return;
    await supabase.from('leave_records').insert([{ leave_date: selectedDate, leave_type: leaveType }]);
    setSelectedDate(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    await supabase.from('leave_records').delete().eq('id', id);
    fetchData();
  }

  // --- MATH & LOGIC ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const formatDate = (y: number, m: number, d: number) => `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

  // 1. Filter Data for Summaries
  const recordsThisMonth = records.filter(r => new Date(r.leave_date).getFullYear() === year && new Date(r.leave_date).getMonth() === month);
  const recordsThisYear = records.filter(r => new Date(r.leave_date).getFullYear() === year);
  const holidaysThisMonth = holidays.filter(h => new Date(h.holiday_date).getFullYear() === year && new Date(h.holiday_date).getMonth() === month);
  const holidaysThisYear = holidays.filter(h => new Date(h.holiday_date).getFullYear() === year);

  // 2. Helper to calculate exact leave days (AM/PM = 0.5)
  const calcLeave = (list: any[], type: string) => {
    return list.reduce((total, r) => {
      if (r.leave_type === type) return total + 1;
      if (r.leave_type === `${type} AM` || r.leave_type === `${type} PM`) return total + 0.5;
      return total;
    }, 0);
  };

  const totalLeaveThisMonth = recordsThisMonth.reduce((tot, r) => tot + (r.leave_type.includes('AM') || r.leave_type.includes('PM') ? 0.5 : 1), 0);
  
  // 3. Calculate Working Days in current month
  let weekdaysCount = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const dayOfWeek = new Date(year, month, i).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdaysCount++; // Not Sun/Sat
  }
  // Subtract weekday holidays
  const weekdayHolidays = holidaysThisMonth.filter(h => {
    const d = new Date(h.holiday_date).getDay();
    return d !== 0 && d !== 6;
  }).length;
  
  const daysWorkedThisMonth = weekdaysCount - weekdayHolidays - totalLeaveThisMonth;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- SUMMARY DASHBOARD --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Card */}
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Summary: {monthNames[month]} {year}</h2>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-black text-blue-600">{daysWorkedThisMonth}</span>
              <span className="text-slate-500 font-bold mb-1">Days Worked</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 p-3 rounded-2xl"><p className="text-xl font-bold text-slate-700">{calcLeave(recordsThisMonth, 'AL')}</p><p className="text-[10px] font-bold text-slate-400">AL</p></div>
              <div className="bg-slate-50 p-3 rounded-2xl"><p className="text-xl font-bold text-red-500">{calcLeave(recordsThisMonth, 'MC')}</p><p className="text-[10px] font-bold text-slate-400">MC</p></div>
              <div className="bg-slate-50 p-3 rounded-2xl"><p className="text-xl font-bold text-orange-500">{calcLeave(recordsThisMonth, 'EL')}</p><p className="text-[10px] font-bold text-slate-400">EL</p></div>
              <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100"><p className="text-xl font-bold text-yellow-600">{holidaysThisMonth.length}</p><p className="text-[10px] font-bold text-yellow-500">PH</p></div>
            </div>
          </div>

          {/* Yearly Card */}
          <div className="bg-slate-900 p-6 rounded-3xl shadow-lg border border-slate-800 text-white">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Yearly Totals: {year}</h2>
             <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-3xl font-black text-blue-400">{calcLeave(recordsThisYear, 'AL')}</p>
                  <p className="text-xs font-bold text-slate-500">Total AL Used</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-red-400">{calcLeave(recordsThisYear, 'MC')}</p>
                  <p className="text-xs font-bold text-slate-500">Total MC Used</p>
                </div>
             </div>
             <div className="bg-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-slate-300">Public Holidays this year</span>
                <span className="text-lg font-black text-yellow-400">{holidaysThisYear.length} days</span>
             </div>
          </div>
        </div>

        {/* --- CALENDAR SECTION --- */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="flex justify-between items-center bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-black tracking-tight">Schedule</h1>
            <div className="flex items-center gap-4 bg-blue-700 p-1 rounded-2xl">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="px-4 py-2 hover:bg-blue-500 rounded-xl font-bold transition-colors">◀</button>
              <span className="text-lg font-black min-w-[120px] text-center">{monthNames[month]} {year}</span>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="px-4 py-2 hover:bg-blue-500 rounded-xl font-bold transition-colors">▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center font-bold text-slate-500 text-xs uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[100px] md:auto-rows-[120px] bg-slate-200 gap-[1px]">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/50"></div>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateString = formatDate(year, month, dayNum);
              const dayRecords = records.filter(r => r.leave_date === dateString);
              const dayHoliday = holidays.find(h => h.holiday_date === dateString);
              
              return (
                <div key={dayNum} onClick={() => setSelectedDate(dateString)} className="bg-white p-2 hover:bg-blue-50 cursor-pointer transition-colors relative group overflow-hidden">
                  <span className="font-bold text-slate-400 group-hover:text-blue-600 text-sm">{dayNum}</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayHoliday && <div className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded truncate">🎊 {dayHoliday.holiday_name}</div>}
                    {dayRecords.map(record => (
                      <div key={record.id} className="flex justify-between items-center text-[9px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate">
                        <span>{record.leave_type}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="text-red-500 ml-1">✖</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Log Leave</h2>
              <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center">✖</button>
            </div>
            <p className="text-sm font-bold text-blue-600 mb-4 bg-blue-50 p-3 rounded-xl inline-block">Date: {selectedDate}</p>
            <div className="grid grid-cols-3 gap-2 mb-8 mt-2">
              {leaveOptions.map((type) => (
                <button key={type} onClick={() => setLeaveType(type)} className={`py-3 rounded-xl text-xs font-bold transition-all ${leaveType === type ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{type}</button>
              ))}
            </div>
            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-600 shadow-lg">Save to Calendar</button>
          </div>
        </div>
      )}
    </div>
  );
}