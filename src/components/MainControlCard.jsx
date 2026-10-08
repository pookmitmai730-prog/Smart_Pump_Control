import React, { useState, useEffect } from 'react';
import { Sliders, ToggleLeft, ToggleRight, AlertOctagon, AlertTriangle, RotateCcw } from 'lucide-react';
import { ref, update } from "firebase/database"; 
import { db } from "../firebase";            

export default function MainControlCard({ isAuto, setIsAuto, valvePosition, setValvePosition, handleEmergencyStop, valveStatus, sensorError }) {
  
  const calculateTurns = (pos) => {
    const rawPercentage = Number(pos || 0);
    const turns = Math.round((rawPercentage / 100) * 12);
    return Math.max(0, Math.min(12, turns)); 
  };

  const [localTurns, setLocalTurns] = useState(calculateTurns(valvePosition));

  useEffect(() => {
    setLocalTurns(calculateTurns(valvePosition));
  }, [valvePosition]);

  const handleSliderChange = (e) => {
    if (!isAuto && !sensorError) {
      const newTurns = parseInt(e.target.value, 10);
      setLocalTurns(newTurns);
      
      const percentage = (newTurns / 12) * 100;
      setValvePosition(percentage);
    }
  };

  const handleSliderUp = () => {
    if (!isAuto && !sensorError) {
      const percentage = (localTurns / 12) * 100;
      setValvePosition(percentage);
      
      if (db) {
        // 🛠️ ปรับแก้ให้ส่งไปที่ /pwa_motor เพื่อให้ตรงกับโครงสร้างที่บอร์ดใช้งาน
        const motorRef = ref(db, 'pwa_motor'); 
        update(motorRef, {
          targetPos: parseFloat(percentage.toFixed(2)),
          manualOverride: true
        }).catch((error) => console.error("Firebase Update Error:", error));
      }
    }
  };

  // 🔄 ฟังก์ชันสำหรับกดสลับโหมด Auto / Manual และอัปเดตขึ้น Firebase
  const handleToggleAuto = () => {
    if (sensorError) return;

    const newAutoState = !isAuto;
    setIsAuto(newAutoState);

    if (db) {
      const telemetryRef = ref(db, 'pwa_system/telemetry');
      update(telemetryRef, {
        isAuto: newAutoState
      }).catch((error) => console.error("Auto Mode Update Error:", error));
    }
  };

  // ฟังก์ชันส่งคำสั่งรีเซ็ต Error ไปยัง Firebase (พาธ /pwa_motor/resetError)
  const handleResetSensorError = () => {
    if (db) {
      const motorRef = ref(db, 'pwa_motor');
      update(motorRef, {
        resetError: true
      }).catch((error) => console.error("Reset Error Failed:", error));
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between min-h-95">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-slate-200">แผงควบคุมโหมด</h3>
            <p className="text-xs text-slate-400">สั่งการทำงานชุดขับเคลื่อนประตูน้ำ</p>
          </div>
        </div>
      </div>

      {/* 🔴 กล่องแจ้งเตือนสีแดงและปุ่มรีเซ็ต (จะแสดงขึ้นมาก็ต่อเมื่อ sensorError เป็น true) */}
      {sensorError && (
        <div className="mb-5 p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl flex flex-col gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">แจ้งเตือนความผิดปกติ</h4>
              <p className="text-[11px] text-rose-300 mt-0.5">{valveStatus || "ERROR: Sensor Fault / Please Check!"}</p>
            </div>
          </div>
          <button
            onClick={handleResetSensorError}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>กดเพื่อรีเซ็ตข้อผิดพลาด (Reset Sensor Error)</span>
          </button>
        </div>
      )}

      {/* Mode Selector */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between mb-5">
        <span className="text-sm font-medium text-slate-300">โหมดการควบคุมปัจจุบัน:</span>
        <button 
          onClick={handleToggleAuto}
          disabled={sensorError}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
            sensorError ? 'opacity-40 pointer-events-none' : ''
          } ${
            isAuto 
              ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-400' 
              : 'bg-amber-500/20 border border-amber-400/40 text-amber-400'
          }`}
        >
          {isAuto ? (
            <>
              <span>[ AUTO ] อัตโนมัติ</span>
              <ToggleRight size={18} className="text-cyan-400" />
            </>
          ) : (
            <>
              <span>[ MANUAL ] ปรับเอง</span>
              <ToggleLeft size={18} className="text-amber-400" />
            </>
          )}
        </button>
      </div>

      {/* Manual Slider Control Area */}
      <div className={`p-4 rounded-xl border border-slate-800/60 bg-slate-900/40 flex flex-col justify-center transition-all duration-300 ${
        (isAuto || sensorError) ? 'opacity-40 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            ปรับระดับประตูน้ำ (ทีละ 1 รอบ / สูงสุด 12 รอบ)
          </span>
          <div className="text-right">
            <span className="block text-sm font-mono font-bold text-amber-400">{localTurns} รอบ</span>
            <span className="block text-[10px] text-slate-500">({valvePosition.toFixed(0)}%)</span>
          </div>
        </div>
        
        <input 
          type="range" 
          min="0" 
          max="12" 
          step="1" 
          value={localTurns} 
          onChange={handleSliderChange}
          onMouseUp={handleSliderUp}
          onTouchEnd={handleSliderUp}
          disabled={isAuto || sensorError}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        
        <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
          <span>0 รอบ (ปิด)</span>
          <span>6 รอบ (ครึ่ง)</span>
          <span>12 รอบ (เปิดสุด)</span>
        </div>
      </div>

      {/* Emergency Stop Button */}
      <div className="mt-5 pt-4 border-t border-slate-800/60">
        <button 
          onClick={handleEmergencyStop}
          className="w-full bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 hover:border-rose-500/60 text-rose-400 font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-rose-950/20 relative overflow-hidden group cursor-pointer"
        >
          {valveStatus !== 'Stationary' && (
            <span className="absolute inset-0 bg-rose-500/5 animate-pulse" />
          )}
          <AlertOctagon size={18} className="group-hover:scale-110 transition-transform" />
          <span>EMERGENCY STOP (ปิดวาล์วทันที)</span>
        </button>
      </div>
    </div>
  );
}