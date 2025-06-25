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

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  // Define o primeiro usuário como líder
  if (!liderId) {
    liderId = socket.id;
    io.to(socket.id).emit("definirLider");
  }

  // Envia estado atual
  socket.emit("estadoAtual", estadoJogo);

  // Recebe nova rodada (só líder pode enviar)
  socket.on("novaRodada", (dados) => {
    if (socket.id === liderId) {
      estadoJogo = dados;
      socket.broadcast.emit("atualizarRodada", dados);
    }
  });

  socket.on("disconnect", () => {
    if (socket.id === liderId) {
      liderId = null;
    }
  });
});