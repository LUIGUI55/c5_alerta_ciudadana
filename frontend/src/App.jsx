import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Header from "./components/Header";
import StatsPanel from "./components/StatsPanel";
import AlertFeed from "./components/AlertFeed";
import MapPanel from "./components/MapPanel";
import HistoryTable from "./components/HistoryTable";

const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:3001");

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);

  // estados para controlar la vista y el mapa
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [totalShiftAlerts, setTotalShiftAlerts] = useState(0);

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("nueva_alerta", (alerta) => {
      setLiveAlerts((prevAlerts) => [alerta, ...prevAlerts]);
      setTotalShiftAlerts((prevTotal) => prevTotal + 1);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("nueva_alerta");
    };
  }, []);

  const handleDismissAlert = (alertId) => {
    // Filtra la alerta notificada para quitarla de la columna "Feed Táctico"
    setLiveAlerts((prevAlerts) =>
      prevAlerts.filter((a) => a.alert_id !== alertId),
    );
  };

  return (
    <>
      <div className="cyber-grid-overlay"></div>
      <div className="scanline"></div>

      <div className="dashboard-container">
        <Header
          isConnected={isConnected}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <div className="dashboard-grid">
          {activeView === "dashboard" ? (
            <>
              <div className="col-stats bento-card">
                <StatsPanel
                  alerts={liveAlerts}
                  totalShiftAlerts={totalShiftAlerts}
                />
              </div>

              <div className="col-map bento-card border-neon-blue">
                <MapPanel selectedAlert={selectedAlert} />
              </div>

              <div className="col-feed bento-card">
                <div className="card-header">
                  <div className="card-title-container">
                    <span className="neon-indicator blink-red"></span>
                    <span className="card-title">FEED TÁCTICO</span>
                  </div>
                  <span className="alert-feed-count-badge">
                    {liveAlerts.length} ACTIVAS
                  </span>
                </div>
                <div
                  className="card-body scrollbar-custom"
                  style={{ overflowY: "auto" }}
                >
                  <AlertFeed
                    alerts={liveAlerts}
                    onSelectAlert={setSelectedAlert}
                    onDismissAlert={handleDismissAlert}
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              className="col-history bento-card"
              style={{ gridColumn: "span 12", height: "100%" }}
            >
              <HistoryTable />
            </div>
          )}
        </div>

        <div className="dashboard-footer">
          <div className="footer-system-log">
            <span className="log-title">SYS_LOG &gt;</span>
            <div className="log-scroller">
              <span className="log-entry">
                Sistema C5 Operativo. Conexión a Redis establecida. Esperando
                telemetría...
              </span>
            </div>
          </div>
          <div className="footer-meta">
            <span>OPERADOR 1</span>
            <span>NODO: CENTRAL</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
