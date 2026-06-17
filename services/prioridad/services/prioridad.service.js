const crypto = require('crypto');
const { redisClient } = require('../config/redis');
const env = require('../config/env');

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
            prioridad = 'alto';
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

async function procesarAlertaEnriquecida(alertaEnriquecida) {
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

    // 3. Encolar en Redis (Garantiza tolerancia a fallos)
    await redisClient.lPush(env.REDIS_QUEUE_NAME, JSON.stringify(alertaFinal));

    // 4. Enviar al MS de Historial para persistencia en PostgreSQL usando fetch nativo
    fetch(env.HISTORIAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertaFinal)
    })
        .then(res => res.json())
        .then(data => console.log('[Prioridad] Alerta enviada al Historial y guardada en BD.'))
        .catch(err => console.error('[Prioridad Error] Fallo al enviar a Historial:', err.message));

    return alertaFinal;
}

module.exports = {
    procesarAlertaEnriquecida
};