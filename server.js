const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },

    // Configuração leve para conexões móveis
    transports: ["websocket", "polling"]
});

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const MAX_PLAYERS = 32;

// Limite aproximado de atualizações de posição por segundo
const POSITION_INTERVAL = 60;

// Guarda os jogadores conectados
const players = new Map();

// ======================================================
// ROTA PRINCIPAL
// ======================================================

app.get("/", (req, res) => {
    res.send("Servidor Multiplayer + Chat Global funcionando!");
});

// ======================================================
// FUNÇÃO PARA ENVIAR LISTA DE JOGADORES
// ======================================================

function getPlayers() {
    const result = {};

    for (const [id, player] of players) {
        result[id] = player;
    }

    return result;
}

// ======================================================
// SOCKET.IO
// ======================================================

io.on("connection", (socket) => {

    console.log("Usuário conectado:", socket.id);

    // --------------------------------------------------
    // LIMITE DE JOGADORES
    // --------------------------------------------------

    if (players.size >= MAX_PLAYERS) {

        socket.emit("serverFull", {
            message: "Servidor cheio."
        });

        socket.disconnect(true);

        return;
    }

    // --------------------------------------------------
    // CRIA JOGADOR
    // --------------------------------------------------

    players.set(socket.id, {
        id: socket.id,

        x: 0,
        y: 0,
        z: 0,

        rotY: 0,

        connectedAt: Date.now()
    });

    // --------------------------------------------------
    // ENVIA ESTADO ATUAL PARA O NOVO JOGADOR
    // --------------------------------------------------

    socket.emit("players", getPlayers());

    // --------------------------------------------------
    // AVISA OS OUTROS JOGADORES
    // --------------------------------------------------

    socket.broadcast.emit("playerJoined", {
        id: socket.id,
        x: 0,
        y: 0,
        z: 0,
        rotY: 0
    });

    // ==================================================
    // CHAT GLOBAL
    // ==================================================

    socket.on("chatMessage", (message) => {

        if (typeof message !== "string") {
            return;
        }

        message = message.trim();

        if (!message) {
            return;
        }

        // Limita o tamanho da mensagem
        if (message.length > 200) {
            message = message.substring(0, 200);
        }

        // Envia para TODOS
        io.emit("chatMessage", {
            id: socket.id,
            message: message
        });

    });

    // Também aceita o nome de evento usado
    // pela versão anterior do HTML.
    socket.on("chat message", (message) => {

        if (typeof message !== "string") {
            return;
        }

        message = message.trim();

        if (!message) {
            return;
        }

        if (message.length > 200) {
            message = message.substring(0, 200);
        }

        io.emit("chatMessage", {
            id: socket.id,
            message: message
        });

    });

    // ==================================================
    // MOVIMENTO DO JOGADOR
    // ==================================================

    let lastPositionUpdate = 0;

    socket.on("playerMove", (data) => {

        const now = Date.now();

        // Evita spam excessivo de pacotes
        if (now - lastPositionUpdate < POSITION_INTERVAL) {
            return;
        }

        lastPositionUpdate = now;

        const player = players.get(socket.id);

        if (!player) {
            return;
        }

        if (!data || typeof data !== "object") {
            return;
        }

        // ------------------------------------------------
        // VALIDAÇÃO
        // ------------------------------------------------

        const x = Number(data.x);
        const y = Number(data.y);
        const z = Number(data.z);
        const rotY = Number(data.rotY);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(z) ||
            !Number.isFinite(rotY)
        ) {
            return;
        }

        // Evita valores absurdamente grandes
        if (
            Math.abs(x) > 1000000 ||
            Math.abs(y) > 1000000 ||
            Math.abs(z) > 1000000
        ) {
            return;
        }

        // ------------------------------------------------
        // ATUALIZA ESTADO
        // ------------------------------------------------

        player.x = x;
        player.y = y;
        player.z = z;
        player.rotY = rotY;

        // ------------------------------------------------
        // ENVIA SOMENTE PARA OS OUTROS
        // ------------------------------------------------

        socket.broadcast.emit("playerMove", {
            id: socket.id,

            x: x,
            y: y,
            z: z,

            rotY: rotY
        });

    });

    // ==================================================
    // DESCONEXÃO
    // ==================================================

    socket.on("disconnect", (reason) => {

        console.log(
            "Usuário desconectado:",
            socket.id,
            "Motivo:",
            reason
        );

        players.delete(socket.id);

        // Avisa todos que esse jogador saiu
        socket.broadcast.emit("playerLeft", {
            id: socket.id
        });

    });

});

// ======================================================
// SERVIDOR
// ======================================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Servidor multiplayer rodando na porta ${PORT}`
    );

});
