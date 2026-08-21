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

app.get("/", (req, res) => {
  res.send("Servidor do Chat Global funcionando!");
});

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  socket.on("chatMessage", (message) => {
    // Envia a mensagem para TODOS os usuários conectados
    io.emit("chatMessage", {
      id: socket.id,
      message: message
    });
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
