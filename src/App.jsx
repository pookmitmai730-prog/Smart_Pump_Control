import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { 
  Activity, Power, Sliders, Thermometer, 
  Gauge, AlertTriangle, RefreshCw, Lock, Unlock, Clock, WifiOff, X, Plus, Trash2, Calendar, Settings, Edit3, ArrowRight, ChevronLeft, Bell
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
  // --- ระบบนำทางหน้า: 'overview' (หน้าหลักรวม 3 จุด) หรือเลือกเจาะจง 'pump1', 'pump2', 'pump3' ---
  const [currentView, setCurrentView] = useState('overview');

  // --- State สำหรับเก็บข้อมูลปั๊มทั้ง 3 จุด (ใช้โครงสร้างเดิมของคุณ) ---
  const [pumpsData, setPumpsData] = useState({
    pump1: { name: "จุดที่ 1: บ้านไผ่ล้อม", status: false, mode: 'AUTO', p3Actual: 0.0, current: 0.0, temperature: 0.0, alarm: null, schedules: [], config: { restartDelay: 60, restartMinPressure: 2.5 } },
    pump2: { name: "จุดที่ 2: สถานีสำรอง 1", status: false, mode: 'AUTO', p3Actual: 0.0, current: 0.0, temperature: 0.0, alarm: null, schedules: [], config: { restartDelay: 60, restartMinPressure: 2.5 } },
    pump3: { name: "จุดที่ 3: สถานีสำรอง 2", status: false, mode: 'AUTO', p3Actual: 0.0, current: 0.0, temperature: 0.0, alarm: null, schedules: [], config: { restartDelay: 60, restartMinPressure: 2.5 } }
  });

  // --- State ของปั๊มตัวที่กำลังเปิดดูในหน้าจัดการ ---
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
  const [editingId, setEditingId] = useState(null);

  // --- State: การกำหนดค่าเริ่มต้นหลังจากปั๊มหยุดทำงาน ---
  const [restartDelay, setRestartDelay] = useState(60);       
  const [restartMinPressure, setRestartMinPressure] = useState(2.5); 

  // --- State สำหรับติดตามเวลาล่าสุดและการเชื่อมต่อ ---
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOfflineOrPowerLoss, setIsOfflineOrPowerLoss] = useState(false);

  // --- ⚡ เพิ่มเฉพาะ: State สำหรับป้ายแจ้งเตือนกระพริบและหายไปใน 1 นาที ---
  const [notifications, setNotifications] = useState([]);

  // --- State สำหรับระบบล็อกอินแอดมิน ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState(false);

  // --- ⚡ เพิ่มเฉพาะ: ฟังก์ชันเพิ่มแจ้งเตือนที่จะหายไปใน 60 วินาที (1 นาที) ---
  const addTimedNotification = (notif) => {
    setNotifications(prev => [notif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 60000); // 60 วินาที
  };

  // --- ตรวจสอบสถานะข้อมูลขาดหาย (เกิน 300 วินาที) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const secondsElapsed = (Date.now() - lastUpdated) / 1000;
        setIsOfflineOrPowerLoss(secondsElapsed > 300);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // --- ดึงข้อมูลแบบ Real-time ทั้งหมดจาก Firebase (โครงสร้างเดิม 100%) ---
  useEffect(() => {
    const rootRef = ref(db, 'pumps');
    const unsubscribePumps = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // ⚡ เพิ่มเฉพาะ: ตรวจจับการเปลี่ยนสถานะหรือ Alarm เพื่อสร้างการแจ้งเตือนกระพริบ 1 นาที
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

    const singlePumpRef = ref(db, 'pumpSystem');
    const unsubscribeSingle = onValue(singlePumpRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPumpsData(prev => ({
          ...prev,
          pump1: {
            name: "จุดที่ 1: บ้านไผ่ล้อม",
            status: data.status ?? prev.pump1.status,
            mode: data.mode ?? prev.pump1.mode,
            p3Actual: data.p3Actual ?? prev.pump1.p3Actual,
            current: data.current ?? prev.pump1.current,
            temperature: data.temperature ?? prev.pump1.temperature,
            alarm: data.alarm ?? prev.pump1.alarm,
            schedules: data.schedules ?? prev.pump1.schedules,
            config: data.config ?? prev.pump1.config
          }
        }));
      }
    });

    return () => {
      unsubscribePumps();
      unsubscribeSingle();
    };
  }, [pumpsData]);

  // เมื่อผู้ใช้เลือกคลิกดูปั๊มตัวไหน ให้นำข้อมูลของปั๊มตัวนั้นมาผูกเข้ากับ State เดิมของคุณ
  useEffect(() => {
    if (currentView !== 'overview' && pumpsData[currentView]) {
      const p = pumpsData[currentView];
      setPumpStatus(p.status ?? false);
      setMode(p.mode ?? 'AUTO');
      setP3Actual(p.p3Actual ?? 0.0);
      setCurrent(p.current ?? 0.0);
      setTemperature(p.temperature ?? 0.0);
      setAlarm(p.alarm ?? null);
      setSchedules(p.schedules ?? []);
      if (p.config) {
        setRestartDelay(p.config.restartDelay ?? 60);
        setRestartMinPressure(p.config.restartMinPressure ?? 2.5);
      }
    }
  }, [currentView, pumpsData]);

  // --- ตรวจสอบรหัสผ่านผู้ดูแลระบบ ---
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

  // --- ฟังก์ชันควบคุมโหมดและปั๊ม ---
  const handleModeToggle = () => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    const newMode = mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    setMode(newMode);
    set(ref(db, `pumps/${currentView}/mode`), newMode);
    if (currentView === 'pump1') {
      set(ref(db, 'pumpSystem/mode'), newMode);
    }
  };

  const handlePowerToggle = () => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    if (mode === 'MANUAL') {
      const newStatus = !pumpStatus;
      setPumpStatus(newStatus);
      set(ref(db, `pumps/${currentView}/status`), newStatus);
      if (currentView === 'pump1') {
        set(ref(db, 'pumpSystem/status'), newStatus);
      }
    } else {
      alert("ระบบอยู่ในโหมด AUTO ควบคุมด้วยแรงดัน P3 ไม่สามารถกดเปิด-ปิดเองได้ กรุณาสลับเป็น MANUAL ก่อน");
    }
  };

  // --- ฟังก์ชันจัดการตารางช่วงเวลาแรงดัน ---
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
    set(ref(db, `pumps/${currentView}/schedules`), updatedSchedules);
    if (currentView === 'pump1') {
      set(ref(db, 'pumpSystem/schedules'), updatedSchedules);
    }
    setNewStartTime('08:00');
    setNewEndTime('17:00');
    setNewLimitPressure(4.0);
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
    setNewLimitPressure(4.0);
  };

  const handleDeleteSchedule = (id) => {
    const updatedSchedules = schedules.filter(item => item.id !== id);
    setSchedules(updatedSchedules);
    set(ref(db, `pumps/${currentView}/schedules`), updatedSchedules);
    if (currentView === 'pump1') {
      set(ref(db, 'pumpSystem/schedules'), updatedSchedules);
    }
    if (editingId === id) handleCancelEdit();
  };

  // --- ฟังก์ชันบันทึกค่า Config ---
  const handleSaveRestartConfig = () => {
    if (!isAdminLoggedIn) { setShowAuthModal(true); return; }
    const configData = { restartDelay: parseInt(restartDelay), restartMinPressure: parseFloat(restartMinPressure) };
    set(ref(db, `pumps/${currentView}/config`), configData);
    if (currentView === 'pump1') {
      set(ref(db, 'pumpSystem/config'), configData);
    }
    alert("บันทึกการตั้งค่าเริ่มต้นหลังปั๊มหยุดเรียบร้อยแล้ว!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans relative">
      
      {/* ⚡ เพิ่มเฉพาะ: ป้ายแจ้งเตือนลอยมุมขวาบน (กระพริบ + หายไปใน 1 นาที) */}
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

      {/* --- Modal ใส่รหัสผ่านแอดมิน --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="flex justify-center mb-3 text-cyan-400"><Lock className="w-10 h-10" /></div>
            <h3 className="text-lg font-bold text-center mb-1 text-white">เข้าสู่ระบบผู้ดูแลระบบ</h3>
            <p className="text-slate-400 text-xs text-center mb-5">กรุณากรอกรหัสผ่านเพื่อปลดล็อกสิทธิ์ควบคุมปั๊มและแก้ไขตั้งค่าระบบ</p>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="PIN Code (เช่น 1234)"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-center tracking-widest text-lg"
              />
              {loginError && <p className="text-red-400 text-xs text-center">รหัสผ่านไม่ถูกต้อง! กรุณาลองใหม่อีกครั้ง</p>}
              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg cursor-pointer">เข้าสู่ระบบ</button>
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
            <p className="text-slate-400 text-sm mt-1">ระบบควบคุมและมอนิเตอร์ปั๊มน้ำด้วยแรงดันปลายสาย (P3) แบบเรียลไทม์</p>
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

      {/* --- Alarm Banner (กรณีออฟไลน์) --- */}
      {isOfflineOrPowerLoss && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
          <WifiOff className="w-6 h-6 shrink-0 text-red-400" />
          <div><strong>⚠️ แจ้งเตือนความผิดปกติวิกฤต:</strong> ระบบขาดการติดต่อจากอุปกรณ์ (ไฟดับหรืออินเทอร์เน็ตหลุด)</div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🟢 หน้าหลัก (Overview) */}
      {/* ======================================================== */}
      {currentView === 'overview' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
              <Activity className="w-5 h-5" /> ภาพรวมสถานีบูสเตอร์ปั๊มทั้งหมด (3 จุดติดตั้ง)
            </h2>
            <span className="text-xs text-slate-400">คลิกที่การ์ดปั๊มเพื่อเข้าไปตั้งค่ารายละเอียด</span>
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

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 text-center">
                    <span className="text-slate-400 text-xs block uppercase tracking-wider">แรงดันปลายสายออนไลน์ (P3)</span>
                    <span className="text-4xl font-extrabold text-cyan-400 mt-1 block">{(pump.p3Actual || 0).toFixed(2)}</span>
                    <span className="text-xs text-slate-500">Bar</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4">
                    <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-900 flex items-center justify-between">
                      <span>โหมด:</span>
                      <strong className="text-cyan-400">{pump.mode}</strong>
                    </div>
                    <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-900 flex items-center justify-between">
                      <span>กระแส:</span>
                      <strong className="text-slate-200">{(pump.current || 0).toFixed(1)} A</strong>
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
      {/* ⚙️ หน้าจัดการเดิม (Detail View) */}
      {/* ======================================================== */}
      {currentView !== 'overview' && (
        <div className="space-y-6">
          
          {alarm && (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span><strong>แจ้งเตือนสถานะการทำงาน:</strong> {alarm}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

            {/* 1. แสดงแรงดันจริง P3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
                  <Sliders className="w-5 h-5" /> แรงดันปลายสาย ({pumpsData[currentView]?.name})
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

            {/* 2. สั่งงานเปิด-ปิดออนไลน์ */}
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

              <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400">โหมดระบบ:</span>
                <button onClick={handleModeToggle} className={`text-xs px-3 py-1 rounded-lg font-bold border cursor-pointer ${mode === 'AUTO' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-blue-600 text-white border-blue-500'}`}>
                  {mode} {isAdminLoggedIn ? '' : '🔒'}
                </button>
              </div>
            </div>

            {/* 3. รายงานกระแส & ความร้อนมอเตอร์ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5" /> สถานะมอเตอร์ & ความปลอดภัย
                </h2>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400"><Activity className="w-6 h-6" /></div>
                    <div>
                      <span className="text-xs text-slate-400 block">กระแสไฟฟ้ามอเตอร์</span>
                      <span className="text-xl font-bold text-slate-100">{current.toFixed(1)} A</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Normal</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><Thermometer className="w-6 h-6" /></div>
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

          {/* --- ส่วนตั้งค่า Restart Configuration --- */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                <Settings className="w-5 h-5" /> ตั้งค่าเริ่มต้นหลังจากปั๊มหยุดทำงาน (Restart Configuration)
              </h2>
              <p className="text-slate-400 text-xs mt-1">กำหนดระยะเวลาหน่วงก่อนเริ่มใหม่และค่าแรงดันขั้นต่ำเพื่อป้องกันปั๊มตัดต่อถี่เกินไป</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs text-slate-400 block mb-1">หน่วงเวลาก่อนเริ่มทำงานใหม่ (วินาที)</label>
                <input type="number" value={restartDelay} onChange={(e) => setRestartDelay(e.target.value)} disabled={!isAdminLoggedIn} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">แรงดันขั้นต่ำอนุญาตให้สตาร์ท (Bar)</label>
                <input type="number" step="0.1" value={restartMinPressure} onChange={(e) => setRestartMinPressure(e.target.value)} disabled={!isAdminLoggedIn} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
              </div>
              <div>
                {isAdminLoggedIn ? (
                  <button onClick={handleSaveRestartConfig} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 px-4 rounded-lg text-sm cursor-pointer h-10">บันทึกค่ากำหนดหลังปั๊มหยุด</button>
                ) : (
                  <div className="text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800 p-2.5 rounded-lg h-10 flex items-center justify-center">🔒 ต้องล็อกอินแอดมินเพื่อบันทึก</div>
                )}
              </div>
            </div>
          </div>

          {/* --- ส่วนตั้งค่าช่วงเวลาและขีดจำกัดแรงดัน --- */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> ตั้งค่าช่วงเวลาเพื่อหยุดการทำงานของปั้ม
              </h2>
              <p className="text-slate-400 text-xs mt-1">ดับเบิลคลิกที่แถวในตารางเพื่อแก้ไขข้อมูลเดิมได้หลังจากปลดล็อกแอดมิน</p>
            </div>

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
                🔒 กรุณาคลิก <strong className="text-cyan-400">"ล็อกอินแอดมิน"</strong> ที่มุมบนขวา เพื่อปลดล็อกสิทธิ์ในการเพิ่ม ลบ หรือแก้ไขตารางเวลา
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
