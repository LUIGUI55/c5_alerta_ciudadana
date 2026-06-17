const geocodingService = require('../services/geocoding.service');

async function enrichAlertData(call, callback) {
    const alertRequest = call.request;
    console.log(`\n[Geolocalizacion] Peticion recibida para dispositivo: ${alertRequest.device_id}`);

    const lat = alertRequest.coordinates.lat;
    const lon = alertRequest.coordinates.lon;

    const { zone, sector } = await geocodingService.getAddressFromCoordinates(lat, lon);

    const locationDetails = {
        zone: zone,
        sector: sector
    };

    const enrichedResponse = {
        success: true,
        message: "Geolocalizacion real calculada exitosamente",
        device_id: alertRequest.device_id,
        coordinates: alertRequest.coordinates,
        timestamp: alertRequest.timestamp,
        emergency_type: alertRequest.emergency_type,
        press_count: alertRequest.press_count,
        location_details: JSON.stringify(locationDetails)
    };

    console.log(`[Geolocalizacion] Ubicacion exacta: ${sector}, ${zone}`);

    callback(null, enrichedResponse);
}

module.exports = { enrichAlertData };