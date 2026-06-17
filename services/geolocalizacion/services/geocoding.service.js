async function getAddressFromCoordinates(lat, lon) {
    let zone = "Ubicacion desconocida";
    let sector = "Sin clasificar";

    try {
        console.log(`[Geolocalizacion] Consultando satelite para: ${lat}, ${lon}...`);

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
            headers: {
                'User-Agent': 'C5-Alerta-Ciudadana/1.0 (Proyecto Academico)'
            }
        });

        if (response.ok) {
            const data = await response.json();

            if (data && data.address) {
                zone = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || "Zona no detectada";
                sector = data.address.road || data.address.pedestrian || data.address.amenity || "Punto no mapeado";
            }
        } else {
            console.warn("[Geolocalizacion Aviso] La API de mapas rechazo la conexion.");
        }
    } catch (error) {
        console.error("[Geolocalizacion Error] Fallo al conectar con OpenStreetMap:", error.message);
    }

    return { zone, sector };
}

module.exports = { getAddressFromCoordinates };