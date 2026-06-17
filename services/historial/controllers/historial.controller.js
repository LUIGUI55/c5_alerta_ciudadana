const historialService = require('../services/historial.service');

// ==========================================
// ENDPOINT DE ESCRITURA (Hacia nodo Primario)
// ==========================================
async function createIncidente(req, res) {
    const alerta = req.body;

    try {
        await historialService.createIncidente(alerta);
        console.log(`[Historial] Alerta ${alerta.alert_id} guardada en BD Primaria.`);
        res.status(201).json({ success: true, message: 'Incidente persistido correctamente.' });
    } catch (error) {
        console.error('[DB Insert Error] Fallo al guardar:', error);
        res.status(500).json({ success: false, error: 'Error persistiendo el incidente.' });
    }
}

// ==========================================
// ENDPOINT DE LECTURA (Hacia nodo Réplica)
// ==========================================
async function getIncidentes(req, res) {
    // Parámetros de consulta permitidos por la rúbrica
    const { start_date, end_date, zone, priority_level } = req.query;

    try {
        const result = await historialService.getIncidentes(start_date, end_date, zone, priority_level);
        console.log(`[Historial] Consulta ejecutada en la Réplica. Resultados: ${result.rowCount}`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('[DB Select Error] Fallo en la consulta:', error);
        res.status(500).json({ success: false, error: 'Error consultando el historial.' });
    }
}

// ==========================================
// ENDPOINT PARA ACTUALIZAR ESTADO (Hacia nodo Primario)
// ==========================================
async function updateIncidenteStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await historialService.updateIncidenteStatus(id, status);
        console.log(`[Historial] Estado de alerta ${id} actualizado a: ${status}.`);
        res.status(200).json({ success: true, message: 'Estado actualizado correctamente.' });
    } catch (error) {
        console.error('[DB Update Error] Fallo al actualizar estado:', error);
        res.status(500).json({ success: false, error: 'Error actualizando el historial.' });
    }
}

module.exports = {
    createIncidente,
    getIncidentes,
    updateIncidenteStatus
};