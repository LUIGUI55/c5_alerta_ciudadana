// ==========================================
// CONFIGURACIÓN DE ENTORNO
// ==========================================
module.exports = {
    PORT: process.env.PORT || 4000,
    DB_PRIMARY_URL: process.env.DB_PRIMARY_URL || 'postgres://c5_admin:c5_secret@postgres-primary:5432/c5_alertas',
    DB_REPLICA_URL: process.env.DB_REPLICA_URL || 'postgres://c5_admin:c5_secret@postgres-replica:5432/c5_alertas'
};