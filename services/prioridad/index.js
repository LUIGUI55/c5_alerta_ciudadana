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
// MOTOR DE REGLAS DE PRIORIDAD Y TIPO
// ==========================================
function evaluarIncidente(pressCount) {
    let tipo = 'desconocido';
    let prioridad = 'medio';

    // Reglas documentadas basadas en el numero de clics
    switch (pressCount) {
        case 1:
            tipo = 'solicitar un policia';
            prioridad = 'medio';
            break;
        case 2:
            tipo = 'incendio';
            prioridad = 'alto'; // Ajustable segun tus requerimientos
            break;
        case 3:
            tipo = 'paramedicos';
            prioridad = 'alto';
            break;
        case 4:
            tipo = 'accidentes graves';
            prioridad = 'crítico';
            break;
        case 5:
        default:
            // Si es 5 o mas clics (panico extremo)
            tipo = 'desastres naturales';
            prioridad = 'crítico';
            break;
    }

    return { tipo, prioridad };
}

// ==========================================
// ENDPOINT REST PARA RECIBIR LA ALERTA
// ==========================================
app.post('/api/prioridad', async (req, res) => {
    try {
        const alertaEnriquecida = req.body;

        console.log(`\n[Prioridad] Procesando alerta del dispositivo: ${alertaEnriquecida.device_id}`);
        console.log(`[Prioridad] Clics detectados: ${alertaEnriquecida.press_count}`);

        // 1. Evaluar el incidente basado en los clics
        const evaluacion = evaluarIncidente(alertaEnriquecida.press_count);

        // 2. Generar identificador unico y estructurar alerta final
        const alertaFinal = {
            alert_id: crypto.randomUUID(),
            ...alertaEnriquecida,
            emergency_type: evaluacion.tipo, // Sobreescribe el tipo enviado por el hardware
            priority_level: evaluacion.prioridad,
            status: 'pendiente'
        };

        console.log(`[Prioridad] Tipo asignado: ${alertaFinal.emergency_type.toUpperCase()}`);
        console.log(`[Prioridad] Nivel de prioridad: ${alertaFinal.priority_level.toUpperCase()}`);

        // 3. Encolar en Redis (Garantiza tolerancia a fallos)
        await redisClient.lPush(REDIS_QUEUE_NAME, JSON.stringify(alertaFinal));
        console.log(`[Redis] Alerta ${alertaFinal.alert_id} encolada de forma segura.`);

        // 4. Enviar al MS de Historial para persistencia en PostgreSQL usando fetch nativo
        fetch('http://historial:4000/api/historial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertaFinal)
        })
            .then(res => res.json())
            .then(data => console.log('[Prioridad] Alerta enviada al Historial y guardada en BD.'))
            .catch(err => console.error('[Prioridad Error] Fallo al enviar a Historial:', err.message));

        // 5. Responder al Gateway
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