const express = require('express');
const env = require('./config/env');
const { connectRedis } = require('./config/redis');
const prioridadRoutes = require('./routes/prioridad.routes');

const app = express();
app.use(express.json());

// Inyectamos las rutas
app.use('/api/prioridad', prioridadRoutes);

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function startServer() {
    await connectRedis();
    app.listen(env.PORT, () => {
        console.log(`[Prioridad] Servidor REST escuchando en el puerto ${env.PORT}`);
    });
}

startServer();