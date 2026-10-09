import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { 
  Activity, Power, Sliders, Thermometer, Zap, 
  Gauge, AlertTriangle, RefreshCw, Lock, Unlock, Clock, WifiOff, X, Plus, Trash2, Calendar
} from 'lucide-react';

// --- ค่ากำหนด Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBltJf8g9-YKwG98Yfu1WdoWNuP_AJqd8M",
  authDomain: "dbsensor-eb39d.firebaseapp.com",
  databaseURL: "https://dbsensor-eb39d-default-rtdb.firebaseio.com/",
  projectId: "dbsensor-eb39d",
  storageBucket: "dbsensor-eb39d.firebasestorage.app",
  messagingSenderId: "484180057195",
  appId: "1:484180057195:web:19443fcde28e38bba5e52e",
  measurementId: "G-ST2Y0E4RG0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function PumpDashboard() {
  // --- State สำหรับเก็บข้อมูลจาก Firebase ---
  const [pumpStatus, setPumpStatus] = useState(false); 
  const [mode, setMode] = useState('AUTO');              
  const [p3Actual, setP3Actual] = useState(0.0);        
  const [current, setCurrent] = useState(0.0);          
  const [temperature, setTemperature] = useState(0.0);  
  const [alarm, setAlarm] = useState(null);             
  
  // --- State สำหรับตารางตั้งค่าแรงดันตามช่วงเวลา ---
  const [schedules, setSchedules] = useState([]);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newLimitPressure, setNewLimitPressure] = useState(4.0);

  // --- State สำหรับติดตามเวลาล่าสุดที่ข้อมูลส่งมา (เช็คไฟดับ / หลุดการเชื่อมต่อ) ---
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOfflineOrPowerLoss, setIsOfflineOrPowerLoss] = useState(false);

  // --- State สำหรับระบบล็อกอินหลักครั้งเดียว (Global Admin Auth) ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState(false);

  // --- ตรวจสอบสถานะข้อมูลขาดหาย (เกิน 300 วินาที ถือว่าไฟดับหรือ ESP32 หลุด) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const secondsElapsed = (Date.now() - lastUpdated) / 1000;
        if (secondsElapsed > 300) {
          setIsOfflineOrPowerLoss(true);
        } else {
          setIsOfflineOrPowerLoss(false);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // --- ดึงข้อมูลแบบ Real-time จาก Firebase ---
  useEffect(() => {
    const pumpRef = ref(db, 'pumpSystem');
    const unsubscribe = onValue(pumpRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPumpStatus(data.status ?? false);
        setMode(data.mode ?? 'AUTO');
        setP3Actual(data.p3Actual ?? 0.0);
        setCurrent(data.current ?? 0.0);
        setTemperature(data.temperature ?? 0.0);
        setAlarm(data.alarm ?? null);
        if (data.schedules) {
          setSchedules(data.schedules);
        }
        
        setLastUpdated(Date.now());
        setIsOfflineOrPowerLoss(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- ตรวจสอบรหัสผ่านผู้ดูแลระบบ (ตั้งรหัสไว้ที่ 1234) ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passcode === '1234') {
      setIsAdminLoggedIn(true);
      setShowAuthModal(false);
      setPasscode('');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // --- ฟังก์ชันควบคุมโหมดและปั๊ม (ทำงานได้ทันทีถ้าล็อกอินแล้ว) ---
  const handleModeToggle = () => {
    if (!isAdminLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    const newMode = mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    set(ref(db, 'pumpSystem/mode'), newMode);
  };

  const handlePowerToggle = () => {
    if (!isAdminLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (mode === 'MANUAL') {
      set(ref(db, 'pumpSystem/status'), !pumpStatus);
    } else {
      alert("ระบบอยู่ในโหมด AUTO ควบคุมด้วยแรงดัน P3 ไม่สามารถกดเปิด-ปิดเองได้ กรุณาสลับเป็น MANUAL ก่อน");
    }
  };

  // --- ฟังก์ชันจัดการตารางช่วงเวลาแรงดัน ---
  const handleAddSchedule = () => {
    const newItem = {
      id: Date.now(),
      startTime: newStartTime,
      endTime: newEndTime,
      limitPressure: parseFloat(newLimitPressure)
    };
    const updatedSchedules = [...schedules, newItem];
    setSchedules(updatedSchedules);
    set(ref(db, 'pumpSystem/schedules'), updatedSchedules);
  };

  const handleDeleteSchedule = (id) => {
    const updatedSchedules = schedules.filter(item => item.id !== id);
    setSchedules(updatedSchedules);
    set(ref(db, 'pumpSystem/schedules'), updatedSchedules);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans relative">
      
      {/* --- Modal ใส่รหัสผ่านแอดมิน --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-3 text-cyan-400">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-center mb-1 text-white">เข้าสู่ระบบผู้ดูแลระบบ</h3>
            <p className="text-slate-400 text-xs text-center mb-5">กรุณากรอกรหัสผ่านเพื่อปลดล็อกสิทธิ์ควบคุมปั๊มและแก้ไขตารางเวลา</p>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="PIN Code (เช่น 1234)"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-center tracking-widest text-lg"
              />
              {loginError && (
                <p className="text-red-400 text-xs text-center">รหัสผ่านไม่ถูกต้อง! กรุณาลองใหม่อีกครั้ง</p>
              )}
              <button 
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg cursor-pointer"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <Gauge className="text-cyan-400 w-8 h-8" /> Smart Pump Control Dashboard (บ้านไผ่ล้อม)
          </h1>
          <p className="text-slate-400 text-sm mt-1">ระบบควบคุมและมอนิเตอร์ปั๊มน้ำแรงดันปลายสายแบบเรียลไทม์</p>
        </div>
        
        {/* สถานะการเชื่อมต่อ & โหมด & ปุ่มล็อกอิน/ล็อกเอาต์ */}
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <span className={`w-3 h-3 rounded-full ${pumpStatus ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium">{pumpStatus ? 'PUMP RUNNING' : 'PUMP STOPPED'}</span>
          </div>

          <button 
            onClick={handleModeToggle}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
              mode === 'AUTO' 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30' 
                : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
            }`}
          >
            Mode: {mode} {isAdminLoggedIn ? '' : '🔒'}
          </button>

          {isAdminLoggedIn ? (
            <button 
              onClick={() => setIsAdminLoggedIn(false)}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" /> ออกจากระบบแอดมิน
            </button>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" /> ล็อกอินแอดมิน
            </button>
          )}
        </div>
      </header>

      {/* --- Alarm Banner (กรณีไฟดับ / ออฟไลน์) --- */}
      {isOfflineOrPowerLoss && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
          <WifiOff className="w-6 h-6 shrink-0 text-red-400" />
          <div>
            <strong>⚠️ แจ้งเตือนความผิดปกติวิกฤต:</strong> ระบบขาดการติดต่อจากอุปกรณ์ (อาจเกิดเหตุการณ์ **ไฟดับ** หรือ **อินเทอร์เน็ตหลุด** เกิน 5 นาที)
          </div>
        </div>
      )}

      {alarm && (
        <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span><strong>แจ้งเตือนสถานะการทำงาน:</strong> {alarm}</span>
        </div>
      )}

      {/* --- Main Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

        {/* 1. แสดงแรงดันจริง P3 & เวลาล่าสุด */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5" /> แรงดันปลายสาย (บ้านไผ่ล้อม)
            </h2>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 text-center relative">
              <span className="text-slate-400 text-xs block uppercase tracking-wider">แรงดันจริงปลายสาย</span>
              <span className="text-4xl font-extrabold text-cyan-400 mt-1 block">{p3Actual.toFixed(2)}</span>
              <span className="text-xs text-slate-500">Bar</span>
              
              <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>อัปเดตล่าสุด: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'กำลังรอข้อมูล...'}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 bg-slate-950/50 p-3 rounded-lg">
            *มอนิเตอร์แรงดันจริงจากปลายสายแบบเรียลไทม์
          </div>
        </div>

        {/* 2. สั่งงานเปิด-ปิดออนไลน์ (Manual Control) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
              <Power className="w-5 h-5" /> ควบคุมปั๊มออนไลน์ (Online Switch)
            </h2>

            <div className="flex flex-col items-center justify-center my-6">
              <button 
                onClick={handlePowerToggle}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl border-4 cursor-pointer ${
                  pumpStatus 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20' 
                    : 'bg-red-500/20 border-red-500 text-red-400 shadow-red-500/20'
                }`}
              >
                <Power className={`w-12 h-12 mb-1 ${pumpStatus ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
                <span className="text-sm font-bold">{pumpStatus ? 'ON' : 'OFF'} {isAdminLoggedIn ? '' : '🔒'}</span>
              </button>
              <span className="text-xs text-slate-400 mt-3 text-center">
                {isAdminLoggedIn ? 'คลิกเพื่อเปิด-ปิดปั๊ม' : '(ต้องล็อกอินแอดมินก่อนจึงจะกดเปิด-ปิดได้)'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-950/50 p-3 rounded-lg text-center">
            สถานะควบคุม: {isAdminLoggedIn ? '🔓 ปลดล็อกสิทธิ์แอดมินแล้ว' : '🔒 ล็อกอยู่ (ต้องล็อกอินมุมบนขวา)'}
          </div>
        </div>

        {/* 3. รายงานกระแส & ความร้อนมอเตอร์ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5" /> สถานะมอเตอร์ & ความปลอดภัย
            </h2>

            {/* กระแสไฟฟ้า */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">กระแสไฟฟ้ามอเตอร์</span>
                  <span className="text-xl font-bold text-slate-100">{current.toFixed(1)} A</span>
                </div>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Normal</span>
            </div>

            {/* อุณหภูมิความร้อน */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">อุณหภูมิมอเตอร์ / VFD</span>
                  <span className="text-xl font-bold text-slate-100">{temperature.toFixed(1)} °C</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${temperature > 75 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {temperature > 75 ? 'High Temp' : 'Safe'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-800 flex justify-between">
            <span>Database: Firebase Realtime</span>
            <span className="text-cyan-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Live Sync</span>
          </div>
        </div>

      </div>

      {/* --- ส่วนการตั้งค่าช่วงเวลาและขีดจำกัดแรงดันหยุดปั๊มตามช่วงเวลา (วางแทนที่ส่วน Setpoint เดิม) --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> ตั้งค่าช่วงเวลาและขีดจำกัดแรงดันหยุดปั๊มตามช่วงเวลา
            </h2>
            <p className="text-slate-400 text-xs mt-1">กำหนดช่วงเวลาแต่ละช่วงและค่าแรงดันขีดจำกัด (ต้องเข้าสู่ระบบแอดมินก่อนจึงจะเพิ่ม/ลบได้)</p>
          </div>
        </div>

        {/* ฟอร์มเพิ่มช่วงเวลา (เปิดใช้งานเฉพาะตอนล็อกอินแล้ว) */}
        {isAdminLoggedIn ? (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs text-slate-400 block mb-1">เวลาเริ่มต้น</label>
              <input 
                type="time" 
                value={newStartTime} 
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">เวลาสิ้นสุด</label>
              <input 
                type="time" 
                value={newEndTime} 
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">แรงดันจำกัด (Bar)</label>
              <input 
                type="number" 
                step="0.1" 
                value={newLimitPressure} 
                onChange={(e) => setNewLimitPressure(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <button 
              onClick={handleAddSchedule}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer h-10"
            >
              <Plus className="w-4 h-4" /> เพิ่มช่วงเวลา
            </button>
          </div>
        ) : (
          <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-xl mb-6 text-center text-xs text-slate-400">
            🔒 กรุณาคลิก <strong className="text-cyan-400">"ล็อกอินแอดมิน"</strong> ที่มุมบนขวา เพื่อปลดล็อกสิทธิ์ในการเพิ่ม ลบ หรือแก้ไขตารางเวลา
          </div>
        )}

        {/* ตารางแสดงรายการช่วงเวลา */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ลำดับ</th>
                <th className="py-3 px-4">ช่วงเวลา</th>
                <th className="py-3 px-4">แรงดันขีดจำกัด (Bar)</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length > 0 ? (
                schedules.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-950/50">
                    <td className="py-3 px-4 font-medium text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 text-cyan-400 font-semibold">{item.startTime} น. - {item.endTime} น.</td>
                    <td className="py-3 px-4 font-bold">{item.limitPressure} Bar</td>
                    <td className="py-3 px-4 text-center">
                      {isAdminLoggedIn ? (
                        <button 
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-2 rounded-lg transition-all cursor-pointer"
                          title="ลบช่วงเวลานี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">ต้องล็อกอินแอดมิน</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-slate-500">
                    ยังไม่มีข้อมูลช่วงเวลาแรงดันที่ตั้งไว้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
