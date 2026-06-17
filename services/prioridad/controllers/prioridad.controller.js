const prioridadService = require('../services/prioridad.service');

// ==========================================
// ENDPOINT REST PARA RECIBIR LA ALERTA
// ==========================================
async function recibirAlerta(req, res) {
    try {
        const alertaEnriquecida = req.body;

        console.log(`\n[Prioridad] Procesando alerta del dispositivo: ${alertaEnriquecida.device_id}`);
        console.log(`[Prioridad] Clics detectados: ${alertaEnriquecida.press_count}`);

        // Delegamos el procesamiento al servicio
        const alertaFinal = await prioridadService.procesarAlertaEnriquecida(alertaEnriquecida);

        console.log(`[Prioridad] Tipo asignado: ${alertaFinal.emergency_type.toUpperCase()}`);
        console.log(`[Prioridad] Nivel de prioridad: ${alertaFinal.priority_level.toUpperCase()}`);
        console.log(`[Redis] Alerta ${alertaFinal.alert_id} encolada de forma segura.`);

        // Responder al Gateway
        res.status(200).json({
            success: true,
            message: "Alerta clasificada y encolada correctamente",
            alert_id: alertaFinal.alert_id
        });

    } catch (error) {
        console.error('[Prioridad Error] Fallo al procesar la alerta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

module.exports = {
    recibirAlerta
};