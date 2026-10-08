// src/components/SchedulerCard.jsx
import React from 'react';
import { Calendar, Clock, Plus, Minus, Trash2 } from 'lucide-react';

export default function SchedulerCard({ schedules, setSchedules, onToggleActive }) {

  // เจนเนอเรตตัวเลือกชั่วโมง (00 - 23) และนาที (00 - 59 ครบทุกนาที)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // 🟢 1. ฟังก์ชันเพิ่มช่วงเวลาใหม่ (ส่งอัปเดตขึ้น Firebase)
  const addNewSchedule = () => {
    const newId = schedules.length > 0 ? Math.max(...schedules.map(s => s.id)) + 1 : 1;
    const newSlot = {
      id: newId,
      start: '08:00',
      end: '12:00',
      pressure: 2.0,
      active: false // เริ่มต้นเป็น False เพื่อความปลอดภัย
    };
    // ใช้พรอพเซ็ตเตอร์ตัวแม่เพื่อยิงโครงสร้างใหม่ขึ้น Firebase
    setSchedules([...schedules, newSlot]);
  };

  // 🟢 2. ฟังก์ชันลบช่วงเวลาออกจากตาราง (ส่งอัปเดตขึ้น Firebase)
  const deleteSchedule = (id) => {
    const updated = schedules.filter(slot => slot.id !== id);
    setSchedules(updated);
  };

  // 🟢 3. ฟังก์ชันอัปเดตเวลาเฉพาะส่วน (ส่งอัปเดตขึ้น Firebase)
  const handleTimeChange = (id, field, type, value) => {
    const updated = schedules.map(slot => {
      if (slot.id === id) {
        const [currentH, currentM] = slot[field].split(':');
        const newTime = type === 'hour' ? `${value}:${currentM}` : `${currentH}:${value}`;
        return { ...slot, [field]: newTime };
      }
      return slot;
    });
    setSchedules(updated); // ยิงซิงค์ขึ้น Firebase ทันทีที่ขยับเวลา
  };

  // 🟢 4. ฟังก์ชันปรับค่าแรงดันเป้าหมาย (ส่งอัปเดตขึ้น Firebase)
  const adjustPressure = (id, amount) => {
    const updated = schedules.map(slot => {
      if (slot.id === id) {
        const newVal = Math.min(Math.max(slot.pressure + amount, 0.5), 5.0);
        return { ...slot, pressure: parseFloat(newVal.toFixed(1)) };
      }
      return slot;
    });
    setSchedules(updated); // ยิงซิงค์ขึ้น Firebase ทันทีที่กดบวก-ลบแรงดัน
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between min-h-95">
      
      {/* Card Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-slate-200">ตารางจัดสรรแรงดัน</h3>
            <p className="text-xs text-slate-400">ตั้งค่าแรงดันเป้าหมายตามช่วงเวลา (ระบบ 24 ชม.)</p>
          </div>
        </div>
        <button 
          onClick={addNewSchedule}
          className="p-2 bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 rounded-lg text-slate-300 transition-all shrink-0 cursor-pointer"
          title="เพิ่มช่วงเวลาใหม่"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Scheduler List Area */}
      <div className="grow space-y-3 overflow-y-auto max-h-55 pr-1 custom-scrollbar">
        {schedules.map((slot) => {
          const [startH, startM] = slot.start.split(':');
          const [endH, endM] = slot.end.split(':');

          return (
            <div 
              key={slot.id} 
              className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between gap-2 ${
                slot.active 
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-inner shadow-emerald-500/5' 
                  : 'bg-slate-950/40 border-slate-800/60'
              }`}
            >
              {/* ส่วนเลือกเวลา */}
              <div className="flex items-center gap-1.5">
                <div className={`p-1.5 rounded-md shrink-0 ${slot.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-900'}`}>
                  <Clock size={14} />
                </div>
                
                <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/80 text-xs font-mono font-bold text-slate-200">
                  
                  {/* เวลาเริ่มต้น: ชั่วโมง */}
                  <select 
                    value={startH} 
                    onChange={(e) => handleTimeChange(slot.id, 'start', 'hour', e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500 cursor-pointer text-cyan-400"
                  >
                    {hoursOptions.map(h => <option key={h} value={h} className="bg-slate-950 text-slate-200">{h}</option>)}
                  </select>
                  <span>:</span>
                  
                  {/* เวลาเริ่มต้น: นาที */}
                  <select 
                    value={startM} 
                    onChange={(e) => handleTimeChange(slot.id, 'start', 'minute', e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500 cursor-pointer max-h-40"
                  >
                    {minutesOptions.map(m => <option key={m} value={m} className="bg-slate-950 text-slate-200">{m}</option>)}
                  </select>

                  <span className="text-slate-600 px-0.5 font-sans font-normal">ถึง</span>

                  {/* เวลาสิ้นสุด: ชั่วโมง */}
                  <select 
                    value={endH} 
                    onChange={(e) => handleTimeChange(slot.id, 'end', 'hour', e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500 cursor-pointer text-cyan-400"
                  >
                    {hoursOptions.map(h => <option key={h} value={h} className="bg-slate-950 text-slate-200">{h}</option>)}
                  </select>
                  <span>:</span>
                  
                  {/* เวลาสิ้นสุด: นาที */}
                  <select 
                    value={endM} 
                    onChange={(e) => handleTimeChange(slot.id, 'end', 'minute', e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500 cursor-pointer max-h-40"
                  >
                    {minutesOptions.map(m => <option key={m} value={m} className="bg-slate-950 text-slate-200">{m}</option>)}
                  </select>

                  <span className="text-slate-500 text-[10px] pr-0.5 select-none font-sans">น.</span>
                </div>
              </div>

              {/* Pressure Control */}
              <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg p-1 border border-slate-800 shrink-0">
                <button 
                  onClick={() => adjustPressure(slot.id, -0.1)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-md transition-colors px-1"
                >
                  <Minus size={12} />
                </button>
                
                <div className="flex flex-col items-center min-w-12.5">
                  <span className="text-xs font-black font-mono text-cyan-400">{slot.pressure.toFixed(1)}</span>
                  <span className="text-[8px] text-slate-500 uppercase font-bold">bar</span>
                </div>

                <button 
                  onClick={() => adjustPressure(slot.id, 0.1)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-md transition-colors px-1"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* ปุ่มสวิตช์ เปิด/ปิดใช้งานตารางเวลา */}
              <button
                onClick={() => onToggleActive(slot.id, slot.active)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide border transition-all cursor-pointer shrink-0 ${
                  slot.active 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {slot.active ? 'Active' : 'Off'}
              </button>

              {/* ปุ่มลบ */}
              <button 
                onClick={() => deleteSchedule(slot.id)}
                className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors shrink-0 cursor-pointer rounded-md hover:bg-slate-800/40"
                title="ลบช่วงเวลานี้"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Legend / Status Info */}
      <div className="mt-4 pt-4 border-t border-slate-800/60 text-[11px] text-slate-500 flex justify-between items-center italic">
        <span>* เปิดสวิตช์ Active เพื่อเปิดรันตารางคำนวณอัตโนมัติ</span>
        <span className="text-emerald-500/70 font-medium">Auto-Sync (TH-24h)</span>
      </div>

    </div>
  );
}