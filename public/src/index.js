let operacaoAtual = "";
let numerosDisponiveis = [];
let numeroAlvo = 0;
let expressaoCorreta = "";
let todasSolucoes = [];
let expCorretasRespondidas = new Set();
let pontuacao = 0;
let modoSelecionado = "livre";
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
    // Reativa operadores e botão calcular
    document.querySelectorAll(".operador").forEach(btn => btn.disabled = false);
    document.querySelector("button.btn-success")?.removeAttribute("disabled");
    limparMensagemFinal();

    // Remove mensagens antigas
    document.querySelectorAll(".alert").forEach(el => el.remove());



    const modoRaw = document.getElementById("modoJogo").value;
    modoSelecionado = modoRaw.split("-")[0]; // "livre", "tempo", "speedrun"
    tempoLimiteSegundos = parseInt(modoRaw.split("-")[1]) * 60 || 0;


    clearInterval(intervaloTempo);
    document.getElementById("cronometro").textContent = "";

    if (modoSelecionado === "tempo" || modoSelecionado === "speedrun") {
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
    if (modoSelecionado === "tempo" || modoSelecionado === "speedrun") {
        document.getElementById("sortear").disabled = true;
        adicionarBotaoDesistir();
    } else {
        removerBotaoDesistir();
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


            const modoRaw = document.getElementById("modoJogo").value;
            modoSelecionado = modoRaw.split("-")[0]; // "livre", "tempo", "speedrun"

            // Se for modo de speedrun, e acertar, passa para a próxima
            if (modoSelecionado === "speedrun") {
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
}

function mostrarMensagemFinal() {
    const msgDiv = document.getElementById("mensagem-final");
    msgDiv.className = "alert alert-info";
    msgDiv.textContent = `Pontuação final: ${pontuacao} ponto(s)!`;
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
sortearNumeros()
