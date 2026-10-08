import React, { useEffect, useState, useRef } from 'react';
import { Gauge, Anchor, HelpCircle } from 'lucide-react';

export default function TelemetryCard({ currentPressure, targetPressure, valvePosition, valveStatus }) {
  // 🌟 เผื่อกรณีที่ valvePosition อาจถูกส่งมาในชื่ออื่นหรือไม่มีค่า ให้เซฟตี้ด้วย || 0
  const currentPosNum = Number(valvePosition ?? 0);

  const [rotation, setRotation] = useState(0);
  const [direction, setDirection] = useState('none'); 
  const prevPosition = useRef(currentPosNum);

  // Debug เช็กค่าที่รับเข้ามาผ่าน Console
  useEffect(() => {
    console.log("TelemetryCard ได้รับ valvePosition:", currentPosNum);
  }, [currentPosNum]);

  // Logic ตรวจสอบทิศทางและการหมุนของไอคอน
  useEffect(() => {
    const prevVal = prevPosition.current;

    if (Math.abs(currentPosNum - prevVal) > 0.01) {
      if (currentPosNum > prevVal) {
        setDirection('opening');
        setRotation(prev => prev - 360);
      } else {
        setDirection('closing');
        setRotation(prev => prev + 360);
      }
    } else {
      setDirection('none');
    }
    prevPosition.current = currentPosNum;
  }, [currentPosNum]);

  // ฟังก์ชันคำนวณสี
  const getPressureColor = (p) => {
    const val = Number(p);
    if (val < 0.5) return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    if (val > 3.0) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20';
  };

  const pressureStyle = getPressureColor(currentPressure);

  // 🌟 คำนวณจำนวนรอบให้ตรงกันเป๊ะ (เทียบจาก 0-100% เป็น 0-12 รอบ)
  const displayTurns = Math.min(Math.max((currentPosNum / 100) * 12.0, 0), 12.0).toFixed(1);

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between min-h-[380px]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 shrink-0">
            <Gauge size={20} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-slate-200">สถานะแรงดันและวาล์ว</h3>
            <p className="text-xs text-slate-400">ข้อมูลเซนเซอร์ปลายสาย (P3)</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded-md text-slate-400">REAL-TIME</span>
      </div>

      <div className="grid grid-cols-2 gap-4 my-auto">
        {/* กล่องแรงดัน */}
        <div className={`p-4 rounded-xl border flex flex-col justify-center items-center text-center transition-all duration-300 ${pressureStyle}`}>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1">แรงดันปลายสาย P3</span>
          <div className="text-4xl font-black tracking-tight font-mono mb-1">
            {currentPressure !== undefined ? Number(currentPressure).toFixed(2) : "0.00"}
          </div>
          <span className="text-xs font-medium">bar</span>
          <div className="mt-3 pt-3 border-t border-slate-800/40 w-full flex justify-between text-[11px] text-slate-400 font-mono">
            <span>เป้าหมาย:</span>
            <span className="text-slate-200 font-bold">
              {targetPressure !== undefined ? Number(targetPressure).toFixed(2) : "0.00"} bar
            </span>
          </div>
        </div>

        {/* กล่องวาล์ว */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">องศาการเปิดวาล์ว</span>
          
          <div className="relative mb-3">
            <div 
              className="p-3 bg-slate-800 rounded-full border border-slate-700 transition-all duration-500"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.5s linear'
              }}
            >
              <Anchor size={36} className={`transition-colors duration-500 ${
                direction !== 'none' ? (direction === 'opening' ? 'text-cyan-400' : 'text-amber-400') : 'text-slate-400'
              }`} />
            </div>
          </div>

          <div className="text-2xl font-bold font-mono text-slate-200">
            {currentPosNum.toFixed(0)}% 
            <span className="text-xs text-slate-400 block font-normal mt-0.5">
              ({displayTurns} / 12 รอบ)
            </span>
          </div>
          
          {/* แสดงสถานะจริงจาก Firebase */}
          <div className="mt-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${direction === 'opening' ? 'text-cyan-400' : direction === 'closing' ? 'text-amber-400' : 'text-slate-500'}`}>
              {direction === 'none' && '🛑 หยุดนิ่ง'}
              {direction === 'opening' && '🔄 กำลังเปิด'}
              {direction === 'closing' && '🔄 กำลังหรี่'}
            </span>
            <div className="text-[9px] text-slate-600 font-mono mt-0.5">
              SYSTEM: {valveStatus || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
        <HelpCircle size={14} className="text-slate-500 shrink-0" />
        <p className="line-clamp-1">
          {valveStatus === 'SoftClosing' 
            ? '⚠️ ระบบกำลังปิดวาล์ว (Soft Closing) - อาจรอรับคำสั่งใหม่ไม่ได้' 
            : (Number(currentPressure) < 0.5 ? '🚨 ตรวจพบแรงดันต่ำผิดปกติ!' : 'ระบบปกติ: วาล์วปรับอัตราไหลเพื่อรักษาระดับแรงดัน')}
        </p>
      </div>
    </div>
  );
}