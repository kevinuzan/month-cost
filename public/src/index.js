let operacaoAtual = "";
let numerosDisponiveis = [];
let numeroAlvo = 0;
let expressaoCorreta = "";
let todasSolucoes = [];

const socket = io();
let souLider = false;

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
    document.getElementById("resultado").textContent = "?";
    document.getElementById("resposta-correta").textContent = "";
    document.getElementById("todas-solucoes").innerHTML = "";

    // Definir limites com base na dificuldade
    const dificuldade = document.getElementById("dificuldade").value;
    let minAlvo = 50, maxAlvo = 100;
    if (dificuldade === "medio") {
        minAlvo = 100;
        maxAlvo = 200;
    } else if (dificuldade === "dificil") {
        minAlvo = 200;
        maxAlvo = 400;
    }

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
            document.getElementById("resposta-correta").textContent = "✅ Parabéns! Você acertou!";
        } else {
            document.getElementById("resposta-correta").textContent =
                "❌ Errou. Uma resposta possível seria: " + expressaoCorreta + " = " + numeroAlvo;
        }

        // Mostrar todas as soluções possíveis
        const lista = document.getElementById("todas-solucoes");
        lista.innerHTML = "";
        todasSolucoes.forEach(expr => {
            const li = document.createElement("li");
            li.textContent = expr + " = " + numeroAlvo;
            lista.appendChild(li);
        });

    } catch (e) {
        document.getElementById("resultado").textContent = "Erro";
    }
}

function gerarNumeroAlvo(numeros, minAlvo, maxAlvo) {
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

    const numsPermutados = permutacoes(numeros);

    for (const numSeq of numsPermutados) {
        for (let o1 of operadores)
            for (let o2 of operadores)
                for (let o3 of operadores)
                    for (let o4 of operadores) {
                        const expr = [
                            numSeq[0], o1,
                            numSeq[1], o2,
                            numSeq[2], o3,
                            numSeq[3], o4,
                            numSeq[4]
                        ].join('');

                        const tokens = expr.match(/\d+|[+\-×÷]/g);
                        let total = parseInt(tokens[0]);
                        for (let i = 1; i < tokens.length; i += 2) {
                            const op = tokens[i];
                            const val = parseInt(tokens[i + 1]);
                            switch (op) {
                                case "+": total += val; break;
                                case "-": total -= val; break;
                                case "×": total *= val; break;
                                case "÷":
                                    if (val === 0 || total % val !== 0) {
                                        total = NaN;
                                    } else {
                                        total /= val;
                                    }
                                    break;
                            }
                            if (isNaN(total)) break;
                        }

                        if (!isNaN(total) && Number.isInteger(total) && total >= minAlvo && total <= maxAlvo) {
                            expPossiveis.push({ expr, result: total });
                        }
                    }
    }

    // Remove expressões duplicadas que usam os mesmos números e operadores
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

        todasSolucoes = filtradas
            .filter(e => e.result === numeroAlvo)
            .map(e => e.expr);
    } else {
        numeroAlvo = 0;
        expressaoCorreta = "";
        todasSolucoes = [];
        document.getElementById("alvo").textContent = "?";
    }
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

    // Liberar todos os números usados
    document.querySelectorAll(".numero.usado").forEach(div => {
        div.classList.remove("usado");
    });

    // Limpar resultado e feedback
    document.getElementById("resultado").textContent = "?";
    document.getElementById("resposta-correta").textContent = "";
});
sortearNumeros();