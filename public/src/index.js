let operacaoAtual = "";
let numerosDisponiveis = [];
let numeroAlvo = 0;
let expressaoCorreta = "";
let todasSolucoes = [];
let expCorretasRespondidas = new Set();
let pontuacao = 0;
let modoSelecionadoBase = "livre"; // Variável para a parte base do modo (livre, tempo, speedrun)
let modoSelecionadoCompleto = "livre"; // Variável para o modo completo (livre, tempo-1, speedrun-3)
let tempoLimiteSegundos = 0;
let tempoRestante = 0;
let intervaloTempo = null;




function atualizarPontuacao(valor) {
    pontuacao += valor;
    document.getElementById("pontuacao").textContent = pontuacao;
}

function resetarPontuacao() {
    pontuacao = 0;
    document.getElementById("pontuacao").textContent = pontuacao;
}

function atualizarCronometro() {
    const minutos = Math.floor(tempoRestante / 60);
    const segundos = tempoRestante % 60;
    document.getElementById("cronometro").textContent =
        `⏳ Tempo restante: ${minutos}:${segundos.toString().padStart(2, '0')}`;
}

function sortearNumeros() {
    // teste();
    // Reativa operadores e botão calcular
    document.querySelectorAll(".operador").forEach(btn => btn.disabled = false);
    document.querySelector("button.btn-success")?.removeAttribute("disabled");
    limparMensagemFinal();

    // Esconde o botão e ranking
    document.getElementById("ranking-container").innerHTML = "";

    // Remove mensagens antigas
    document.querySelectorAll(".alert").forEach(el => el.remove());

    const modoRaw = document.getElementById("modoJogo").value;
    modoSelecionadoCompleto = modoRaw; // Guarda o valor completo
    modoSelecionadoBase = modoRaw.split("-")[0]; // "livre", "tempo", "speedrun"
    tempoLimiteSegundos = parseInt(modoRaw.split("-")[1]) * 60 || 0;


    clearInterval(intervaloTempo);
    document.getElementById("cronometro").textContent = "";

    if (modoSelecionadoBase === "tempo" || modoSelecionadoBase === "speedrun") {
        tempoRestante = tempoLimiteSegundos;
        atualizarCronometro();

        intervaloTempo = setInterval(() => {
            tempoRestante--;
            atualizarCronometro();

            if (tempoRestante <= 0) {
                clearInterval(intervaloTempo);
                encerrarJogo();
            }
        }, 1000);
        resetarPontuacao()
    }

    sorteiaNovoNumero();
    adicionarBotaoResetarPontuacao();

    // Se for modo de tempo ou speedrun, desativa "Sortear" e ativa "Desistir"
    if (modoSelecionadoBase === "tempo" || modoSelecionadoBase === "speedrun") {
        document.getElementById("sortear").disabled = true;
        adicionarBotaoDesistir();
    } else {
        removerBotaoDesistir();
    }

    // Se for modo de tempo ou speedrun, desativa "Sortear" e ativa "Desistir"
    if (modoSelecionadoBase === "speedrun") {
        adicionarBotaoPular();
    } else {
        removerBotaoPular();
    }
}

function sorteiaNovoNumero() {
    const qtd = parseInt(document.getElementById("quantidade").value);
    const sorteados = new Set();
    const maximosorteado = parseInt(document.getElementById("maximosorteado").value);

    while (sorteados.size < qtd) {
        const num = Math.floor(Math.random() * maximosorteado) + 1;
        sorteados.add(num);
    }

    numerosDisponiveis = [...sorteados];
    operacaoAtual = "";
    atualizarOperacao();
    document.getElementById("resultado").textContent = "?";
    document.getElementById("resposta-correta").textContent = "";
    document.getElementById("acertos-unicos").innerHTML = "";
    document.getElementById("todas-solucoes")?.remove();
    document.getElementById("botao-solucoes")?.remove();
    expCorretasRespondidas.clear();

    const dificuldade = document.getElementById("dificuldade").value;
    let minAlvo = 50, maxAlvo = 100;
    if (dificuldade === "medio") {
        minAlvo = 100;
        maxAlvo = 200;
    } else if (dificuldade === "dificil") {
        minAlvo = 200;
        maxAlvo = 400;
    } else if (dificuldade === "facil") {
        minAlvo = 10;
        maxAlvo = 50;
    }

    gerarNumeroAlvo(numerosDisponiveis, minAlvo, maxAlvo);
    renderizarNumeros();
    adicionarBotaoMostrarSolucoes();
    atualizarContadorSolucoes();
}

