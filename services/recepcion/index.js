const mqtt = require('mqtt');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const express = require('express');
const os = require('os');

// ==========================================
// CONFIGURACIÓN DE ENTORNO E IDENTIDAD
// ==========================================
const app = express();
app.use(express.json());
const HTTP_PORT = 3000;

// Obtenemos los primeros 6 caracteres del ID del contenedor de Docker
const INSTANCE_ID = os.hostname().substring(0, 6);

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://mosquitto:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'c5/alertas';
const MQTT_SHARED_TOPIC = `$share/c5_recepcion_group/${MQTT_TOPIC}`;
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
// ENDPOINTS HTTP (BALANCEADOS POR NGINX)
// ==========================================
app.get('/', (req, res) => {
    res.status(200).send(`Instancia de Recepcion [${INSTANCE_ID}] operativa.`);
});

app.post('/', (req, res) => {
    console.log(`\n======================================================`);
    console.log(`[BALANCEADOR NGINX -> INSTANCIA: ${INSTANCE_ID}]`);
    console.log(`[Algoritmo] least_conn aplico correctamente via HTTP.`);
    console.log(`======================================================\n`);

    try {
        const alertData = req.body;
        if (!validateAlertFormat(alertData)) {
            console.error(`[Instancia-${INSTANCE_ID}] Formato invalido rechazado.`);
            return res.status(400).json({ error: "El formato de la alerta es invalido." });
        }

        // Enviamos la alerta al flujo normal del sistema
        sendToGeolocationService(alertData);

        res.status(200).json({
            success: true,
            message: "Alerta procesada",
            procesado_por: `Contenedor-${INSTANCE_ID}`
        });
    } catch (error) {
        console.error(`[Instancia-${INSTANCE_ID}] Error interno:`, error.message);
        res.status(500).json({ error: "Fallo interno en el gateway" });
    }
});

app.listen(HTTP_PORT, () => {
    console.log(`[Gateway HTTP] Instancia ${INSTANCE_ID} esperando trafico de Nginx en puerto ${HTTP_PORT}`);
});

// ==========================================
// CONEXIÓN AL BROKER MQTT (HARDWARE)
// ==========================================
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
    mqttClient.subscribe(MQTT_SHARED_TOPIC, (err) => {
        if (!err) {
            console.log(`[Gateway MQTT] Instancia ${INSTANCE_ID} suscrita a cola compartida.`);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    try {
        const rawData = message.toString();
        const alertData = JSON.parse(rawData);

        console.log(`\n[Instancia ${INSTANCE_ID}] Mensaje MQTT recibido de hardware:`, alertData.device_id);

        if (!validateAlertFormat(alertData)) return;
        sendToGeolocationService(alertData);
    } catch (error) {
        console.error(`[Error de Parsing]:`, error.message);
    }
});

// ==========================================
// FUNCIONES DE SOPORTE
// ==========================================
function validateAlertFormat(data) {
    const requiredFields = ['device_id', 'coordinates', 'timestamp', 'emergency_type', 'press_count'];
    const hasMainFields = requiredFields.every(field => data.hasOwnProperty(field) && data[field] !== null && data[field] !== '');
    if (!hasMainFields) return false;
    if (typeof data.coordinates.lat === 'undefined' || typeof data.coordinates.lon === 'undefined') return false;
    return true;
}

function sendToGeolocationService(data) {
    const payload = {
        device_id: String(data.device_id),
        coordinates: { lat: parseFloat(data.coordinates.lat), lon: parseFloat(data.coordinates.lon) },
        timestamp: String(data.timestamp),
        emergency_type: String(data.emergency_type),
        press_count: Number(data.press_count)
    };

    geoClient.EnrichAlertData(payload, (error, response) => {
        if (error) return;

        if (response.success) {
            const payloadParaPrioridad = {
                device_id: payload.device_id,
                coordinates: payload.coordinates,
                timestamp: payload.timestamp,
                emergency_type: payload.emergency_type,
                press_count: response.press_count,
                location_details: JSON.parse(response.location_details)
            };

            fetch('http://prioridad:3000/api/prioridad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadParaPrioridad)
            }).catch(err => console.error('[Gateway] Error enviando a Prioridad:', err.message));
        }
    });
}