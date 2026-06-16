import React, { useState, useEffect } from "react";

function HistoryTable() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Función para consumir el MS de Historial vía REST
  const fetchHistory = async () => {
    setLoading(true);
    try {
      // La IP/Puerto dependerá de cómo expongas el servicio en Docker Compose
      const response = await fetch("http://localhost:4000/api/historial");
      if (response.ok) {
        const result = await response.json();
        setHistory(result.data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carga inicial del historial
    fetchHistory();
  }, []);

  return (
    <>
      <div className="card-header history-header-wrapper">
        <div className="header-left">
          <span className="card-title">
            AUDITORÍA DE INCIDENTES (POSTGRESQL)
          </span>
        </div>

        <div className="history-filters">
          <div className="search-box">
            <input type="text" placeholder="Buscar ID o Zona..." />
          </div>
          <div className="filter-buttons">
            <button className="btn-filter active">TODOS</button>
            <button className="btn-filter">CRÍTICOS</button>
          </div>
          <button className="btn btn-sm btn-neon-blue" onClick={fetchHistory}>
            ACTUALIZAR
          </button>
        </div>
      </div>

      <div className="history-table-container scrollbar-custom">
        <table className="tactical-table">
          <thead>
            <tr>
              <th>ID ALERTA</th>
              <th>TIMESTAMP</th>
              <th>DISPOSITIVO</th>
              <th>TIPO</th>
              <th>ZONA</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--text-muted)",
                  }}
                >
                  No hay registros en la base de datos.
                </td>
              </tr>
            ) : (
              history.map((row) => (
                <tr key={row.alert_id}>
                  <td className="cell-id">{row.alert_id.split("-")[0]}...</td>
                  <td className="cell-time">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="cell-esp32">{row.device_id}</td>
                  <td style={{ textTransform: "uppercase" }}>
                    {row.emergency_type}
                  </td>
                  <td>{row.zone}</td>
                  <td>
                    <span className="badge-status resolved">
                      {row.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <span className="pagination-info">
          Mostrando registros de la réplica de lectura
        </span>
        <div className="pagination-controls">
          <button className="btn-page" disabled>
            &lt;
          </button>
          <button className="btn-page active">1</button>
          <button className="btn-page">&gt;</button>
        </div>
      </div>
    </>
  );
}

export default HistoryTable;
