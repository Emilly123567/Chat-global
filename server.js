const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const players = new Map();

const MAX_PLAYERS = 32;

app.get("/", (req, res) => {
    res.send("Servidor Multiplayer + Chat funcionando!");
});

function number(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return 0;
    }

    return n;
}

io.on("connection", (socket) => {

    console.log("Jogador conectado:", socket.id);

    if (players.size >= MAX_PLAYERS) {
        socket.emit("serverFull");
        socket.disconnect(true);
        return;
    }

    const player = {
        id: socket.id,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0
    };

    players.set(socket.id, player);

    // Envia os jogadores que já estavam no servidor
    const existingPlayers = {};

    players.forEach((p, id) => {

        if (id === socket.id) {
            return;
        }

        existingPlayers[id] = {
            x: p.x,
            y: p.y,
            z: p.z,
            yaw: p.yaw
        };
    });

    socket.emit("players", existingPlayers);

    // Avisa os outros jogadores que entrou alguém
    socket.broadcast.emit("playerJoined", {
        id: socket.id,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0
    });

    // =================================================
    // MULTIPLAYER
    // =================================================

    socket.on("playerMove", (data) => {

        if (!data || typeof data !== "object") {
            return;
        }

        const p = players.get(socket.id);

        if (!p) {
            return;
        }

        p.x = number(data.x);
        p.y = number(data.y);
        p.z = number(data.z);
        p.yaw = number(data.yaw);

        socket.broadcast.emit("playerMove", {
            id: socket.id,
            x: p.x,
            y: p.y,
            z: p.z,
            yaw: p.yaw
        });
    });

    // =================================================
    // CHAT
    // =================================================

    socket.on("chatMessage", (message) => {

        if (typeof message !== "string") {
            return;
        }

        message = message.trim();

        if (message.length === 0) {
            return;
        }

        message = message.substring(0, 200);

        io.emit("chatMessage", {
            id: socket.id,
            message: message
        });
    });

    // Compatibilidade com o chat antigo
    socket.on("chat message", (message) => {

        if (typeof message !== "string") {
            return;
        }

        message = message.trim();

        if (message.length === 0) {
            return;
        }

        message = message.substring(0, 200);

        io.emit("chatMessage", {
            id: socket.id,
            message: message
        });
    });

    // =================================================
    // DESCONEXÃO
    // =================================================

    socket.on("disconnect", (reason) => {

        console.log(
            "Jogador desconectado:",
            socket.id,
            reason
        );

        players.delete(socket.id);

        socket.broadcast.emit("playerLeft", {
            id: socket.id
        });
    });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        "Servidor rodando na porta " + PORT
    );

});
