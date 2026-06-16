import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createCustomIcon = (priority) => {
  const priorityClass =
    priority === "crítico"
      ? "marker-critical"
      : priority === "alto"
        ? "marker-high"
        : "marker-medium";

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `<div class="${priorityClass}"><div class="marker-pulse"></div><div class="marker-pin"></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Componente auxiliar para actualizar la vista del mapa dinámicamente
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

function MapPanel({ selectedAlert }) {
  // Estado vacío si el operador aún no hace clic en ninguna alerta
  if (!selectedAlert) {
    return (
      <div
        className="feed-empty-state"
        style={{ height: "100%", justifyContent: "center" }}
      >
        <div className="radar-scan">
          <div className="circle"></div>
          <div className="line"></div>
        </div>
        <div style={{ marginTop: "20px" }}>
          <div className="empty-text">MAPA TÁCTICO EN ESPERA</div>
          <div className="empty-subtext">
            Seleccione "UBICAR EN MAPA" en una alerta del feed para visualizar
            las coordenadas.
          </div>
        </div>
      </div>
    );
  }

  const alertPosition = [
    selectedAlert.coordinates.lat,
    selectedAlert.coordinates.lon,
  ];

  return (
    <div className="map-body-container">
      <div className="map-hud-overlay">
        <div className="hud-box top-left">
          <span>SISTEMA DE RASTREO SATELITAL SECUNDARIO</span>
        </div>
        <div className="hud-box bottom-right">
          <div className="hud-legend">
            <div className="legend-item">
              <span className="legend-dot bg-neon-red"></span> CRÍTICO
            </div>
            <div className="legend-item">
              <span className="legend-dot bg-neon-yellow"></span> ALTO
            </div>
            <div className="legend-item">
              <span className="legend-dot bg-neon-blue"></span> MEDIO
            </div>
          </div>
        </div>
      </div>

      <MapContainer
        center={alertPosition}
        zoom={15}
        style={{ height: "100%", width: "100%", backgroundColor: "#0b0e14" }}
        zoomControl={true}
      >
        <MapViewController center={alertPosition} zoom={16} />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <Marker
          position={alertPosition}
          icon={createCustomIcon(selectedAlert.priority_level)}
        >
          <Popup className="tactical-popup">
            <div style={{ fontFamily: "var(--font-data)", fontSize: "12px" }}>
              <strong style={{ color: "var(--neon-blue)" }}>
                {selectedAlert.device_id}
              </strong>
              <br />
              Tipo: {selectedAlert.emergency_type.toUpperCase()}
              <br />
              Zona: {selectedAlert.location_details?.zone}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapPanel;
