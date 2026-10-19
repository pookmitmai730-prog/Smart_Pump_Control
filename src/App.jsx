import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { 
  Activity, Power, Sliders, Thermometer, 
  Gauge, AlertTriangle, RefreshCw, Lock, Unlock, Clock, WifiOff, X, Plus, Trash2, Calendar, Settings, Edit3, ArrowRight, ChevronLeft, Zap, Bell
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
  // --- ระบบนำทางหน้า: 'overview' หรือเลือกเจาะจง 'pump1', 'pump2', 'pump3' ---
  const [currentView, setCurrentView] = useState('overview');

  // --- เก็บข้อมูลปั๊มทั้ง 3 จุด อิงโครงสร้าง JSON ใหม่ ---
  const [pumpsData, setPumpsData] = useState({
    pump1: { name: "จุดที่ 1: บ้านไผ่ล้อม", status: false, mode: 'AUTO', p3Actual: 0.0, p3Setpoint: 1.2, current: 0.0, frequency: 0, temperature: 0.0, alarm: null, schedules: [], config: { restartDelay: 5, restartMinPressure: 0.2 } },
    pump2: { name: "จุดที่ 2: โนนตาล", status: false, mode: 'AUTO', p3Actual: 0.0, p3Setpoint: 1.2, current: 0.0, frequency: 0, temperature: 0.0, alarm: null, schedules: [], config: { restartDelay: 5, restartMinPressure: 0.2 } },
    pump3: { name: "จุดที่ 3: ธาตุพนมเหนือ", status: false, mode: 'AUTO', p3Actual: 0.0, p3Setpoint: 1.2, current: 0.0, frequency: 0, temperature: 0.0, alarm: null, schedules: [], config: { restartDelay: 5, restartMinPressure: 0.2 } }
  });

  // --- State ของปั๊มตัวที่กำลังเปิดดูในหน้าจัดการ ---
  const [pumpStatus, setPumpStatus] = useState(false); 
  const [mode, setMode] = useState('AUTO');              
  const [p3Actual, setP3Actual] = useState(0.0);        
  const [p3Setpoint, setP3Setpoint] = useState(1.2);        
  const [current, setCurrent] = useState(0.0);          
  const [frequency, setFrequency] = useState(0);          
  const [temperature, setTemperature] = useState(0.0);  
  const [alarm, setAlarm] = useState(null);             
  
  // --- ตารางตั้งค่าช่วงเวลา ---
  const [schedules, setSchedules] = useState([]);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newLimitPressure, setNewLimitPressure] = useState(0.9);
  const [editingId, setEditingId] = useState(null);

  // --- การตั้งค่า Restart Config ---
  const [restartDelay, setRestartDelay] = useState(5);       
  const [restartMinPressure, setRestartMinPressure] = useState(0.2); 

  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOfflineOrPowerLoss, setIsOfflineOrPowerLoss] = useState(false);

  // --- ระบบแจ้งเตือนกระพริบและหายไปใน 1 นาที ---
  const [notifications, setNotifications] = useState([]);

  // --- ระบบแอดมิน ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState(false);

  // ฟังก์ชันเพิ่มแจ้งเตือน (ลบอัตโนมัติใน 60 วินาที)
  const addTimedNotification = (notif) => {
    setNotifications(prev => [notif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 60000);
  };

  // เช็กออฟไลน์
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const secondsElapsed = (Date.now() - lastUpdated) / 1000;
        setIsOfflineOrPowerLoss(secondsElapsed > 300);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // --- ดึงข้อมูล Real-time จาก /pumps ทั้งหมด ---
  useEffect(() => {
    const pumpsRef = ref(db, 'pumps');
    const unsubscribe = onValue(pumpsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // ตรวจจับการเปลี่ยนแปลงสถานะหรือ Alarm เพื่อแจ้งเตือนชั่วคราว
        Object.entries(data).forEach(([key, newPump]) => {
          const oldPump = pumpsData[key];
          if (oldPump) {
            if (oldPump.status !== newPump.status) {
              addTimedNotification({
                id: Date.now() + Math.random(),
                title: `แจ้งเตือนสถานะ (${newPump.name || key})`,
                message: newPump.status ? 'ปั๊มเริ่มทำงานปกติ (RUNNING)' : 'ปั๊มหยุดการทำงาน (STOPPED)',
                type: newPump.status ? 'success' : 'warning'
              });
            }
            if (newPump.alarm && oldPump.alarm !== newPump.alarm) {
              addTimedNotification({
                id: Date.now() + Math.random(),
                title: `⚠️ แจ้งเตือนความผิดปกติ (${newPump.name || key})`,
                message: newPump.alarm,
                type: 'error'
              });
            }
          }
        });

        setPumpsData(prev => ({
          pump1: data.pump1 || prev.pump1,
          pump2: data.pump2 || prev.pump2,
          pump3: data.pump3 || prev.pump3,
        }));
        setLastUpdated(Date.now());
      }
    });

    return () => unsubscribe();
  }, [pumpsData]);

  // เมื่อเปลี่ยนหน้าไปดูปั๊มตัวไหน ให้นำข้อมูลมาผูกเข้ากับ State หลัก
  useEffect(() => {
    if (currentView !== 'overview' && pumpsData[currentView]) {
      const p = pumpsData[currentView];
      setPumpStatus(p.status ?? false);
      setMode(p.mode ?? 'AUTO');
      setP3Actual(p.p3Actual ?? 0.0);
      setP3Setpoint(p.p3Setpoint ?? 1.2);
      setCurrent(p.current ?? 0.0);
      setFrequency(p.frequency ?? 0);
      setTemperature(p.temperature ?? 0.0);
      setAlarm(p.alarm ?? null);
      setSchedules(p.schedules ?? []);
      if (p.config) {
        setRestartDelay(p.config.restartDelay ?? 5);
        setRestartMinPressure(p.config.restartMinPressure ?? 0.2);
      }
    }
  }, [currentView, pumpsData]);

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

  const getDbPath = (path) => `pumps/${currentView}/${path}`;

  const handleModeToggle = () => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    const newMode = mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    setMode(newMode);
    set(ref(db, getDbPath('mode')), newMode);
  };

  const handlePowerToggle = () => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    if (mode === 'MANUAL') {
      const newStatus = !pumpStatus;
      setPumpStatus(newStatus);
      set(ref(db, getDbPath('status')), newStatus);
    } else {
      alert("ระบบอยู่ในโหมด AUTO ควบคุมด้วยแรงดัน ไม่สามารถกดเปิด-ปิดเองได้");
    }
  };

  const handleAddOrUpdateSchedule = () => {
    let updatedSchedules;
    if (editingId !== null) {
      updatedSchedules = schedules.map(item => item.id === editingId ? { ...item, startTime: newStartTime, endTime: newEndTime, limitPressure: parseFloat(newLimitPressure) } : item);
      setEditingId(null);
    } else {
      const newItem = { id: Date.now(), startTime: newStartTime, endTime: newEndTime, limitPressure: parseFloat(newLimitPressure) };
      updatedSchedules = [...schedules, newItem];
    }
    setSchedules(updatedSchedules);
    set(ref(db, getDbPath('schedules')), updatedSchedules);
    setNewStartTime('08:00');
    setNewEndTime('17:00');
    setNewLimitPressure(0.9);
  };

  const handleRowDoubleClick = (item) => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    setEditingId(item.id);
    setNewStartTime(item.startTime);
    setNewEndTime(item.endTime);
    setNewLimitPressure(item.limitPressure);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewStartTime('08:00');
    setNewEndTime('17:00');
    setNewLimitPressure(0.9);
  };

  const handleDeleteSchedule = (id) => {
    const updatedSchedules = schedules.filter(item => item.id !== id);
    setSchedules(updatedSchedules);
    set(ref(db, getDbPath('schedules')), updatedSchedules);
    if (editingId === id) handleCancelEdit();
  };

  const handleSaveRestartConfig = () => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    const configData = { restartDelay: parseInt(restartDelay), restartMinPressure: parseFloat(restartMinPressure) };
    set(ref(db, getDbPath('config')), configData);
    alert("บันทึกการตั้งค่าเรียบร้อยแล้ว!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans relative">
      
      {/* --- Floating Notification Center (กระพริบและหายไปใน 1 นาที) --- */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notifications.map((notif) => {
          let bgColor = 'bg-slate-900 border-cyan-500 text-cyan-300';
          if (notif.type === 'success') bgColor = 'bg-emerald-950/90 border-emerald-500 text-emerald-300';
          if (notif.type === 'warning') bgColor = 'bg-amber-950/90 border-amber-500 text-amber-300';
          if (notif.type === 'error') bgColor = 'bg-red-950/90 border-red-500 text-red-300';

          return (
            <div 
              key={notif.id} 
              className={`pointer-events-auto border-2 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-pulse flex items-start gap-3 transition-all ${bgColor}`}
            >
              <Bell className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">{notif.title}</h4>
                <p className="text-xs mt-0.5 opacity-90">{notif.message}</p>
                <span className="text-[10px] opacity-70 mt-1 block">แจ้งเตือนชั่วคราว (หายไปใน 1 นาที)</span>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* --- Modal แอดมิน --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="flex justify-center mb-3 text-cyan-400"><Lock className="w-10 h-10" /></div>
            <h3 className="text-lg font-bold text-center mb-1 text-white">เข้าสู่ระบบผู้ดูแลระบบ</h3>
            <p className="text-slate-400 text-xs text-center mb-5">กรุณากรอกรหัสผ่านเพื่อปลดล็อกสิทธิ์ควบคุม</p>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="PIN Code (เช่น 1234)"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-center tracking-widest text-lg"
              />
              {loginError && <p className="text-red-400 text-xs text-center">รหัสผ่านไม่ถูกต้อง!</p>}
              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl cursor-pointer">เข้าสู่ระบบ</button>
            </form>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          {currentView !== 'overview' && (
            <button 
              onClick={() => setCurrentView('overview')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-sm font-semibold"
            >
              <ChevronLeft className="w-5 h-5" /> กลับหน้าหลัก
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
              <Gauge className="text-cyan-400 w-8 h-8" /> PWA Booster Station Command Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">ระบบควบคุมและมอนิเตอร์สถานีบูสเตอร์ปั๊ม (3 จุดติดตั้ง)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {isAdminLoggedIn ? (
            <button onClick={() => setIsAdminLoggedIn(false)} className="flex items-center gap-1.5 bg-red-500/25 hover:bg-red-500/35 border border-red-500/50 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              <Unlock className="w-4 h-4" /> ออกจากระบบแอดมิน
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              <Lock className="w-4 h-4" /> ล็อกอินแอดมิน
            </button>
          )}
        </div>
      </header>

      {/* --- Alarm Banner --- */}
      {isOfflineOrPowerLoss && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
          <WifiOff className="w-6 h-6 shrink-0 text-red-400" />
          <div><strong>⚠️ แจ้งเตือนวิกฤต:</strong> ระบบขาดการติดต่อจากอุปกรณ์ (ไฟดับหรืออินเทอร์เน็ตหลุด)</div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🟢 หน้าหลัก (Overview) */}
      {/* ======================================================== */}
      {currentView === 'overview' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
              <Activity className="w-5 h-5" /> ภาพรวมสถานีบูสเตอร์ปั๊มทั้งหมด
            </h2>
            <span className="text-xs text-slate-400">คลิกที่การ์ดเพื่อเข้าไปตั้งค่ารายละเอียด</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(pumpsData).map(([key, pump]) => (
              <div 
                key={key} 
                onClick={() => setCurrentView(key)}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${pump.status ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></div>

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">{key.toUpperCase()}</span>
                      <h3 className="text-lg font-bold text-white mt-0.5">{pump.name}</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${pump.status ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {pump.status ? 'RUNNING' : 'STOPPED'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 grid grid-cols-2 gap-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">แรงดันจริง (P3)</span>
                      <span className="text-2xl font-extrabold text-cyan-400 block mt-0.5">{(pump.p3Actual || 0).toFixed(3)}</span>
                      <span className="text-[10px] text-slate-500">Bar</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">ค่าเป้าหมาย (Setpoint)</span>
                      <span className="text-2xl font-bold text-slate-200 block mt-0.5">{(pump.p3Setpoint || 0).toFixed(1)}</span>
                      <span className="text-[10px] text-slate-500">Bar</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 mb-4">
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900 text-center">
                      <span>โหมด</span>
                      <strong className="text-cyan-400 block mt-0.5">{pump.mode}</strong>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900 text-center">
                      <span>ความถี่</span>
                      <strong className="text-amber-400 block mt-0.5">{pump.frequency || 0} Hz</strong>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900 text-center">
                      <span>กระแส</span>
                      <strong className="text-slate-200 block mt-0.5">{(pump.current || 0).toFixed(1)} A</strong>
                    </div>
                  </div>

                  {pump.alarm && (
                    <div className="bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs p-2.5 rounded-lg mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="truncate">{pump.alarm}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-cyan-400 group-hover:text-cyan-300 font-semibold">
                  <span>คลิกเพื่อเข้าไปจัดการตั้งค่า</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ⚙️ หน้าจัดการรายละเอียด (Detail View) */}
      {/* ======================================================== */}
      {currentView !== 'overview' && (
        <div className="space-y-6">
          
          {alarm && (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3 animate-pulse">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span><strong>แจ้งเตือนสถานะการทำงาน:</strong> {alarm}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

            {/* 1. แรงดันจริง P3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
                  <Sliders className="w-5 h-5" /> แรงดันปลายสาย ({pumpsData[currentView]?.name})
                </h2>
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-3 text-center relative">
                  <span className="text-slate-400 text-xs block uppercase tracking-wider">แรงดันจริง (P3 Actual)</span>
                  <span className="text-4xl font-extrabold text-cyan-400 mt-1 block">{p3Actual.toFixed(3)}</span>
                  <span className="text-xs text-slate-500">Bar</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center px-4">
                  <span className="text-xs text-slate-400">แรงดันเป้าหมาย (Setpoint):</span>
                  <strong className="text-cyan-400 text-base">{p3Setpoint.toFixed(1)} Bar</strong>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>อัปเดตล่าสุด: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'รอข้อมูล...'}</span>
              </div>
            </div>

            {/* 2. สั่งงานเปิด-ปิดออนไลน์ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
                  <Power className="w-5 h-5" /> ควบคุมปั๊มออนไลน์ (Online Switch)
                </h2>

                <div className="flex flex-col items-center justify-center my-4">
                  <button 
                    onClick={handlePowerToggle}
                    className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl border-4 cursor-pointer ${
                      pumpStatus ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'
                    }`}
                  >
                    <Power className={`w-10 h-10 mb-1 ${pumpStatus ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
                    <span className="text-sm font-bold">{pumpStatus ? 'ON' : 'OFF'} {isAdminLoggedIn ? '' : '🔒'}</span>
                  </button>
                  <span className="text-xs text-slate-400 mt-2 text-center">
                    {isAdminLoggedIn ? 'คลิกเพื่อเปิด-ปิดปั๊ม' : '(ต้องล็อกอินแอดมินก่อน)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400">โหมดระบบ:</span>
                <button onClick={handleModeToggle} className={`text-xs px-3 py-1 rounded-lg font-bold border cursor-pointer ${mode === 'AUTO' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-blue-600 text-white border-blue-500'}`}>
                  {mode} {isAdminLoggedIn ? '' : '🔒'}
                </button>
              </div>
            </div>

            {/* 3. มอเตอร์และอินเวอร์เตอร์ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5" /> สถานะอินเวอร์เตอร์ & มอเตอร์
                </h2>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-300">ความถี่ (Frequency)</span>
                  <span className="text-lg font-bold text-amber-400">{frequency} Hz</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-300">กระแสไฟฟ้ามอเตอร์</span>
                  <span className="text-lg font-bold text-slate-100">{current.toFixed(1)} A</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">อุณหภูมิมอเตอร์</span>
                  <span className={`text-lg font-bold ${temperature > 75 ? 'text-red-400' : 'text-slate-100'}`}>{temperature.toFixed(1)} °C</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-800 flex justify-between">
                <span>Firebase Realtime</span>
                <span className="text-cyan-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Live</span>
              </div>
            </div>

          </div>

          {/* --- ตั้งค่า Restart Configuration --- */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5" /> ตั้งค่าเริ่มต้นหลังจากปั๊มหยุดทำงาน (Restart Configuration)
            </h2>
            <p className="text-slate-400 text-xs mb-4">กำหนดระยะเวลาหน่วงก่อนเริ่มใหม่และค่าแรงดันขั้นต่ำ</p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs text-slate-400 block mb-1">หน่วงเวลาก่อนเริ่มใหม่ (วินาที)</label>
                <input type="number" value={restartDelay} onChange={(e) => setRestartDelay(e.target.value)} disabled={!isAdminLoggedIn} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">แรงดันขั้นต่ำอนุญาตสตาร์ท (Bar)</label>
                <input type="number" step="0.1" value={restartMinPressure} onChange={(e) => setRestartMinPressure(e.target.value)} disabled={!isAdminLoggedIn} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
              </div>
              <div>
                {isAdminLoggedIn ? (
                  <button onClick={handleSaveRestartConfig} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 rounded-lg text-sm cursor-pointer h-10">บันทึกค่ากำหนด</button>
                ) : (
                  <div className="text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 p-2.5 rounded-lg h-10 flex items-center justify-center">🔒 ต้องล็อกอินแอดมิน</div>
                )}
              </div>
            </div>
          </div>

          {/* --- ตารางตั้งค่าช่วงเวลา --- */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5" /> ตั้งค่าช่วงเวลาและขีดจำกัดแรงดันหยุดปั๊ม
            </h2>
            <p className="text-slate-400 text-xs mb-4">ดับเบิลคลิกที่แถวในตารางเพื่อแก้ไขข้อมูลเดิมได้หลังจากปลดล็อกแอดมิน</p>

            {isAdminLoggedIn ? (
              <div className={`p-4 rounded-xl border mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end ${editingId !== null ? 'bg-amber-950/20 border-amber-500/50' : 'bg-slate-950 border-slate-800'}`}>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">เวลาเริ่มต้น</label>
                  <input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">เวลาสิ้นสุด</label>
                  <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">แรงดันจำกัด (Bar)</label>
                  <input type="number" step="0.1" value={newLimitPressure} onChange={(e) => setNewLimitPressure(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddOrUpdateSchedule} className={`flex-1 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-sm cursor-pointer h-10 ${editingId !== null ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950'}`}>
                    {editingId !== null ? <><Edit3 className="w-4 h-4" /> บันทึกการแก้ไข</> : <><Plus className="w-4 h-4" /> เพิ่มช่วงเวลา</>}
                  </button>
                  {editingId !== null && (
                    <button onClick={handleCancelEdit} className="bg-slate-800 text-slate-300 px-3 py-2 rounded-lg text-sm h-10 cursor-pointer">ยกเลิก</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl mb-6 text-center text-xs text-slate-400">
                🔒 กรุณาล็อกอินแอดมินที่มุมบนขวา เพื่อเพิ่มหรือแก้ไขตารางเวลา
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ลำดับ</th>
                    <th className="py-3 px-4">ช่วงเวลา (ดับเบิลคลิกเพื่อแก้ไข)</th>
                    <th className="py-3 px-4">แรงดันขีดจำกัด (Bar)</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length > 0 ? (
                    schedules.map((item, index) => (
                      <tr 
                        key={item.id} 
                        onDoubleClick={() => handleRowDoubleClick(item)}
                        className={`border-b border-slate-800 cursor-pointer ${editingId === item.id ? 'bg-amber-500/20' : 'hover:bg-slate-900/60'}`}
                      >
                        <td className="py-3 px-4 font-medium text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 text-cyan-400 font-semibold">{item.startTime} น. - {item.endTime} น.</td>
                        <td className="py-3 px-4 font-bold">{item.limitPressure} Bar</td>
                        <td className="py-3 px-4 text-center">
                          {isAdminLoggedIn ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleRowDoubleClick(item)} className="bg-amber-500/20 text-amber-400 p-2 rounded-lg cursor-pointer hover:bg-amber-500/30"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteSchedule(item.id)} className="bg-red-500/20 text-red-400 p-2 rounded-lg cursor-pointer hover:bg-red-500/30"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">ต้องล็อกอินแอดมิน</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="text-center py-6 text-slate-500">ยังไม่มีข้อมูลช่วงเวลาแรงดันที่ตั้งไว้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
