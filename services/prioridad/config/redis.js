const { createClient } = require('redis');
const env = require('./env');

// ==========================================
// CONEXIÓN A REDIS
// ==========================================
const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on('error', (err) => console.error('[Redis Error]', err));
redisClient.on('connect', () => console.log('[Redis] Conectado exitosamente al broker de caché'));

async function connectRedis() {
    await redisClient.connect();
}

module.exports = {
    redisClient,
    connectRedis
};