function adicionarBotaoMostrarSolucoes() {
    const container = document.createElement("div");
    container.className = "mt-3";
    container.id = "botao-solucoes";

    const btn = document.createElement("button");
    btn.textContent = "Mostrar todas as soluções";
    btn.className = "btn btn-info me-2";
    btn.onclick = () => {
        const lista = document.createElement("ul");
        lista.id = "todas-solucoes";
        lista.className = "text-start mx-auto mt-3";
        todasSolucoes.forEach(expr => {
            const li = document.createElement("li");
            li.textContent = expr + " = " + numeroAlvo;
            lista.appendChild(li);
        });
        btn.remove();
        container.appendChild(lista);
    };

    container.appendChild(btn);
    document.querySelector(".container").appendChild(container);
}

function adicionarBotaoResetarPontuacao() {
    if (document.getElementById("botao-resetar")) return;

    const btnReset = document.createElement("button");
    btnReset.textContent = "Resetar Pontuação";
    btnReset.className = "btn btn-danger mt-2";
    btnReset.id = "botao-resetar";
    btnReset.onclick = resetarPontuacao;

    document.querySelector(".container").appendChild(btnReset);
}


function renderizarNumeros() {
    const container = document.getElementById("numeros");
    container.innerHTML = "";

    numerosDisponiveis.forEach((n, i) => {
        const div = document.createElement("div");
        div.classList.add("numero");
        div.textContent = n;
        div.dataset.index = i;

        div.addEventListener("click", () => {
            if (!div.classList.contains("usado")) {
                const ultimoChar = operacaoAtual.slice(-1);
                const ehOperador = ["+", "-", "×", "÷"].includes(ultimoChar) || operacaoAtual.length === 0;

                if (ehOperador) {
                    operacaoAtual += n;
                    div.classList.add("usado");
                    atualizarOperacao();
                }
            }
        });

        container.appendChild(div);
    });
}

function atualizarOperacao() {
    document.getElementById("operacao").textContent = operacaoAtual;
}

function calcular() {
    try {
        const tokens = operacaoAtual.match(/\d+|[+\-×÷]/g);
        if (!tokens) throw "expressão vazia";

        let total = parseInt(tokens[0]);
        for (let i = 1; i < tokens.length; i += 2) {
            const op = tokens[i];
            const val = parseInt(tokens[i + 1]);

            switch (op) {
                case "+": total += val; break;
                case "-": total -= val; break;
                case "×": total *= val; break;
                case "÷": total = val === 0 ? NaN : total / val; break;
                default: throw "operador inválido";
            }
        }

        document.getElementById("resultado").textContent = total;

        if (total === numeroAlvo) {
            const assinatura = gerarAssinatura(operacaoAtual);
            if (expCorretasRespondidas.has(assinatura)) {
                document.getElementById("resposta-correta").textContent = "⚠️ Essa operação já foi usada.";
                feedbackErro();
                return;
            }

            expCorretasRespondidas.add(assinatura);
            document.getElementById("resposta-correta").textContent = "✅ Correto!";
            const li = document.createElement("li");
            li.textContent = operacaoAtual + " = " + numeroAlvo;
            document.getElementById("acertos-unicos").appendChild(li);
            atualizarPontuacao(1);
            feedbackCorreto();
            document.getElementById("operacao").textContent = "";
            // ...
            atualizarContadorSolucoes();


            // O modo já é pego no sortearNumeros e guardado em modoSelecionadoBase
            // const modoRaw = document.getElementById("modoJogo").value;
            // modoSelecionadoBase = modoRaw.split("-")[0];

            // Se for modo de speedrun, e acertar, passa para a próxima
            if (modoSelecionadoBase === "speedrun") {
                sorteiaNovoNumero();
            }
        } else {
            document.getElementById("resposta-correta").textContent = "❌ Erro.";
            atualizarPontuacao(-1);
            feedbackErro();
        }
    } catch (e) {
        document.getElementById("resultado").textContent = "Erro";
    }
}



function gerarOperadores(ops, tamanho) {
    if (tamanho === 0) return [[]];
    const resultado = [];
    const menores = gerarOperadores(ops, tamanho - 1);
    for (const m of menores) {
        for (const o of ops) {
            resultado.push([...m, o]);
        }
    }
    return resultado;
}

