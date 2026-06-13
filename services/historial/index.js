const express = require('express');
const { Pool } = require('pg');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
const PORT = process.env.PORT || 4000;

// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS (CQRS)
// ==========================================
// Pool Primario: Solo para ESCRITURAS (INSERT, UPDATE)
const poolPrimary = new Pool({
    connectionString: process.env.DB_PRIMARY_URL || 'postgres://c5_admin:c5_secret@postgres-primary:5432/c5_alertas'
});

// Pool Réplica: Solo para LECTURAS (SELECT)
const poolReplica = new Pool({
    connectionString: process.env.DB_REPLICA_URL || 'postgres://c5_admin:c5_secret@postgres-replica:5432/c5_alertas'
});

const app = express();
app.use(express.json());

// ==========================================
// INICIALIZACIÓN DE LA TABLA
// ==========================================
async function initDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS incidentes (
            alert_id UUID PRIMARY KEY,
            device_id VARCHAR(50) NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lon DOUBLE PRECISION NOT NULL,
            zone VARCHAR(100),
            sector VARCHAR(100),
            emergency_type VARCHAR(50) NOT NULL,
            priority_level VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL,
            timestamp TIMESTAMP NOT NULL
        );
    `;
    try {
        // La creación de tablas siempre va al nodo primario
        await poolPrimary.query(createTableQuery);
        console.log('[Historial] Tabla de incidentes verificada/creada en PostgreSQL Primario.');
    } catch (err) {
        console.error('[DB Error] No se pudo crear la tabla:', err);
    }
}

// ==========================================
// ENDPOINT DE ESCRITURA (Hacia nodo Primario)
// ==========================================
app.post('/api/historial', async (req, res) => {
    const alerta = req.body;

    const insertQuery = `
        INSERT INTO incidentes (alert_id, device_id, lat, lon, zone, sector, emergency_type, priority_level, status, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const values = [
        alerta.alert_id,
        alerta.device_id,
        alerta.coordinates.lat,
        alerta.coordinates.lon,
        alerta.location_details.zone,
        alerta.location_details.sector,
        alerta.emergency_type,
        alerta.priority_level,
        alerta.status,
        alerta.timestamp
    ];

    try {
        await poolPrimary.query(insertQuery, values);
        console.log(`[Historial] Alerta ${alerta.alert_id} guardada en BD Primaria.`);
        res.status(201).json({ success: true, message: 'Incidente persistido correctamente.' });
    } catch (error) {
        console.error('[DB Insert Error] Fallo al guardar:', error);
        res.status(500).json({ success: false, error: 'Error persistiendo el incidente.' });
    }
});

// ==========================================
// ENDPOINT DE LECTURA (Hacia nodo Réplica)
// ==========================================
app.get('/api/historial', async (req, res) => {
    // Parámetros de consulta permitidos por la rúbrica
    const { start_date, end_date, zone, priority_level } = req.query;

    let selectQuery = `SELECT * FROM incidentes WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (start_date && end_date) {
        selectQuery += ` AND timestamp BETWEEN $${paramCount} AND $${paramCount + 1}`;
        values.push(start_date, end_date);
        paramCount += 2;
    }

    if (zone) {
        selectQuery += ` AND zone = $${paramCount}`;
        values.push(zone);
        paramCount++;
    }

    if (priority_level) {
        selectQuery += ` AND priority_level = $${paramCount}`;
        values.push(priority_level);
        paramCount++;
    }

    selectQuery += ` ORDER BY timestamp DESC`;

    try {
        // TODAS las lecturas se dirigen al pool de la réplica
        const result = await poolReplica.query(selectQuery, values);
        console.log(`[Historial] Consulta ejecutada en la Réplica. Resultados: ${result.rowCount}`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('[DB Select Error] Fallo en la consulta:', error);
        res.status(500).json({ success: false, error: 'Error consultando el historial.' });
    }
});

// ==========================================
// INICIO DEL SERVICIO
// ==========================================
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[Historial] Servicio REST escuchando en el puerto ${PORT}`);
    });
});