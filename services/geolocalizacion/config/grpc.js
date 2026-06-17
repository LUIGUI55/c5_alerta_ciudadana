const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const env = require('./env');

// ==========================================
// CONFIGURACIÓN SERVIDOR gRPC
// ==========================================
const packageDefinition = protoLoader.loadSync(env.PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const geoProto = grpc.loadPackageDefinition(packageDefinition).geolocation;

module.exports = {
    grpc,
    geoProto
};