function gerarNumeroAlvo(numeros, minAlvo, maxAlvo) {
    const dificuldade = document.getElementById("dificuldade").value;
    let intervalo = { min: 10, max: 50 };

    if (dificuldade === "normal") intervalo = { min: 50, max: 100 };
    else if (dificuldade === "medio") intervalo = { min: 100, max: 200 };
    else if (dificuldade === "dificil") intervalo = { min: 200, max: 400 };

    const operadores = ["+", "-", "×", "÷"];
    const expPossiveis = [];

    function permutacoes(arr) {
        if (arr.length <= 1) return [arr];
        const resultado = [];

        for (let i = 0; i < arr.length; i++) {
            const resto = arr.slice(0, i).concat(arr.slice(i + 1));
            for (const p of permutacoes(resto)) {
                resultado.push([arr[i], ...p]);
            }
        }

        return resultado;
    }

    let numsPermutados = [];
    for (let k = 2; k <= Math.min(5, numeros.length); k++) {
        const combs = combinacoes(numeros, k);
        combs.forEach(c => {
            numsPermutados.push(...permutacoes(c));
        });
    }

    for (const numSeq of numsPermutados) {
        const n = numSeq.length;
        const operadorComb = gerarOperadores(operadores, n - 1);

        for (const ops of operadorComb) {
            const expr = [];
            for (let i = 0; i < n - 1; i++) {
                expr.push(numSeq[i]);
                expr.push(ops[i]);
            }
            expr.push(numSeq[n - 1]);

            const exprStr = expr.join('');
            const tokens = exprStr.match(/\d+|[+\-×÷]/g);
            let total = parseInt(tokens[0]);

            for (let i = 1; i < tokens.length; i += 2) {
                const op = tokens[i];
                const val = parseInt(tokens[i + 1]);

                switch (op) {
                    case "+": total += val; break;
                    case "-": total -= val; break;
                    case "×":
                        if (val === 1) { total = NaN; break; }
                        total *= val; break;
                    case "÷":
                        if (val === 1 || val === 0 || total % val !== 0) {
                            total = NaN;
                        } else {
                            total /= val;
                        }
                        break;
                }
                if (isNaN(total)) break;
            }

            if (!isNaN(total) && Number.isInteger(total) && total >= intervalo.min && total <= intervalo.max) {
                expPossiveis.push({ expr: exprStr, result: total });
            }
        }
    }

    const unicosPorAssinatura = new Map();

    expPossiveis.forEach(({ expr, result }) => {
        const tokens = expr.match(/\d+|[+\-×÷]/g);
        const nums = [];
        const ops = [];

        for (let i = 0; i < tokens.length; i++) {
            if (i % 2 === 0) nums.push(tokens[i]);
            else ops.push(tokens[i]);
        }

        const assinatura = nums.slice().sort((a, b) => a - b).join(",") + "|" + ops.join(",");
        if (!unicosPorAssinatura.has(assinatura)) {
            unicosPorAssinatura.set(assinatura, { expr, result });
        }
    });

    const filtradas = [...unicosPorAssinatura.values()];

    if (filtradas.length > 0) {
        const escolhida = filtradas[Math.floor(Math.random() * filtradas.length)];
        numeroAlvo = escolhida.result;
        expressaoCorreta = escolhida.expr;
        document.getElementById("alvo").textContent = numeroAlvo;

        const unicas = new Map();

        expPossiveis
            .filter(e => e.result === numeroAlvo)
            .forEach(e => {
                const assinatura = gerarAssinatura(e.expr);
                if (!unicas.has(assinatura)) {
                    unicas.set(assinatura, e.expr);
                }
            });

        todasSolucoes = Array.from(unicas.values());
    } else {
        numeroAlvo = 0;
        expressaoCorreta = "";
        todasSolucoes = [];
        document.getElementById("alvo").textContent = "?";
    }
}

function aagerarAssinatura(expr) {
    const tokens = expr.match(/\d+|[+\-×÷]/g);
    if (!tokens) return expr;

    const numeros = [];
    const operadores = [];

    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
            numeros.push(tokens[i]);
        } else {
            operadores.push(tokens[i]);
        }
    }

    const assinatura = [...numeros].sort((a, b) => a - b).join(",") + "|" + operadores.sort().join("");
    return assinatura;
}

