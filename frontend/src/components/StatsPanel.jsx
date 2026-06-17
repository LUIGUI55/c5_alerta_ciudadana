import React from "react";

function StatsPanel({ alerts, totalShiftAlerts }) {
  const critical = alerts.filter((a) => a.priority_level === "crítico").length;
  const high = alerts.filter((a) => a.priority_level === "alto").length;
  const medium = alerts.filter((a) => a.priority_level === "medio").length;

  return (
    <>
      <div className="card-header">
        <div className="card-title-container">
          <span className="card-title">MÉTRICAS DE OPERACIÓN</span>
        </div>
      </div>
      <div className="card-body stats-container scrollbar-custom">
        <div className="stat-box glow-red">
          <span className="stat-label">INCIDENTES CRÍTICOS</span>
          <span className="stat-value" style={{ color: "var(--neon-red)" }}>
            {critical}
          </span>
          <div className="stat-footer">
            <span className="sub-label">Requiere despacho inmediato</span>
          </div>
        </div>

        <div className="stat-box glow-yellow">
          <span className="stat-label">PRIORIDAD ALTA</span>
          <span className="stat-value" style={{ color: "var(--neon-yellow)" }}>
            {high}
          </span>
          <div className="stat-footer">
            <span className="sub-label">Unidades en aproximación</span>
          </div>
        </div>

        <div className="stat-box glow-green">
          <span className="stat-label">PRIORIDAD MEDIA</span>
          <span className="stat-value" style={{ color: "var(--neon-blue)" }}>
            {medium}
          </span>
          <div className="stat-footer">
            <span className="sub-label">Monitoreo activo</span>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-label">TOTAL TURNO ACTUAL</span>
          <span className="stat-value">{totalShiftAlerts}</span>
          <div className="stat-footer">
            <span className="sub-label">Eventos procesados</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default StatsPanel;
