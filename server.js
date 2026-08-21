const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// ===============================
// SERVIDOR HTTP
// ===============================

app.get("/", (req, res) => {
    res.send("Servidor Chat Global + Multiplayer online!");
});

// ===============================
// JOGADORES
// ===============================

const players = new Map();

function getPlayersObject() {
    const result = {};

    for (const [id, player] of players.entries()) {
        result[id] = player;
    }

    return result;
}

// ===============================
// SOCKET.IO
// ===============================

io.on("connection", (socket) => {
    console.log("Jogador conectado:", socket.id);

    // Criamos o jogador
    const player = {
        id: socket.id,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        ground: true
    };

    players.set(socket.id, player);

    // Envia para o jogador que acabou de entrar
    socket.emit("players:state", getPlayersObject());

    // Avisa os outros jogadores
    socket.broadcast.emit("player:joined", player);

    // Envia o estado atualizado para todos
    io.emit("players:state", getPlayersObject());

    // ===============================
    // ATUALIZAÇÃO DA POSIÇÃO
    // ===============================

    socket.on("player:update", (data) => {
        const currentPlayer = players.get(socket.id);

        if (!currentPlayer) {
            return;
        }

        if (!data || typeof data !== "object") {
            return;
        }

        // Atualiza somente valores numéricos válidos
        if (Number.isFinite(data.x)) {
            currentPlayer.x = data.x;
        }

        if (Number.isFinite(data.y)) {
            currentPlayer.y = data.y;
        }

        if (Number.isFinite(data.z)) {
            currentPlayer.z = data.z;
        }

        if (Number.isFinite(data.yaw)) {
            currentPlayer.yaw = data.yaw;
        }

        if (typeof data.ground === "boolean") {
            currentPlayer.ground = data.ground;
        }

        // Envia o estado atualizado para todos
        io.emit("players:state", getPlayersObject());
    });

    // ===============================
    // CHAT GLOBAL
    // ===============================

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

        const chatData = {
            username: "Jogador",
            message: message
        };

        io.emit("chat message", chatData);

        console.log(`[CHAT] ${socket.id}: ${message}`);
    });

    // ===============================
    // DESCONEXÃO
    // ===============================

    socket.on("disconnect", () => {
        console.log("Jogador saiu:", socket.id);

        players.delete(socket.id);

        io.emit("player:left", {
            id: socket.id
        });

        io.emit("players:state", getPlayersObject());
    });
});

// ===============================
// INICIAR SERVIDOR
// ===============================

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
