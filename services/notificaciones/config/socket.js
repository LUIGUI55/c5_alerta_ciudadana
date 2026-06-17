const { Server } = require('socket.io');

let io;

// ==========================================
// CONEXIÓN WEBSOCKETS
// ==========================================
function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*', 
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[WebSockets] Nuevo operador conectado. ID de sesión: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`[WebSockets] Operador desconectado: ${socket.id}`);
        });
    });

    return io;
}

function getIo() {
    if (!io) {
        throw new Error('Socket.io no ha sido inicializado aun.');
    }
    return io;
}

module.exports = {
    initSocket,
    getIo
};