function gerarAssinatura(expr) {
    const tokens = expr.match(/\d+|[+\-×÷]/g);
    if (!tokens) return expr;

    const numeros = [];
    const operadores = [];

    // Pegando os números na ordem de aparição
    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
            numeros.push(parseInt(tokens[i]));
        } else {
            operadores.push(tokens[i]);
        }
    }

    // Ordenar os números, mas manter operadores na ordem
    const numsOrdenados = [...numeros].sort((a, b) => a - b);

    return numsOrdenados.join(",") + "|" + operadores.join("");
}

function combinacoes(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];

    const [primeiro, ...resto] = arr;
    const comPrimeiro = combinacoes(resto, k - 1).map(c => [primeiro, ...c]);
    const semPrimeiro = combinacoes(resto, k);
    return comPrimeiro.concat(semPrimeiro);
}


function feedbackCorreto() {
    const resultadoEl = document.getElementById("resultado");
    resultadoEl.classList.add("feedback-correto");
    document.getElementById("som-acerto").play();
    setTimeout(() => {
        resultadoEl.classList.remove("feedback-correto");
    }, 1000);
}

function feedbackErro() {
    const resultadoEl = document.getElementById("resultado");
    resultadoEl.classList.add("feedback-erro");
    document.getElementById("som-erro").play();
    setTimeout(() => {
        resultadoEl.classList.remove("feedback-erro");
    }, 1000);
}

function atualizarContadorSolucoes() {
    const total = todasSolucoes.length;
    const restantes = total - expCorretasRespondidas.size;
    document.getElementById("contador-solucoes").textContent =
        `Soluções restantes: ${restantes} de ${total}`;
}

function encerrarJogo() {
    document.getElementById("cronometro").textContent = "⏰ Tempo esgotado! Fim de jogo.";

    // Desabilita botões de operador
    document.querySelectorAll(".operador").forEach(btn => {
        btn.disabled = true;
    });

    // Desabilita os números
    document.querySelectorAll(".numero").forEach(div => {
        div.classList.add("usado");
        div.style.pointerEvents = "none";
    });

    // Desativa botão Calcular
    document.querySelector("button.btn-success")?.setAttribute("disabled", "true");

    // Mensagem adicional
    mostrarMensagemFinal();
    // Reativa botão sortear e remove botão desistir
    document.getElementById("sortear").disabled = false;
    removerBotaoDesistir();
    removerBotaoPular();
}

async function mostrarMensagemFinal() {
    const msgDiv = document.getElementById("mensagem-final");
    msgDiv.className = "alert alert-info";
    msgDiv.textContent = `Pontuação final: ${pontuacao} ponto(s)!`;

    // Exibe a pontuação final no modal
    document.getElementById("pontuacao-final-modal").textContent = pontuacao;

    if (pontuacao > 0) {
        var userID = localStorage.getItem('currentUserId');
        var userName = localStorage.getItem('currentUserName');

        // Garante que o modo completo seja enviado
        await insertRanking(userID, userName, pontuacao, modoSelecionadoCompleto);
    }

    // Adicionar o botão de Ranking
    // const rankingContainer = document.getElementById("ranking-container");
    // rankingContainer.innerHTML = `
    //     <button id="btn-mostrar-ranking" class="btn btn-info btn-lg mt-3" data-bs-toggle="modal" data-bs-target="#rankingModal">
    //         Ver Ranking <i class="fas fa-trophy ms-2"></i>
    //     </button>
    // `;

    // Carregar o ranking e as pontuações do usuário assim que o botão é exibido
    // Para que estejam prontas quando o modal abrir
    loadUserBestScores();
    loadGlobalRanking();

    // Adiciona listeners para os filtros de modo e DIFICULDADE no ranking
    document.getElementById('rankingModeFilter').removeEventListener('change', loadGlobalRanking); // Remove para evitar duplicidade
    document.getElementById('rankingDifficultyFilter').removeEventListener('change', loadGlobalRanking); // Remove para evitar duplicidade

    document.getElementById('rankingModeFilter').addEventListener('change', loadGlobalRanking);
    document.getElementById('rankingDifficultyFilter').addEventListener('change', loadGlobalRanking);
}

function limparMensagemFinal() {
    const msgDiv = document.getElementById("mensagem-final");
    msgDiv.textContent = "";
    msgDiv.className = "";
}

