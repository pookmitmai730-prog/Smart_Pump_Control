import { useEffect, useState } from "react";

import PressureTrend from "../components/PressureTrend";
import PressureGauge from "../components/AnalyticsCard";
import ProcessDiagram from "../components/ProcessDiagram";
import ControlPanel from "../components/ControlPanel";
import EventLog from "../components/EventLog";
import StatusPanel from "../components/StatusPanel";

import "../styles/Dashboard.css";

export default function Dashboard() {

  const [p1, setP1] = useState(6);
  const [p3, setP3] = useState(4);

  const [setpoint, setSetpoint] = useState(4.0);

  const [gateOpening, setGateOpening] =
    useState(60);

  const [trendData, setTrendData] =
    useState([]);

  const [logs, setLogs] =
    useState([]);

  const [mqttConnected] =
    useState(true);

  const [signal] =
    useState("-58 dBm");

  useEffect(() => {

    const timer = setInterval(() => {

      const newP1 =
        5 + Math.random() * 2;

      const newP3 =
        (newP1 * gateOpening) / 100;

      let newGate =
        gateOpening;

      if (newP3 > setpoint + 0.2)
        newGate -= 1;

      if (newP3 < setpoint - 0.2)
        newGate += 1;

      newGate = Math.max(
        0,
        Math.min(100, newGate)
      );

      setGateOpening(newGate);

      setP1(newP1);
      setP3(newP3);

      setTrendData(prev => [
        ...prev.slice(-20),
        {
          time:
            new Date().toLocaleTimeString(),
          p1: Number(newP1.toFixed(2)),
          p3: Number(newP3.toFixed(2))
        }
      ]);

      setLogs(prev => [
        `${new Date().toLocaleTimeString()} | P3=${newP3.toFixed(2)} bar | Gate=${newGate}%`,
        ...prev.slice(0, 20)
      ]);

    }, 1000);

    return () => clearInterval(timer);

  }, [gateOpening, setpoint]);

  const action =
    p3 > setpoint
      ? "CLOSE GATE"
      : "OPEN GATE";

  const alarm =
    p3 > setpoint + 0.5
      ? "HIGH PRESSURE"
      : p3 < setpoint - 0.5
      ? "LOW PRESSURE"
      : "NORMAL";

  return (

    <div className="dashboard">

      <div className="layout">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <div className="logo">
            💧 WATER SCADA
          </div>

          <div className="menu-item active">
            Dashboard
          </div>

          <div className="menu-item">
            Pressure Trend
          </div>

          <div className="menu-item">
            Alarm History
          </div>

          <div className="menu-item">
            MQTT Status
          </div>

          <div className="menu-item">
            Settings
          </div>

        </aside>

        {/* MAIN */}

        <main className="main-content">

          {/* HEADER */}

          <header className="topbar">

            <h1>
              SMART WATER GATE SCADA
            </h1>

            <div className="online">
              ESP32 ONLINE
            </div>

          </header>

          {/* ALARM */}

          <div
            className={`alarm-banner ${
              alarm === "NORMAL"
                ? "alarm-normal"
                : "alarm-danger"
            }`}
          >
            {alarm}
          </div>

          {/* KPI */}

          <div className="kpi-grid">

            <div className="kpi-card">
              <div>P1</div>
              <h2>{p1.toFixed(2)}</h2>
              <span>bar</span>
            </div>

            <div className="kpi-card">
              <div>P3</div>
              <h2>{p3.toFixed(2)}</h2>
              <span>bar</span>
            </div>

            <div className="kpi-card">
              <div>SETPOINT</div>
              <h2>{setpoint.toFixed(2)}</h2>
              <span>bar</span>
            </div>

            <div className="kpi-card">
              <div>GATE</div>
              <h2>{gateOpening}%</h2>
              <span>OPENING</span>
            </div>

          </div>

          {/* MAIN GRID */}

          <div className="dashboard-grid">

            {/* LEFT */}

            <div>

              <ProcessDiagram
                p1={p1}
                p3={p3}
                gateOpening={gateOpening}
              />

              <PressureTrend
                data={trendData}
              />

            </div>

            {/* RIGHT */}

            <div>

<PressureGauge
  title="PRESSURE P1"
  value={p1}
  min={0}
  max={6}
/>

<PressureGauge
  title="PRESSURE P3"
  value={p3}
  min={0}
  max={6}
  setpoint={setpoint}
/>
              <ControlPanel
                setpoint={setpoint}
                setSetpoint={setSetpoint}
                action={action}
              />

              <StatusPanel
                p1={p1}
                p3={p3}
                gateOpening={gateOpening}
              />

              {/* MQTT */}

              <div className="card">

                <h3>
                  MQTT STATUS
                </h3>

                <div className="status-row">
                  <span>Broker</span>
                  <strong>
                    Connected
                  </strong>
                </div>

                <div className="status-row">
                  <span>ESP32</span>
                  <strong>
                    {mqttConnected
                      ? "Online"
                      : "Offline"}
                  </strong>
                </div>

                <div className="status-row">
                  <span>Signal</span>
                  <strong>
                    {signal}
                  </strong>
                </div>

                <div className="status-row">
                  <span>Last Update</span>
                  <strong>
                    {
                      new Date()
                      .toLocaleTimeString()
                    }
                  </strong>
                </div>

              </div>

              <EventLog
                logs={logs}
              />

            </div>

          </div>

        </main>

      </div>

    </div>

  );
}