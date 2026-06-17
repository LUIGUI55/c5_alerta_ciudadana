// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
module.exports = {
    PORT: process.env.PORT || 3001,
    REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
    REDIS_QUEUE_NAME: 'alertas_pendientes'
};