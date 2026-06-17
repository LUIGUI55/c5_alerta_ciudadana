const path = require('path');

// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
module.exports = {
    GRPC_HOST: '0.0.0.0',
    GRPC_PORT: process.env.GRPC_PORT || 50051,
    PROTO_PATH: path.join(__dirname, '..', 'proto', 'geolocation.proto')
};