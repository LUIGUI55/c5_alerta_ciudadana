const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://c5_redis:6379';
const REDIS_QUEUE_NAME = 'alertas_pendientes';

const app = express();
const server = http.createServer(app);

// Configuración de CORS crucial para permitir que el frontend de React se conecte
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ==========================================
// CONEXIÓN A REDIS
// ==========================================
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('[Redis Error]', err));
redisClient.on('connect', () => console.log('[Redis] Conectado exitosamente. Listo para consumir cola.'));

// ==========================================
// LÓGICA DE WEBSOCKETS (CLIENTES)
// ==========================================
io.on('connection', (socket) => {
  console.log(`[WebSockets] Nuevo operador conectado. ID de sesión: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[WebSockets] Operador desconectado: ${socket.id}`);
  });
});

// ==========================================
// CONSUMIDOR DE LA COLA DE REDIS (WORKER)
// ==========================================
async function procesarCola() {
  console.log(`[Worker] Iniciando monitoreo de la cola: ${REDIS_QUEUE_NAME}`);

  // Bucle infinito para escuchar nuevas alertas
  while (true) {
    try {
      // brPop (Blocking Right Pop): Bloquea la ejecución hasta que haya un elemento en la cola.
      // El '0' significa que esperará indefinidamente sin agotar la CPU.
      const resultado = await redisClient.brPop(REDIS_QUEUE_NAME, 0);

      if (resultado) {
        // resultado.element contiene el string JSON que guardó el MS de Prioridad
        const alertaData = JSON.parse(resultado.element);

        console.log(`\n[Notificaciones] Alerta extraída de la bóveda: ${alertaData.alert_id}`);
        console.log(`[Notificaciones] Prioridad: ${alertaData.priority_level} | Zona: ${alertaData.location_details.zone}`);

        // Emitir el evento a todos los operadores conectados
        io.emit('nueva_alerta', alertaData);

        console.log(`[Notificaciones] Transmisión vía WebSocket completada.`);
      }
    } catch (error) {
      console.error('[Worker Error] Fallo al procesar elemento de Redis:', error.message);
      // Pausa de 1 segundo antes de reintentar para evitar bucles infinitos de error
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function startServer() {
  await redisClient.connect();

  server.listen(PORT, () => {
    console.log(`[Notificaciones] Servidor WebSocket escuchando en el puerto ${PORT}`);

    // Iniciar el worker inmediatamente después de levantar el servidor
    procesarCola();
  });
}

startServer();