import React from "react";

function AlertFeed({ alerts, onSelectAlert, onDismissAlert }) {
  if (alerts.length === 0) {
    return (
      <div className="feed-empty-state">
        <div className="radar-scan">
          <div className="circle"></div>
          <div className="line"></div>
        </div>
        <div>
          <div className="empty-text">ESCANEO SECTORIAL ACTIVO</div>
          <div className="empty-subtext">
            No hay incidentes reportados en este momento.
          </div>
        </div>
      </div>
    );
  }

  const handleNotifyAuthorities = async (alertId) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/historial/${alertId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Notificada" }),
        },
      );

      if (response.ok) {
        onDismissAlert(alertId); // Quita la alerta del Feed
      }
    } catch (error) {
      console.error("Error al notificar a las autoridades:", error);
    }
  };

  return (
    <div className="alert-feed-wrapper">
      {alerts.map((alert) => {
        const priorityClass =
          alert.priority_level === "crítico"
            ? "priority-critical"
            : alert.priority_level === "alto"
              ? "priority-high"
              : "priority-medium";

        return (
          <div key={alert.alert_id} className={`alert-card ${priorityClass}`}>
            <div className="alert-card-header">
              <span className="alert-id">{alert.device_id}</span>
              <span className="alert-timestamp">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="alert-card-body">
              <div className="info-item">
                <span className="info-label">Tipo</span>
                <span
                  className="info-value"
                  style={{ textTransform: "capitalize" }}
                >
                  {alert.emergency_type}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Zona</span>
                <span className="info-value">
                  {alert.location_details?.zone}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Coordenadas</span>
                <span className="info-value mono">
                  {alert.coordinates.lat.toFixed(4)},{" "}
                  {alert.coordinates.lon.toFixed(4)}
                </span>
              </div>
              <div className="info-item" style={{ justifyContent: "center" }}>
                <span
                  className={`badge-priority ${priorityClass.split("-")[1]}`}
                >
                  {alert.priority_level.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="alert-card-actions">
              <button
                className="btn btn-sm btn-neon-blue"
                onClick={() => onSelectAlert(alert)}
              >
                UBICAR EN MAPA
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleNotifyAuthorities(alert.alert_id)}
              >
                NOTIFICAR AUTORIDADES
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertFeed;