function adicionarBotaoDesistir() {
    if (document.getElementById("btn-desistir")) return;

    const btn = document.createElement("button");
    btn.id = "btn-desistir";
    btn.textContent = "Desistir";
    btn.className = "btn btn-secondary";
    btn.onclick = () => {
        clearInterval(intervaloTempo);
        encerrarJogo();
    };

    // Inserir dentro do container controles, ao lado do sortear
    document.getElementById("controles").appendChild(btn);
}

function removerBotaoDesistir() {
    const btn = document.getElementById("btn-desistir");
    if (btn) btn.remove();
    removerBotaoPular();
}



function adicionarBotaoPular() {
    if (document.getElementById("btn-pular")) return;

    const btn = document.createElement("button");
    btn.id = "btn-pular";
    btn.textContent = "Pular";
    btn.className = "btn btn-secondary";
    btn.onclick = () => {
        sorteiaNovoNumero();
    };

    // Inserir dentro do container controles, ao lado do sortear
    document.getElementById("controles").appendChild(btn);
}

function removerBotaoPular() {
    const btn = document.getElementById("btn-pular");
    if (btn) btn.remove();
}


document.getElementById("sortear").addEventListener("click", sortearNumeros);

document.querySelectorAll(".operador").forEach((btn) => {
    btn.addEventListener("click", () => {
        operacaoAtual += btn.textContent;
        atualizarOperacao();
    });
});

document.getElementById("limpar").addEventListener("click", () => {
    operacaoAtual = "";
    atualizarOperacao();

    document.querySelectorAll(".numero.usado").forEach(div => {
        div.classList.remove("usado");
    });

    document.getElementById("resultado").textContent = "?";
    document.getElementById("resposta-correta").textContent = "";
});

async function fetchGet(url) {
    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json; charset=UTF-8;",
        }
    });

    // Handle any errors please

    const data = await resp.json();
    return data
}

async function fetchPost(url) {
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json; charset=UTF-8;",
        }
    });


    const data = await resp.json();
    return data
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/currentUser');
        if (response.ok) {
            const user = await response.json();
            // console.log("Usuário logado:", user);
            // Exiba as informações do usuário na página do jogo
            const welcomeMessage = document.getElementById('welcome-message'); // Supondo que você tenha um elemento com esse ID
            if (welcomeMessage) {
                welcomeMessage.textContent = `Bem-vindo ao MateMatchKA, ${user.displayName}!`;
            }

            // Armazene o ID do usuário para uso no jogo, se necessário (ex: para salvar pontuações associadas a ele)
            localStorage.setItem('currentUserId', user.id);
            localStorage.setItem('currentUserName', user.displayName);

        } else if (response.status === 401) {
            console.log("Usuário não autenticado. Redirecionando para login...");
            window.location.href = '/auth/google'; // Redireciona para o login se não estiver autenticado
        } else {
            console.error("Erro ao carregar dados do usuário:", response.statusText);
        }
    } catch (error) {
        console.error("Erro na requisição da API de usuário:", error);
    }
});

sortearNumeros()

// Carregar o ranking e as pontuações do usuário assim que o botão é exibido
// Para que estejam prontas quando o modal abrir
loadUserBestScores();
loadGlobalRanking();

// Adiciona listeners para os filtros de modo e DIFICULDADE no ranking
document.getElementById('rankingModeFilter').removeEventListener('change', loadGlobalRanking); // Remove para evitar duplicidade
document.getElementById('rankingDifficultyFilter').removeEventListener('change', loadGlobalRanking); // Remove para evitar duplicidade

document.getElementById('rankingModeFilter').addEventListener('change', loadGlobalRanking);
document.getElementById('rankingDifficultyFilter').addEventListener('change', loadGlobalRanking);

