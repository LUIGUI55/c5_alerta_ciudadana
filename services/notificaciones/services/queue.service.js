const { redisClient } = require('../config/redis');
const { getIo } = require('../config/socket');
const env = require('../config/env');

// ==========================================
// WORKER TOLERANTE A FALLOS (POLLING RPOP)
// ==========================================
async function processQueue() {
    console.log(`[Worker] Tolerancia a fallos activada. Monitoreando cola: ${env.REDIS_QUEUE_NAME}`);

    const io = getIo();

    while (true) {
        try {
            // SOLUCIÓN A LA CONDICIÓN DE CARRERA:
            // Si no hay ningún dashboard de React conectado, no extraemos nada de Redis.
            // Esperamos 1 segundo y volvemos a verificar.
            if (io.sockets.sockets.size === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue; // Salta a la siguiente iteración del ciclo
            }

            // Si llegamos aquí, hay al menos un operador conectado.
            const result = await redisClient.rPop(env.REDIS_QUEUE_NAME);

            if (result) {
                const alerta = JSON.parse(result);
                console.log(`\n[Notificaciones] Extrayendo alerta de la bóveda: ${alerta.alert_id}`);

                // Transmitir al frontend
                io.emit('nueva_alerta', alerta);

                console.log(`[Notificaciones] Prioridad: ${alerta.priority_level} | Zona: ${alerta.location_details?.zone}`);
                console.log(`[Notificaciones] Transmisión vía WebSocket completada.`);

                // Pequeña pausa de 100ms entre alertas para no saturar el renderizado de React
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // Cola vacía, descansar 1 segundo
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('[Worker Error] Error al procesar la cola de Redis:', error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

module.exports = {
    processQueue
};