const redis = require('redis');
const env = require('./env');

const redisClient = redis.createClient({ url: env.REDIS_URL });

redisClient.on('error', (err) => console.log('[Redis Error] Fallo de conexión:', err));

async function connectRedis() {
    await redisClient.connect();
    console.log('[Redis] Conectado exitosamente.');
}

module.exports = {
    redisClient,
    connectRedis
};