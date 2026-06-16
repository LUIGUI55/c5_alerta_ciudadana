const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
const GRPC_HOST = '0.0.0.0';
const GRPC_PORT = process.env.GRPC_PORT || 50051;

// ==========================================
// CONFIGURACIÓN SERVIDOR gRPC
// ==========================================
const PROTO_PATH = path.join(__dirname, 'proto', 'geolocation.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const geoProto = grpc.loadPackageDefinition(packageDefinition).geolocation;

// ==========================================
// LÓGICA DE NEGOCIO: GEOCODIFICACIÓN INVERSA
// ==========================================
// Convertimos la función en async para poder usar await con fetch
async function enrichAlertData(call, callback) {
    const alertRequest = call.request;
    console.log(`\n[Geolocalizacion] Peticion recibida para dispositivo: ${alertRequest.device_id}`);

    const lat = alertRequest.coordinates.lat;
    const lon = alertRequest.coordinates.lon;

    let zone = "Ubicacion desconocida";
    let sector = "Sin clasificar";

    try {
        console.log(`[Geolocalizacion] Consultando satelite para: ${lat}, ${lon}...`);

        // Petición a OpenStreetMap. Por políticas de uso gratuito, requiere un User-Agent.
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
            headers: {
                'User-Agent': 'C5-Alerta-Ciudadana/1.0 (Proyecto Academico)'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Nominatim devuelve la dirección desglosada en un objeto 'address'
            if (data && data.address) {
                // Extraemos la colonia, municipio o ciudad para la Zona
                zone = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || "Zona no detectada";

                // Extraemos la calle exacta o punto de interés para el Sector
                sector = data.address.road || data.address.pedestrian || data.address.amenity || "Punto no mapeado";
            }
        } else {
            console.warn("[Geolocalizacion Aviso] La API de mapas rechazo la conexion.");
        }
    } catch (error) {
        console.error("[Geolocalizacion Error] Fallo al conectar con OpenStreetMap:", error.message);
    }

    const locationDetails = {
        zone: zone,
        sector: sector
    };

    const enrichedResponse = {
        success: true,
        message: "Geolocalizacion real calculada exitosamente",
        device_id: alertRequest.device_id,
        coordinates: alertRequest.coordinates,
        timestamp: alertRequest.timestamp,
        emergency_type: alertRequest.emergency_type,
        press_count: alertRequest.press_count,
        location_details: JSON.stringify(locationDetails)
    };

    console.log(`[Geolocalizacion] Ubicacion exacta: ${sector}, ${zone}`);

    // Retornamos el resultado al servicio de Recepcion
    callback(null, enrichedResponse);
}

// ==========================================
// INICIALIZACIÓN DEL SERVIDOR
// ==========================================
function main() {
    const server = new grpc.Server();

    server.addService(geoProto.GeolocationService.service, { EnrichAlertData: enrichAlertData });

    server.bindAsync(`${GRPC_HOST}:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error('[Geolocalizacion Error] Fallo al arrancar el servidor:', error);
            return;
        }
        console.log(`[Geolocalizacion] Servidor gRPC escuchando en el puerto ${port}`);
    });
}

main();