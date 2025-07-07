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

// Certifique-se que essas constantes estão aqui, antes da definição das rotas.
const ALL_MODOS_COMPLETOS_VALIDOS = [
  'livre',
  'tempo-1', 'tempo-3', 'tempo-5', 'tempo-10',
  'speedrun-1', 'speedrun-3', 'speedrun-5', 'speedrun-10',
  '1x1'
];

const MODOS_DE_FILTRO_RANKING_VALIDOS = [
  '', // "Todos os Modos"
  'livre',
  'tempo_all', // Novo filtro geral para tempo
  'tempo-1', 'tempo-3', 'tempo-5', 'tempo-10', // Filtros específicos de tempo
  'speedrun_all', // Novo filtro geral para speedrun
  'speedrun-1', 'speedrun-3', 'speedrun-5', 'speedrun-10', // Filtros específicos de speedrun
  '1x1'
];

// Opcional: Se você quiser validar o modo de filtro, pode fazer assim:
const DIFICULDADES_DE_FILTRO_RANKING_VALIDAS = [
  '', // Para "Todas as Dificuldades"
  'facil',
  'normal',
  'medio',
  'dificil'
];


// Novas constantes para as dificuldades válidas
const DIFICULDADES_VALIDAS = [
  'facil',
  'normal',
  'medio',
  'dificil'
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

// ROTA PARA OBTER O RANKING
app.get('/getRanking', async (req, res) => {
  try {
    const modoFiltro = req.query.modo; // Ex: "tempo_all", "tempo-1", "livre", ""
    const dificuldadeFiltro = req.query.dificuldade; // Ex: "facil", "medio", ""
    const limit = parseInt(req.query.limit || 10, 10);

    let query = `
            SELECT usersId, nome, pontuacao, modo, dificuldade, data
            FROM ranking_table
        `;
    let params = [];
    let whereClauses = [];
    let paramIndex = 1;

    // --- Validações de Filtro ---
    if (modoFiltro && !MODOS_DE_FILTRO_RANKING_VALIDOS.includes(modoFiltro)) {
      return res.status(400).json({ sucesso: false, erro: 'Modo de filtro de ranking inválido.' });
    }
    if (dificuldadeFiltro && !DIFICULDADES_DE_FILTRO_RANKING_VALIDAS.includes(dificuldadeFiltro)) {
      return res.status(400).json({ sucesso: false, erro: 'Dificuldade de filtro de ranking inválida.' });
    }
    // --- Fim das Validações de Filtro ---

    // Lógica para filtro de MODO
    if (modoFiltro) {
      if (modoFiltro === 'livre' || modoFiltro === '1x1' ||
        modoFiltro.startsWith('tempo-') || modoFiltro.startsWith('speedrun-')) {
        // Se for "livre", "1x1" ou um modo específico com tempo (tempo-1, speedrun-5), usa correspondência EXATA
        whereClauses.push(`modo = $${paramIndex++}`);
        params.push(modoFiltro);
      } else if (modoFiltro === 'tempo_all') {
        // Se for "tempo_all", usa LIKE para pegar todos os modos que começam com "tempo"
        whereClauses.push(`modo LIKE $${paramIndex++}`);
        params.push(`tempo%`);
      } else if (modoFiltro === 'speedrun_all') {
        // Se for "speedrun_all", usa LIKE para pegar todos os modos que começam com "speedrun"
        whereClauses.push(`modo LIKE $${paramIndex++}`);
        params.push(`speedrun%`);
      }
    }

    // Lógica para filtro de DIFICULDADE (permanece a mesma)
    if (dificuldadeFiltro) {
      whereClauses.push(`dificuldade = $${paramIndex++}`);
      params.push(dificuldadeFiltro);
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
// Exemplo da rota getUserScores para referência, não precisa mudar
app.get('/getUserScores', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ sucesso: false, erro: 'Não autenticado.' });
  }
  const userId = req.user.id;

  try {
    const { rows } = await pgClient.query(
      `SELECT usersId, nome, pontuacao, modo, dificuldade, data -- Adicione 'dificuldade' aqui
             FROM ranking_table
             WHERE usersId = $1
             ORDER BY pontuacao DESC, data ASC`,
      [userId]
    );

    const userScoresByModeAndDifficulty = {};
    rows.forEach(score => {
      const key = `${score.modo}-${score.dificuldade}`; // Chave composta para agrupar
      if (!userScoresByModeAndDifficulty[key]) {
        userScoresByModeAndDifficulty[key] = [];
      }
      if (userScoresByModeAndDifficulty[key].length < 5) {
        userScoresByModeAndDifficulty[key].push(score);
      }
    });

    res.json({ sucesso: true, userScores: userScoresByModeAndDifficulty }); // Altere aqui para o novo objeto
  } catch (e) {
    console.error("Erro ao obter pontuações do usuário:", e);
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

app.post('/salvar-sessao', async (req, res) => {
  try {
    const { id, usuario, modo, dificuldade, numeros, alvoInicial, jogadas } = req.body;
    const hoje = new Date().toISOString().split('.')[0].replace('T', ' - ');
    await pgClient.query(`
      INSERT INTO sessoes (id, usuario, modo, dificuldade, numeros, alvo_inicial, data, data_completa)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, usuario, modo, dificuldade, JSON.stringify(numeros), alvoInicial, hoje, hoje]);

    for (const jogada of jogadas) {
      await pgClient.query(`
    INSERT INTO jogadas
      (sessao_id, numeros, expressao, resultado, correto,
       alvo, tempo_restante, pontuacao)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
        id,
        JSON.stringify(jogada.numeros),   // NOVO
        jogada.expressao,
        jogada.resultado,
        jogada.correto,
        jogada.alvo,
        jogada.tempoRestante,
        jogada.pontuacaoAtual
      ]);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Erro ao salvar sessão:", error);
    res.status(500).send("Erro ao salvar sessão");
  }
});

app.get("/sessoes", async (req, res) => {
  try {
    const { usuario } = req.query;

    if (!usuario) {
      return res.status(400).send("Usuário não informado.");
    }

    const { rows: sessoes } = await pgClient.query(`
      SELECT
        s.id,
        s.usuario,
        s.modo,
        s.dificuldade,
        s.numeros,
        s.alvo_inicial,
        s.data,
        s.data_completa,
        json_agg(
          json_build_object(
            'numeros', j.numeros,
            'expressao', j.expressao,
            'resultado', j.resultado,
            'correto', j.correto,
            'alvo', j.alvo,
            'tempoRestante', j.tempo_restante,
            'pontuacaoAtual', j.pontuacao
          )
        ) AS jogadas
      FROM sessoes s
      LEFT JOIN jogadas j ON s.id = j.sessao_id
      WHERE s.usuario = $1
      GROUP BY s.id
      ORDER BY s.data DESC
    `, [usuario]);

    res.json(sessoes);
  } catch (err) {
    console.error("Erro ao buscar sessões:", err);
    res.status(500).send("Erro ao buscar sessões");
  }
});



app.get('/insertPontuacao', async function (req, res) {
  try {
    const dados = req.query.name;
    console.log(dados); // Para debug, se precisar
    // Agora esperamos 6 partes: usersId, nome, pontuacao, data, modo, dificuldade
    const [usersIdStr, nome, pontuacaoStr, data, modo, dificuldade] = dados.split('###');

    const userId = parseInt(usersIdStr, 10);
    const pontuacao = parseInt(pontuacaoStr, 10);

    // --- Novas Validações ---
    if (isNaN(userId) || isNaN(pontuacao)) {
      return res.status(400).json({ sucesso: false, erro: 'Dados inválidos: userId ou pontuacao não são números.' });
    }
    if (!modo || !ALL_MODOS_COMPLETOS_VALIDOS.includes(modo)) {
      return res.status(400).json({ sucesso: false, erro: 'Modo de jogo inválido ou não fornecido.' });
    }
    // Validação da dificuldade
    if (!dificuldade || !DIFICULDADES_VALIDAS.includes(dificuldade)) {
      return res.status(400).json({ sucesso: false, erro: 'Dificuldade inválida ou não fornecida.' });
    }
    // --- Fim das Novas Validações ---

    // As operações de banco de dados agora precisam incluir a `dificuldade`
    // para manter o ranking top 5 por (usuário, modo, dificuldade)

    // 1. Contar quantos registros o usuário já tem PARA ESTE MODO E DIFICULDADE ESPECÍFICOS
    const countResult = await pgClient.query(
      'SELECT COUNT(*) AS total_records FROM ranking_table WHERE usersId = $1 AND modo = $2 AND dificuldade = $3',
      [userId, modo, dificuldade]
    );
    const totalRecords = parseInt(countResult.rows[0].total_records, 10);

    // 2. Obter a menor pontuação atual do usuário PARA ESTE MODO E DIFICULDADE ESPECÍFICOS, se houver 5 ou mais registros
    let lowestScore = -1;
    if (totalRecords >= 5) {
      const lowestScoreResult = await pgClient.query(
        'SELECT pontuacao FROM ranking_table WHERE usersId = $1 AND modo = $2 AND dificuldade = $3 ORDER BY pontuacao ASC, data ASC LIMIT 1',
        [userId, modo, dificuldade]
      );
      if (lowestScoreResult.rows.length > 0) {
        lowestScore = lowestScoreResult.rows[0].pontuacao;
      }
    }

    // 3. Decidir se a nova pontuação deve ser inserida/substituída
    if (totalRecords < 5) {
      await pgClient.query(
        'INSERT INTO ranking_table (usersId, nome, pontuacao, data, modo, dificuldade) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, nome, pontuacao, data, modo, dificuldade]
      );
      res.json({ sucesso: true, message: 'Pontuação inserida.', action: 'inserted' });
    } else if (pontuacao > lowestScore) {
      // Deletar o registro com a menor pontuação (e mais antigo em caso de empate) PARA ESTE MODO E DIFICULDADE
      await pgClient.query(
        `DELETE FROM ranking_table
                 WHERE id = (SELECT id FROM ranking_table WHERE usersId = $1 AND modo = $2 AND dificuldade = $3 ORDER BY pontuacao ASC, data ASC LIMIT 1)`,
        [userId, modo, dificuldade]
      );
      // Inserir a nova pontuação
      await pgClient.query(
        'INSERT INTO ranking_table (usersId, nome, pontuacao, data, modo, dificuldade) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, nome, pontuacao, data, modo, dificuldade]
      );
      res.json({ sucesso: true, message: 'Pontuação atualizada (registro antigo removido).', action: 'updated' });
    } else {
      // Pontuação não é alta o suficiente para entrar no top 5 para este modo e dificuldade
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
//       'DROP TABLE sessoes',
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
      callback({ sucesso: true, hostId: sala.jogadores[0] });

      // envia para os dois jogadores
      io.to(salaId).emit("sala-pronta", {
        hostId: sala.jogadores[0],
        jogadorIds: sala.jogadores
      });
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

  socket.on("solicitar-novo-desafio", ({ salaId }) => {
    // Apenas o servidor decide quem sorteia (o primeiro jogador da sala = host)
    const sala = salas[salaId];
    if (!sala) return;

    const hostId = sala.jogadores[0];
    io.to(hostId).emit("sortear-novo-desafio", salaId);
  });

});




