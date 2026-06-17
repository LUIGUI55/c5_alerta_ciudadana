// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
module.exports = {
    PORT: process.env.PORT || 3000,
    REDIS_URL: process.env.REDIS_URL || 'redis://c5_redis:6379',
    REDIS_QUEUE_NAME: 'alertas_pendientes',
    HISTORIAL_URL: process.env.HISTORIAL_URL || 'http://historial:4000/api/historial'
};