const { Pool } = require('pg');
const env = require('./env');

// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS (CQRS)
// ==========================================
// Pool Primario: Solo para ESCRITURAS (INSERT, UPDATE)
const poolPrimary = new Pool({
    connectionString: env.DB_PRIMARY_URL
});

// Pool Réplica: Solo para LECTURAS (SELECT)
const poolReplica = new Pool({
    connectionString: env.DB_REPLICA_URL
});

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

module.exports = {
    poolPrimary,
    poolReplica,
    initDB
};