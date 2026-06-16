const mqtt = require('mqtt');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://mosquitto:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'c5/alertas';
const GEOLOCATION_GRPC_URI = process.env.GRPC_GEOLOCALIZACION_URL || 'geolocalizacion:50051';

// ==========================================
// CONFIGURACIÓN CLIENTE gRPC
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

const geoClient = new geoProto.GeolocationService(
    GEOLOCATION_GRPC_URI,
    grpc.credentials.createInsecure()
);

// ==========================================
// CONEXIÓN AL BROKER MQTT
// ==========================================
console.log(`[Gateway] Conectando a MQTT Broker en: ${MQTT_BROKER}`);
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
    console.log(`[Gateway] Conectado exitosamente a Mosquitto.`);
    mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (!err) {
            console.log(`[Gateway] Suscrito al tópico: "${MQTT_TOPIC}"`);
        } else {
            console.error(`[Gateway] Error al suscribirse al tópico:`, err);
        }
    });
});

// ==========================================
// FLUJO PRINCIPAL: RECEPCIÓN Y VALIDACIÓN
// ==========================================
mqttClient.on('message', (topic, message) => {
    try {
        const rawData = message.toString();
        const alertData = JSON.parse(rawData);

        console.log(`\n[Gateway] Mensaje recibido de ${topic}:`, alertData);

        if (!validateAlertFormat(alertData)) {
            console.error(`[Validación Fallida] El JSON recibido no cuenta con la estructura requerida.`);
            return;
        }

        sendToGeolocationService(alertData);

    } catch (error) {
        console.error(`[Error de Parsing] El mensaje no es un JSON válido:`, error.message);
    }
});

// ==========================================
// FUNCIONES DE SOPORTE
// ==========================================
function validateAlertFormat(data) {
    // Añadido press_count a los campos obligatorios
    const requiredFields = ['device_id', 'coordinates', 'timestamp', 'emergency_type', 'press_count'];
    const hasMainFields = requiredFields.every(field => data.hasOwnProperty(field) && data[field] !== null && data[field] !== '');

    if (!hasMainFields) return false;
    if (typeof data.coordinates.lat === 'undefined' || typeof data.coordinates.lon === 'undefined') return false;

    return true;
}

function sendToGeolocationService(data) {
    const payload = {
        device_id: String(data.device_id),
        coordinates: {
            lat: parseFloat(data.coordinates.lat),
            lon: parseFloat(data.coordinates.lon)
        },
        timestamp: String(data.timestamp),
        emergency_type: String(data.emergency_type),
        press_count: Number(data.press_count)
    };

    console.log(`[gRPC] Enviando datos a MS Geolocalización...`);

    geoClient.EnrichAlertData(payload, (error, response) => {
        if (error) {
            console.error(`[gRPC Error] No se pudo comunicar con el MS de Geolocalización:`, error.message);
            return;
        }

        if (response.success) {
            console.log(`[gRPC Éxito] Dato enriquecido recibido. Enviando a Motor de Prioridad...`);

            const payloadParaPrioridad = {
                device_id: payload.device_id,
                coordinates: payload.coordinates,
                timestamp: payload.timestamp,
                emergency_type: payload.emergency_type,
                press_count: response.press_count,
                location_details: JSON.parse(response.location_details)
            };

            // Petición REST nativa al MS de Prioridad
            fetch('http://prioridad:3000/api/prioridad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadParaPrioridad)
            })
                .then(res => res.json())
                .then(data => console.log('[Gateway] Alerta enviada a Prioridad exitosamente.'))
                .catch(err => console.error('[Gateway] Error enviando a Prioridad:', err.message));

        } else {
            console.warn(`[gRPC Aviso] El MS procesó pero devolvió un estado fallido:`, response.message);
        }
    });
}

mqttClient.on('error', (err) => {
    console.error('[MQTT Error] Error en el cliente MQTT:', err);
});