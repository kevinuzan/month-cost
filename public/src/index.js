let operacaoAtual = "";
let numerosDisponiveis = [];
let numeroAlvo = 0;
let expressaoCorreta = "";
let todasSolucoes = [];
let acertosUsuario = new Set();

function sortearNumeros() {
    const qtd = parseInt(document.getElementById("quantidade").value);
    const sorteados = new Set();

    while (sorteados.size < qtd) {
        const num = Math.floor(Math.random() * 14) + 1;
        sorteados.add(num);
    }

    numerosDisponiveis = [...sorteados];
    operacaoAtual = "";
    atualizarOperacao();
    acertosUsuario.clear();

    document.getElementById("resultado").textContent = "?";
    document.getElementById("resposta-correta").textContent = "";
    document.getElementById("acertos").innerHTML = "";
    document.getElementById("todas-solucoes").innerHTML = "";
    document.getElementById("info-solucoes").textContent = "Soluções possíveis: ...";

    const dificuldade = document.getElementById("dificuldade").value;
    let minAlvo = 10, maxAlvo = 50;
    if (dificuldade === "normal") [minAlvo, maxAlvo] = [50, 100];
    else if (dificuldade === "medio") [minAlvo, maxAlvo] = [100, 200];
    else if (dificuldade === "dificil") [minAlvo, maxAlvo] = [200, 400];

    gerarNumeroAlvo(numerosDisponiveis, minAlvo, maxAlvo);
    renderizarNumeros();
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
            if (!acertosUsuario.has(operacaoAtual)) {
                acertosUsuario.add(operacaoAtual);
                const li = document.createElement("li");
                li.textContent = operacaoAtual + " = " + numeroAlvo;
                document.getElementById("acertos").appendChild(li);
                document.getElementById("resposta-correta").textContent = "✅ Acertou!";
            } else {
                document.getElementById("resposta-correta").textContent = "⚠️ Você já usou essa solução.";
            }
        } else {
            document.getElementById("resposta-correta").textContent =
                "❌ Errou. Uma possível resposta seria: " + expressaoCorreta + " = " + numeroAlvo;
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
        document.getElementById("info-solucoes").textContent = `Soluções possíveis: ${todasSolucoes.length}`;
    } else {
        numeroAlvo = 0;
        expressaoCorreta = "";
        todasSolucoes = [];
        document.getElementById("alvo").textContent = "?";
        document.getElementById("info-solucoes").textContent = "Soluções possíveis: 0";
    }
}

function gerarAssinatura(expr) {
    const tokens = expr.match(/\d+|[+\-×÷]/g);
    if (!tokens) return expr;

    const numeros = [];
    const operadores = [];

    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) numeros.push(tokens[i]);
        else operadores.push(tokens[i]);
    }

    return [...numeros].sort((a, b) => a - b).join(",") + "|" + operadores.sort().join("");
}

function combinacoes(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];

    const [primeiro, ...resto] = arr;
    const comPrimeiro = combinacoes(resto, k - 1).map(c => [primeiro, ...c]);
    const semPrimeiro = combinacoes(resto, k);
    return comPrimeiro.concat(semPrimeiro);
}

document.getElementById("sortear").addEventListener("click", sortearNumeros);
document.getElementById("calcular").addEventListener("click", calcular);

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

sortearNumeros();