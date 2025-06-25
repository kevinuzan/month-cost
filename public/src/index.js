let operacaoAtual = "";
let numerosDisponiveis = [];
let numeroAlvo = 0;

const socket = io();
let souLider = false;

function sortearNumeros() {
    const sorteados = new Set();
    while (sorteados.size < 5) {
        const num = Math.floor(Math.random() * 15);
        sorteados.add(num);
    }

    numerosDisponiveis = [...sorteados];
    gerarNumeroAlvo(numerosDisponiveis); // calcula o alvo antes de exibir
    renderizarNumeros();
    operacaoAtual = "";
    atualizarOperacao();
    document.getElementById("resultado").textContent = "?";
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
                operacaoAtual += n;
                div.classList.add("usado");
                atualizarOperacao();
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

        // Resolvendo em ordem da esquerda pra direita (sem precedência)
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

    } catch (e) {
        document.getElementById("resultado").textContent = "Erro";
    }
}

let expressaoCorreta = "";

function gerarNumeroAlvo(numeros) {
    const operadores = ["+", "-", "×", "÷"];
    const expressõesPossíveis = [];

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
                                    if (val === 0 || total % val !== 0) total = NaN;
                                    else total /= val;
                                    break;
                            }
                            if (isNaN(total)) break;
                        }

                        if (!isNaN(total) && Number.isInteger(total) && total >= 0 && total <= 100) {
                            expressõesPossíveis.push({ expr, result: total });
                        }
                    }
    }

    if (expressõesPossíveis.length > 0) {
        const escolhido = expressõesPossíveis[Math.floor(Math.random() * expressõesPossíveis.length)];
        numeroAlvo = escolhido.result;
        expressaoCorreta = escolhido.expr;
        document.getElementById("alvo").textContent = numeroAlvo;
    } else {
        numeroAlvo = 0;
        expressaoCorreta = "";
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

sortearNumeros();