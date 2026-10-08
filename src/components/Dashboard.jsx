import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// ตั้งค่า Firebase Config ของคุณ
const firebaseConfig = {
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function WaterDashboard() {
  const [data, setData] = useState({
    pressure: 0,
    flowRate: 0,
    totalMilliLitres: 0,
    voltage: 0,
    valve: false,
  });

  useEffect(() => {
    const dataRef = ref(db, "system/data");
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setData(val);
    });
    return () => unsubscribe();
  }, []);

  const toggleValve = (newState) => {
    set(ref(db, "system/controlValve"), newState);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>ESP32 Water Control Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
        <div style={{ padding: "15px", background: "#f0f0f0", borderRadius: "8px" }}>
          <h3>Pressure</h3>
          <p>{data.pressure} Bar</p>
        </div>
        <div style={{ padding: "15px", background: "#f0f0f0", borderRadius: "8px" }}>
          <h3>Flow Rate</h3>
          <p>{data.flowRate} L/min</p>
        </div>
        <div style={{ padding: "15px", background: "#f0f0f0", borderRadius: "8px" }}>
          <h3>Total Volume</h3>
          <p>{data.totalMilliLitres} mL</p>
        </div>
        <div style={{ padding: "15px", background: "#f0f0f0", borderRadius: "8px" }}>
          <h3>Supply Voltage</h3>
          <p>{data.voltage} V</p>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Valve Control</h3>
        <button
          onClick={() => toggleValve(!data.valve)}
          style={{
            padding: "10px 20px",
            backgroundColor: data.valve ? "#d9534f" : "#5cb85c",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {data.valve ? "Turn OFF Valve" : "Turn ON Valve"}
        </button>
      </div>
    </div>
  );
}