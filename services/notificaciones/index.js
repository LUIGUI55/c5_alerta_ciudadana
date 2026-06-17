const express = require('express');
const http = require('http');
const env = require('./config/env');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { processQueue } = require('./services/queue.service');

const app = express();
const server = http.createServer(app);

// Inicializamos el servidor de WebSockets pasándole el servidor HTTP
initSocket(server);

// ==========================================
// INICIALIZACIÓN ORQUESTADA
// ==========================================
async function startService() {
  try {
    // 1. Conectar a la base de datos en memoria (Redis)
    await connectRedis();

    // 2. Levantar el servidor HTTP y WebSockets en el puerto configurado
    server.listen(env.PORT, () => {
      console.log(`[Notificaciones] Servidor WebSocket escuchando en el puerto ${env.PORT}`);
    });

    // 3. Iniciar el ciclo de consumo (Worker)
    processQueue();
  } catch (error) {
    console.error('[Startup Error] Ocurrio un problema al iniciar el servicio:', error);
    process.exit(1);
  }
}

startService();