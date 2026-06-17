const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const redis = require('redis');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // En producción, restringir al dominio del frontend
    methods: ['GET', 'POST']
  }
});

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const REDIS_QUEUE_NAME = 'alertas_pendientes';

const redisClient = redis.createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.log('[Redis Error] Fallo de conexión:', err));

// ==========================================
// CONEXIÓN WEBSOCKETS
// ==========================================
io.on('connection', (socket) => {
  console.log(`[WebSockets] Nuevo operador conectado. ID de sesión: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[WebSockets] Operador desconectado: ${socket.id}`);
  });
});

// ==========================================
// WORKER TOLERANTE A FALLOS (POLLING RPOP)
// ==========================================
async function processQueue() {
  console.log(`[Worker] Tolerancia a fallos activada. Monitoreando cola: ${REDIS_QUEUE_NAME}`);

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
      const result = await redisClient.rPop(REDIS_QUEUE_NAME);

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

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function startService() {
  await redisClient.connect();
  console.log('[Redis] Conectado exitosamente.');

  server.listen(3001, () => {
    console.log('[Notificaciones] Servidor WebSocket escuchando en el puerto 3001');
  });

  // Iniciar el ciclo de consumo
  processQueue();
}

startService();