// A função loadGlobalRanking é a que precisa ser atualizada
async function loadGlobalRanking() {
    const rankingListBody = document.querySelector("#global-ranking-list tbody");
    const filterMode = document.getElementById('rankingModeFilter').value;
    const filterDifficulty = document.getElementById('rankingDifficultyFilter').value; // Novo filtro de dificuldade

    rankingListBody.innerHTML = '<tr><td colspan="6">Carregando ranking...</td></tr>'; // Colspan ajustado para 6

    try {
        let url = '/getRanking?';
        const params = new URLSearchParams();

        if (filterMode) {
            params.append('modo', filterMode);
        }
        if (filterDifficulty) {
            params.append('dificuldade', filterDifficulty);
        }

        url += params.toString(); // Constrói a URL com os parâmetros de modo e dificuldade

        const response = await fetchGet(url);

        if (response.sucesso && response.ranking) {
            rankingListBody.innerHTML = '';
            if (response.ranking.length === 0) {
                rankingListBody.innerHTML = '<tr><td colspan="6">Nenhuma pontuação encontrada para esta combinação de filtros.</td></tr>'; // Colspan ajustado
            } else {
                response.ranking.forEach((entry, index) => {
                    const row = rankingListBody.insertRow();
                    const dataIso = entry.data.split('T')[0]; // '2025-07-03'
                    const [ano, mes, dia] = dataIso.split('-');
                    const dataFormatada = `${dia}/${mes}/${ano}`;
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${entry.nome}</td>
                        <td>${entry.pontuacao}</td>
                        <td>${entry.modo}</td>
                        <td>${entry.dificuldade || 'N/A'}</td> <td>${dataFormatada}</td>
                    `;
                });
            }
        } else {
            rankingListBody.innerHTML = `<tr><td colspan="6">Erro ao carregar ranking: ${response.erro || 'Desconhecido'}</td></tr>`; // Colspan ajustado
        }
    } catch (error) {
        console.error("Erro ao buscar ranking global:", error);
        rankingListBody.innerHTML = `<tr><td colspan="6">Erro de conexão ao buscar ranking.</td></tr>`; // Colspan ajustado
    }
}


// Atualizar a função loadUserBestScores para exibir a dificuldade
async function loadUserBestScores() {
    const userBestScoresDiv = document.getElementById("user-best-scores");
    userBestScoresDiv.innerHTML = '<p class="text-muted">Carregando suas pontuações...</p>';

    try {
        const response = await fetchGet('/getUserScores');

        if (response.sucesso && response.userScores) {
            userBestScoresDiv.innerHTML = '';
            const combinedModeDifficultyKeys = Object.keys(response.userScores);

            if (combinedModeDifficultyKeys.length === 0) {
                userBestScoresDiv.innerHTML = '<p class="text-muted">Você ainda não tem pontuações registradas.</p>';
            } else {
                combinedModeDifficultyKeys.sort(); // Opcional: ordenar as chaves
                combinedModeDifficultyKeys.forEach(key => {
                    const scores = response.userScores[key]; // Aqui 'key' é "modo-dificuldade"
                    if (scores.length > 0) {
                        const [mode, difficulty] = key.split('-');
                        const modeTitle = document.createElement('h6');
                        // Exemplo: "Modo: tempo-3 (Dificuldade: medio)"
                        modeTitle.textContent = `Modo: ${mode} (Dificuldade: ${difficulty})`;
                        userBestScoresDiv.appendChild(modeTitle);

                        const ul = document.createElement('ul');
                        ul.className = 'list-group list-group-flush mb-2';
                        scores.forEach(score => {
                            const li = document.createElement('li');
                            li.className = 'list-group-item d-flex justify-content-between align-items-center';
                            const dataIso = score.data.split('T')[0]; // '2025-07-03'
                            const [ano, mes, dia] = dataIso.split('-');
                            const dataFormatada = `${dia}/${mes}/${ano}`;
                            li.textContent = `Pontuação: ${score.pontuacao} (${dataFormatada})`;
                            ul.appendChild(li);
                        });
                        userBestScoresDiv.appendChild(ul);
                    }
                });
            }
        } else {
            userBestScoresDiv.innerHTML = `<p class="text-danger">Erro ao carregar suas pontuações: ${response.erro || 'Desconhecido'}</p>`;
        }
    } catch (error) {
        console.error("Erro ao buscar pontuações do usuário:", error);
        userBestScoresDiv.innerHTML = '<p class="text-danger">Erro de conexão ao buscar suas pontuações.</p>';
    }
}

// Atualize sua função insertRanking para passar o modoSelecionadoCompleto
async function insertRanking(userId, nome, pontuacao, modoCompleto) {
    const hoje = new Date().toISOString().split('T')[0]; // retorna "2025-06-27"
    const dificuldade = document.getElementById("dificuldade").value;
    // O modo de jogo já inclui o tempo (ex: "tempo-60", "speedrun-300")
    var dadosToSend = userId + "###" + nome + "###" + pontuacao + "###" + hoje + "###" + modoCompleto + "###" + dificuldade;

    // console.log("Enviando dados para ranking:", dadosToSend);
    var result = await fetchGet(`/insertPontuacao?name=${encodeURIComponent(dadosToSend)}`);
    // console.log("Resposta do insertRanking:", result);
}