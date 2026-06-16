const express = require('express');
const { createClient } = require('redis');
const crypto = require('crypto');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://c5_redis:6379';
const REDIS_QUEUE_NAME = 'alertas_pendientes';

const app = express();
app.use(express.json());

// ==========================================
// CONEXIÓN A REDIS
// ==========================================
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('[Redis Error]', err));
redisClient.on('connect', () => console.log('[Redis] Conectado exitosamente al broker de caché'));

// ==========================================
// MOTOR DE REGLAS DE PRIORIDAD
// ==========================================
function calcularPrioridad(pressCount) {
    if (pressCount >= 3) return 'crítico';
    if (pressCount === 2) return 'alto';
    return 'medio'; // 1 sola pulsación
}

// ==========================================
// ENDPOINT REST PARA RECIBIR LA ALERTA
// ==========================================
app.post('/api/prioridad', async (req, res) => {
    try {
        const alertaEnriquecida = req.body;

        console.log(`\n[Prioridad] Procesando alerta del dispositivo: ${alertaEnriquecida.device_id}`);

        // 1. Generar identificador único y asignar prioridad
        const alertaFinal = {
            alert_id: crypto.randomUUID(),
            ...alertaEnriquecida,
            priority_level: calcularPrioridad(alertaEnriquecida.press_count),
            status: 'pendiente'
        };

        console.log(`[Prioridad] Nivel asignado: ${alertaFinal.priority_level.toUpperCase()}`);

        // 2. Encolar en Redis (Garantiza tolerancia a fallos)
        await redisClient.lPush(REDIS_QUEUE_NAME, JSON.stringify(alertaFinal));
        console.log(`[Redis] Alerta ${alertaFinal.alert_id} encolada de forma segura.`);

        // 3. Enviar al MS de Historial para persistencia en PostgreSQL usando fetch nativo
        fetch('http://historial:4000/api/historial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertaFinal)
        })
            .then(res => res.json())
            .then(data => console.log('[Prioridad] Alerta enviada al Historial y guardada en BD.'))
            .catch(err => console.error('[Prioridad Error] Fallo al enviar a Historial:', err.message));

        // 4. Responder al Gateway
        res.status(200).json({
            success: true,
            message: "Alerta clasificada y encolada correctamente",
            alert_id: alertaFinal.alert_id
        });

    } catch (error) {
        console.error('[Prioridad Error] Fallo al procesar la alerta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function startServer() {
    await redisClient.connect();
    app.listen(PORT, () => {
        console.log(`[Prioridad] Servidor REST escuchando en el puerto ${PORT}`);
    });
}

startServer();