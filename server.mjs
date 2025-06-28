import { createServer } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { Server } from 'socket.io'; // ADICIONE ISSO no topo
import pg from "pg";


import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Defina os modos completos que podem ser inseridos
const ALL_MODOS_COMPLETOS_VALIDOS = [
  'livre',
  'tempo-1', 'tempo-3', 'tempo-5', 'tempo-10',
  'speedrun-1', 'speedrun-3', 'speedrun-5', 'speedrun-10',
  '1x1'
];

// Defina os modos que o filtro do ranking aceita (os "modos base" ou o completo 'livre')
const MODOS_DE_FILTRO_RANKING_VALIDOS = [
  '', // Para "Todos os Modos"
  'livre',
  'tempo', // Abrange tempo-1, tempo-3, etc.
  'speedrun', // Abrange speedrun-1, speedrun-3, etc.
  '1x1'
];

var app = express();
var server = createServer(app);
server.listen(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var connectionString = process.env.DATABASE_PUBLIC_URL
var pgClient = new pg.Client(connectionString)
pgClient.connect()



app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/json', express.static(path.join(__dirname, 'public/json')));
app.use('/src', express.static(path.join(__dirname, 'public/src')));
app.use('/html', express.static(path.join(__dirname, 'public/html')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/temp_folder', express.static(path.join(__dirname, 'public/temp_folder')));
app.use('/', express.static(path.join(__dirname, '/login.html')));


var clientIDGoogle = process.env.CLIENT_ID_GOOGLE
var clientSecretGoogle = process.env.SECRET_KEY_GOOGLE

// console.log(clientIDGoogle)
// console.log(clientSecretGoogle)

app.use(session({ secret: clientSecretGoogle, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// SERIALIZE
passport.serializeUser((user, done) => {
  // Salva apenas o ID único do usuário do seu banco de dados na sessão
  done(null, user.id);
});

// DESERIALIZE
passport.deserializeUser(async (id, done) => {
  try {
    // Busca o usuário no banco de dados pelo ID salvo na sessão
    const { rows } = await pgClient.query(
      'SELECT * FROM users_table WHERE id = $1',
      [id]
    );
    const user = rows[0];
    if (user) {
      done(null, user); // Anexa o objeto de usuário completo ao req.user
    } else {
      done(null, false); // Usuário não encontrado
    }
  } catch (err) {
    console.error("Erro na deserialização do usuário:", err);
    done(err, null);
  }
});



// ESTRATÉGIA GOOGLE
passport.use(new GoogleStrategy({
  clientID: clientIDGoogle,
  clientSecret: clientSecretGoogle,
  callbackURL: "/auth/google/callback"
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const displayName = profile.displayName;
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
      const profilePictureUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

      // 1. Tentar encontrar o usuário no seu banco de dados pelo google_id
      const { rows } = await pgClient.query(
        'SELECT * FROM users_table WHERE google_id = $1',
        [googleId]
      );
      let user = rows[0];

      if (user) {
        // 2. Se o usuário existir, pode opcionalmente atualizar informações
        await pgClient.query(
          'UPDATE users_table SET display_name = $1, email = $2, profile_picture_url = $3 WHERE google_id = $4',
          [displayName, email, profilePictureUrl, googleId]
        );
        // Re-obtenha o usuário atualizado
        const updatedUserRows = await pgClient.query(
          'SELECT * FROM users_table WHERE google_id = $1',
          [googleId]
        );

        user = updatedUserRows.rows[0];
        console.log(`Usuário existente logado: ${user.display_name}`);
      } else {
        // 3. Se o usuário não existir, insira-o no banco de dados
        const insertResult = await pgClient.query(
          'INSERT INTO users_table (google_id, display_name, email, profile_picture_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [googleId, displayName, email, profilePictureUrl]
        );
        user = insertResult.rows[0];
        console.log(`Novo usuário criado: ${user.display_name}`);
      }

      // Passe o objeto do usuário do seu banco de dados para o Passport
      return done(null, user);

    } catch (err) {
      console.error("Erro na autenticação Google:", err);
      return done(err, null);
    }
  }
));

// ROTA DE LOGIN
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// CALLBACK
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Dados do usuário estarão em req.user após a autenticação e deserialização
    if (req.user) {
      res.redirect(`/jogo?name=${encodeURIComponent(req.user.display_name)}&email=${encodeURIComponent(req.user.email)}`);
    } else {
      res.redirect("/"); // Caso por algum motivo req.user não esteja disponível
    }
  }
);

app.get("/jogo", (req, res) => {
  if (!req.isAuthenticated()) {
    // Se não estiver autenticado, redireciona para a página de login
    return res.redirect("/"); // Redireciona para a raiz que agora serve login.html
  }
  // Se estiver autenticado, serve a página do jogo (seu HTML original)
  res.sendFile(path.join(__dirname, '/index.html')); // Assumindo que seu HTML do jogo é o index.html na raiz ou em public
});

app.get('/api/currentUser', (req, res) => {
  if (req.isAuthenticated()) {
    // req.user contém o objeto de usuário completo do seu banco de dados
    res.json({
      id: req.user.id,
      google_id: req.user.google_id,
      displayName: req.user.display_name,
      email: req.user.email,
      profilePictureUrl: req.user.profile_picture_url
    });
  } else {
    res.status(401).json({ message: 'Não autenticado' });
  }
});

// app.listen(3000, () => console.log("App rodando em http://localhost:3000"));


app.get('/', function (req, res) {
  // Se o usuário já estiver autenticado, redirecione para o jogo
  if (req.isAuthenticated()) {
    return res.redirect("/jogo");
  }
  // Caso contrário, sirva a página de login
  res.sendFile(path.join(__dirname, '/login.html')); // Ajuste o caminho se seu login.html estiver em outro lugar
});


async function getPontuacaoPostgre() {
  try {
    var query = `select * from ranking_table`
    var { rows } = await pgClient.query(query)
    return { rows }
  } catch (e) {
    console.log(e)
    return e
  }
}

app.get('/getPontuacao', async function (req, res) {
  var resultado = await getPontuacaoPostgre()
  res.json(resultado)
})


// ... (seus imports e configurações)

app.get('/getRanking', async (req, res) => {
  try {
    const modoFiltro = req.query.modo; // O modo enviado pelo filtro (ex: "tempo", "speedrun", "livre", "")
    const limit = parseInt(req.query.limit || 10, 10);

    let query = `
            SELECT usersId, nome, pontuacao, modo, data
            FROM ranking_table
        `;
    let params = [];
    let whereClauses = [];
    let paramIndex = 1;

    // Valida o modoFiltro para evitar SQL Injection ou valores inesperados
    if (modoFiltro && !MODOS_DE_FILTRO_RANKING_VALIDOS.includes(modoFiltro)) {
      return res.status(400).json({ sucesso: false, erro: 'Modo de filtro de ranking inválido.' });
    }

    if (modoFiltro) {
      if (modoFiltro === 'livre' || modoFiltro === '1x1') {
        // Para 'livre' ou '1x1', busca correspondência exata
        whereClauses.push(`modo = $${paramIndex++}`);
        params.push(modoFiltro);
      } else if (modoFiltro === 'tempo' || modoFiltro === 'speedrun') {
        // Para 'tempo' ou 'speedrun', usa LIKE para buscar todos os variantes
        whereClauses.push(`modo LIKE $${paramIndex++}`);
        params.push(`${modoFiltro}%`); // Ex: 'tempo%' para pegar 'tempo-1', 'tempo-3'
      }
      // Se modoFiltro for vazio, não adiciona WHERE clause
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += `
            ORDER BY pontuacao DESC, data ASC
            LIMIT $${paramIndex++}
        `;
    params.push(limit);

    const { rows } = await pgClient.query(query, params);

    res.json({ sucesso: true, ranking: rows });
  } catch (e) {
    console.error("Erro ao obter ranking:", e);
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});


// ROTA PARA OBTER AS PONTUAÇÕES DO USUÁRIO LOGADO (para mostrar a ele as 5 melhores)
app.get('/getUserScores', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ sucesso: false, erro: 'Não autenticado.' });
  }
  const userId = req.user.id; // O ID do usuário logado do seu banco de dados

  try {
    // Obter as pontuações do usuário, ainda pode ser mais do que 5 por modo
    // O agrupamento e limite por 5 por modo será feito no frontend como antes,
    // pois é mais simples para exibir as categorias.

    const { rows } = await pgClient.query(
      `SELECT usersId, nome, pontuacao, modo, data
             FROM ranking_table
             WHERE usersId = $1
             ORDER BY pontuacao DESC, data ASC`, // Ordena para pegar as melhores primeiro
      [userId]
    );

    // Agrupar por modo e pegar apenas os top 5 de cada modo
    const userScoresByMode = {};
    rows.forEach(score => {
      if (!userScoresByMode[score.modo]) {
        userScoresByMode[score.modo] = [];
      }
      // A lógica de manter os 5 melhores por modo já é feita na inserção.
      // Aqui estamos apenas exibindo o que foi salvo.
      // Se você quiser garantir que apenas 5 são *retornados* aqui, pode adicionar:
      // if (userScoresByMode[score.modo].length < 5) {
      userScoresByMode[score.modo].push(score);
      // }
    });


    res.json({ sucesso: true, userScores: userScoresByMode });
  } catch (e) {
    console.error("Erro ao obter pontuações do usuário:", e);
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

app.get('/insertPontuacao', async function (req, res) {
  try {
    const dados = req.query.name;
    // console.log(dados)
    // Agora esperamos 5 partes: usersId, nome, pontuacao, data, modo
    const [usersIdStr, nome, pontuacaoStr, data, modo] = dados.split('###');


    const userId = parseInt(usersIdStr, 10);
    const pontuacao = parseInt(pontuacaoStr, 10);

    // --- Novas Validações ---
    if (isNaN(userId) || isNaN(pontuacao)) {
      return res.status(400).json({ sucesso: false, erro: 'Dados inválidos: userId ou pontuacao não são números.' });
    }
    if (!modo || !ALL_MODOS_COMPLETOS_VALIDOS.includes(modo)) {
      return res.status(400).json({ sucesso: false, erro: 'Modo de jogo inválido ou não fornecido.' });
    }
    // --- Fim das Novas Validações ---

    // 1. Contar quantos registros o usuário já tem PARA ESTE MODO ESPECÍFICO
    const countResult = await pgClient.query(
      'SELECT COUNT(*) AS total_records FROM ranking_table WHERE usersId = $1 AND modo = $2',
      [userId, modo]
    );
    const totalRecords = parseInt(countResult.rows[0].total_records, 10);

    // 2. Obter a menor pontuação atual do usuário PARA ESTE MODO ESPECÍFICO, se houver 5 ou mais registros
    let lowestScore = -1;
    if (totalRecords >= 5) {
      const lowestScoreResult = await pgClient.query(
        'SELECT pontuacao FROM ranking_table WHERE usersId = $1 AND modo = $2 ORDER BY pontuacao ASC, data ASC LIMIT 1',
        [userId, modo]
      );
      if (lowestScoreResult.rows.length > 0) {
        lowestScore = lowestScoreResult.rows[0].pontuacao;
      }
    }

    // 3. Decidir se a nova pontuação deve ser inserida/substituída
    // A lógica permanece a mesma, mas agora com a condição 'modo'
    if (totalRecords < 5) {
      await pgClient.query(
        'INSERT INTO ranking_table (usersId, nome, pontuacao, data, modo) VALUES ($1, $2, $3, $4, $5)',
        [userId, nome, pontuacao, data, modo]
      );
      res.json({ sucesso: true, message: 'Pontuação inserida.', action: 'inserted' });
    } else if (pontuacao > lowestScore) {
      // Deletar o registro com a menor pontuação (e mais antigo em caso de empate) PARA ESTE MODO
      await pgClient.query(
        `DELETE FROM ranking_table
                 WHERE id = (SELECT id FROM ranking_table WHERE usersId = $1 AND modo = $2 ORDER BY pontuacao ASC, data ASC LIMIT 1)`,
        [userId, modo]
      );
      // Inserir a nova pontuação
      await pgClient.query(
        'INSERT INTO ranking_table (usersId, nome, pontuacao, data, modo) VALUES ($1, $2, $3, $4, $5)',
        [userId, nome, pontuacao, data, modo]
      );
      res.json({ sucesso: true, message: 'Pontuação atualizada (registro antigo removido).', action: 'updated' });
    } else {
      // Pontuação não é alta o suficiente para entrar no top 5 para este modo
      res.json({ sucesso: true, message: 'Pontuação não é alta o suficiente para entrar no top 5.', action: 'skipped' });
    }

  } catch (e) {
    console.error("Erro ao inserir pontuação:", e);
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});



// app.get('/insertPontuacao', async function (req, res) {
//   try {
//     const dados = req.query.name;
//     const [usersId, nome, pontuacao, data] = dados.split('###');
//     await pgClient.query(
//       'INSERT INTO ranking_table (usersId, nome, pontuacao, data) VALUES ($1, $2, $3, $4)',
//       [usersId, nome, pontuacao, data]
//     );
//     res.json({ sucesso: true });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ sucesso: false, erro: e.message });
//   }
// });
// app.get('/deleteTable', async function (req, res) {
//   try {
//     await pgClient.query(
//       'DROP TABLE ranking_table',
//     );
//     res.json({ sucesso: true });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ sucesso: false, erro: e.message });
//   }
// });


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




