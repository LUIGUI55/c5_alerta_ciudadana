const { poolPrimary, poolReplica } = require('../config/database');

async function createIncidente(alerta) {
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

    await poolPrimary.query(insertQuery, values);
}

async function getIncidentes(start_date, end_date, zone, priority_level) {
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

    // TODAS las lecturas se dirigen al pool de la réplica
    return await poolReplica.query(selectQuery, values);
}

async function updateIncidenteStatus(id, status) {
    // Las actualizaciones (UPDATE) siempre van al Pool Primario
    const updateQuery = `UPDATE incidentes SET status = $1 WHERE alert_id = $2`;
    await poolPrimary.query(updateQuery, [status, id]);
}

module.exports = {
    createIncidente,
    getIncidentes,
    updateIncidenteStatus
};