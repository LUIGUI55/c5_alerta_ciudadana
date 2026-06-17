const { grpc, geoProto } = require('./config/grpc');
const env = require('./config/env');
const geolocationController = require('./controllers/geolocation.controller');

function main() {
    const server = new grpc.Server();

    // Mapeamos el servicio definido en el .proto con la función del controlador
    server.addService(
        geoProto.GeolocationService.service,
        { EnrichAlertData: geolocationController.enrichAlertData }
    );

    server.bindAsync(`${env.GRPC_HOST}:${env.GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error('[Geolocalizacion Error] Fallo al arrancar el servidor:', error);
            return;
        }
        console.log(`[Geolocalizacion] Servidor gRPC escuchando en el puerto ${port}`);
    });
}

main();