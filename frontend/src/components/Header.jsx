import React, { useState, useEffect } from "react";

function Header({ isConnected, activeView, setActiveView }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="dashboard-header">
      <div className="header-logo">
        <div
          className={`neon-indicator ${isConnected ? "blink-green" : "blink-red"}`}
        ></div>
        <div className="title-wrapper">
          <span className="tactical-title">SISTEMA C5</span>
          <span className="subtitle">ALERTA CIUDADANA DISTRIBUIDA</span>
        </div>
      </div>

      <div className="header-controls">
        <div style={{ display: "flex", gap: "10px", marginRight: "15px" }}>
          <button
            className={`btn btn-sm ${activeView === "dashboard" ? "btn-neon-blue" : "btn-secondary"}`}
            onClick={() => setActiveView("dashboard")}
          >
            DASHBOARD
          </button>
          <button
            className={`btn btn-sm ${activeView === "history" ? "btn-neon-blue" : "btn-secondary"}`}
            onClick={() => setActiveView("history")}
          >
            HISTORIAL
          </button>
        </div>

        <div className={`websocket-badge ${isConnected ? "connected" : ""}`}>
          WS: {isConnected ? "EN LÍNEA" : "DESCONECTADO"}
        </div>

        <div className="header-clock">
          <div className="clock-label">HORA LOCAL (CDMX)</div>
          <div className="clock-time">
            {time.toLocaleTimeString("es-MX", { hour12: false })}
          </div>
          <div className="clock-date">
            {time
              .toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              .toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
