const express = require('express');
const env = require('./config/env');
const { initDB } = require('./config/database');
const historialRoutes = require('./routes/historial.routes');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    // Autorizamos explícitamente los métodos, incluyendo PUT y OPTIONS
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Interceptar la petición de validación Preflight y responder con éxito inmediatamente
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});

app.use(express.json());

// Inyectamos las rutas
app.use('/api/historial', historialRoutes);

// ==========================================
// INICIO DEL SERVICIO
// ==========================================
initDB().then(() => {
    app.listen(env.PORT, () => {
        console.log(`[Historial] Servicio REST escuchando en el puerto ${env.PORT}`);
    });
});