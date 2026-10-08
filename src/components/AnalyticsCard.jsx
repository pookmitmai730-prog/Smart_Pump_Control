// src/components/AnalyticsCard.jsx
import React from 'react';
import { Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function AnalyticsCard({ data }) {
  return (
    /* 🛠️ ใช้ min-w-72 (288px) ล็อกขนาดกล่องด้านนอกสุดตามมาตรฐาน Tailwind เพื่อไม่ให้โดน Grid บีบจนหาย */
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl w-full min-w-72 overflow-hidden">
      
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-slate-200">กราฟวิเคราะห์แนวโน้มแรงดัน</h3>
            <p className="text-xs text-slate-400">เปรียบเทียบแรงดันเป้าหมาย (Target) และแรงดันจริง (Actual P3)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-widest font-mono">
            Live Stream Data
          </span>
        </div>
      </div>

      {/* Recharts Area Container */}
      {/* 🛠️ ปรับมาใช้ h-72 คู่กับ min-h-72 (288px) ซึ่งเป็นคลาสมาตรฐานที่มีอยู่จริงในระบบ Tailwind CSS */}
      <div className="w-full h-72 sm:h-80 text-xs font-mono relative block min-h-72">
        
        {/* กำหนดความกว้าง 99.9% และ minWidth={288} เพื่อตัดวงจรไม่ให้ระบบคำนวณค่าเป็นเลขลบชั่วเสี้ยววินาที */}
        <ResponsiveContainer width="99.9%" height="100%" minWidth={288}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            
            <YAxis 
              stroke="#64748b" 
              tickLine={false} 
              axisLine={false}
              domain={[0, 4]} 
              dx={-5}
              unit="b"
            />
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#334155',
                borderRadius: '12px',
                color: '#f8fafc'
              }} 
            />
            
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
            />

            <Area 
              name="แรงดันเป้าหมาย (Target)"
              type="monotone" 
              dataKey="target" 
              stroke="#64748b" 
              strokeDasharray="5 5"
              fill="transparent" 
              strokeWidth={2}
            />

            <Area 
              name="แรงดันจริง (Actual P3)"
              type="monotone" 
              dataKey="actual" 
              stroke="#22d3ee" 
              fill="url(#colorActual)" 
              strokeWidth={3}
            />

          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}