import { createServer } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { Server } from 'socket.io'; // ADICIONE ISSO no topo


var app = express();
var server = createServer(app);
server.listen(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/json', express.static(path.join(__dirname, 'public/json')));
app.use('/src', express.static(path.join(__dirname, 'public/src')));
app.use('/html', express.static(path.join(__dirname, 'public/html')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/temp_folder', express.static(path.join(__dirname, 'public/temp_folder')));
app.use('/', express.static(path.join(__dirname, '/index.html')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

const io = new Server(server);

let liderId = null;
let estadoJogo = {
  numeros: [],
  alvo: 0,
  expressaoCorreta: ""
};

const salas = {};

io.on("connection", (socket) => {
  console.log("Novo usuário conectado:", socket.id);

  socket.on("criar-sala", (callback) => {
    const salaId = Math.random().toString(36).substr(2, 6);
    salas[salaId] = {
      jogadores: [socket.id],
      estado: null,
    };
    socket.join(salaId);
    callback(salaId);
  });

  socket.on("entrar-sala", (salaId, callback) => {
    const sala = salas[salaId];
    if (sala && sala.jogadores.length === 1) {
      sala.jogadores.push(socket.id);
      socket.join(salaId);
      callback({ sucesso: true });

      // Notifica os dois jogadores que podem começar
      io.to(salaId).emit("sala-pronta");
    } else {
      callback({ sucesso: false, msg: "Sala inválida ou cheia." });
    }
  });

  socket.on("enviar-dados-jogo", ({ salaId, dados }) => {
    // Envia os dados iniciais (números, alvo, etc.) para o outro jogador
    socket.to(salaId).emit("receber-dados-jogo", dados);
  });

  socket.on("atualizar-pontuacao", ({ salaId, jogador, pontos }) => {
    io.to(salaId).emit("pontuacao-atualizada", { jogador, pontos });
  });

  socket.on("desconectar-sala", (salaId) => {
    socket.leave(salaId);
    if (salas[salaId]) delete salas[salaId];
  });
});