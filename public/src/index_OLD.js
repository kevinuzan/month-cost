async function getData() {
    const string_base = `A agricultura é uma atividade importante para a economia de qualquer país. Ela desempenha um papel vital no fornecimento de alimentos para a população e contribui para o desenvolvimento econômico. No entanto, a agricultura intensiva pode ter impactos negativos no meio ambiente. Um dos problemas associados à agricultura intensiva é o uso excessivo de agrotóxicos. Os agrotóxicos são substâncias químicas utilizadas para controlar pragas e doenças nas plantações. Apesar de serem eficazes na proteção das plantas, seu uso descontrolado pode contaminar o solo, a água e afetar a saúde humana.`;
    const array_base = string_base.split(' ');
    var string_comp = $('#textData')[0].value;
    const array_comp = string_comp.split(' ');
    var j = 0;
    const threshold = 0.4;
    var erros = [];
    var palavrasErradas = [];
    var text_check = '';
    for (var i = 0; i < array_base.length; i++) {
        if (array_base[i] != array_comp[j]) {
            var similar = isSimilar(array_base[i], array_comp[j], threshold);
            if (!similar) {
                if (isSimilar(array_base[i + 1], array_comp[j], threshold)) {
                    // console.log("PALAVRA FALTANTE:", array_base[i], array_comp[j]);
                    text_check += `<span class="green-missed">${array_base[i]}</span> ` //VERDE
                    erros.push(array_base[i].length);
                    i++;
                }
                else if (isSimilar(array_base[i], array_comp[j + 1], threshold)) {

                    // console.log("PALAVRA A MAIS:", array_comp[j]);
                    text_check += `<span class="red-slashed">${array_comp[j]}</span> ` //VERMELHO COM TRAÇO
                    erros.push(array_comp[j].length);
                    if (array_base[i] == array_comp[j + 1]) {
                        text_check += `${array_base[i]} `
                    } else {
                        text_check += `<span class="green-missed">${array_base[i]}</span> ` //VERDE
                        erros.push(array_base[i].length);
                    }
                    j++;
                }
                else if (!isSimilar(array_base[i], array_comp[j + 1], threshold)) {
                    var text_check2 = '';
                    while (!isSimilar(array_base[i], array_comp[j + 1], threshold)) {
                        // console.log(array_base[i], array_comp[j + 1])
                        // console.log("PALAVRA A MAIS 2:", array_comp[j]);
                        text_check2 += `<span class="red-slashed">${array_comp[j]}</span> ` //VERMELHO COM TRAÇO
                        erros.push(array_comp[j].length);
                        // console.log(array_base[i + 1], array_comp[j + 1])
                        if (array_base[i + 1] != array_comp[j + 1]) {
                            text_check2 += `${array_base[i]} `
                            erros.push(array_base[i].length);
                            break;
                        } else if (isSimilar(array_base[i + 1], array_comp[j + 1], threshold)) {
                            text_check2 += `<span class="green-missed">${array_base[i]}</span> ` //PALAVRA FALTANTE
                            erros.push(array_base[i].length);
                            break;
                        }
                        j++;
                    }
                    text_check += text_check2;
                }
            } else {
                var [letrasErradas, numeroErros] = comparar(array_base[i], array_comp[j])
                erros.push(numeroErros)
                palavrasErradas.push(letrasErradas)
                console.log(letrasErradas)
                // console.log(array_comp[j], array_base[i], letrasErradas)
                text_check += `<span class="orange-dif">${array_comp[j]}</span> ` //LARANJA
            }
        } else {
            text_check += `${array_comp[j]} `
        }
        j++;
    }
    if (array_comp.length > j) {
        text_check += `<span class="red-slashed">${array_comp.slice(j).join(' ')}</span>`
        console.log(array_comp.slice(j).join(' '));
    }
    $('#resultado')[0].innerHTML = text_check
    $('#notaUser')[0].innerHTML = `Nota: ${8 - (erros.reduce((partialSum, a) => partialSum + a, 0) * 0.05)}/8,0`;
    $('#errosUser')[0].innerHTML = `Erros: ${erros.reduce((partialSum, a) => partialSum + a, 0)}`;
    stopCounter()
    console.log(erros, palavrasErradas)

}

function calculateLevenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Inicializar a primeira linha e a primeira coluna da matriz
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Preencher a matriz
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // Deleção
                matrix[i][j - 1] + 1, // Inserção
                matrix[i - 1][j - 1] + cost // Substituição
            );
        }
    }

    return matrix[len1][len2];
}

function isSimilar(str1, str2, threshold) {
    const distance = calculateLevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = 1 - distance / maxLength;
    return similarity >= threshold;
}

function comparar(palavra1, palavra2) { //palavra certa, palavra errada
    var newPalavra = ''
    var j = 0;
    var ocorrencias = 0;
    if (palavra1.length < palavra2.length) {
        for (var i = 0; i < palavra2.length; i++) {
            if (palavra2[i] == palavra1[j]) {
                newPalavra += palavra2[i]
                j++;
            } else if (palavra2[i] == palavra1[j + 1]) {
                newPalavra += '_'
                ocorrencias++;
                j++;
            } else {
                newPalavra += '_'
                ocorrencias++;
            }
        }
    } else {
        for (var i = 0; i < palavra1.length; i++) {
            if (palavra1.length == palavra2.length) {
                if (palavra1[i] == palavra2[i]) {
                    newPalavra += palavra2[i]
                } else {
                    newPalavra += '_'
                    ocorrencias++;
                }
            } else if (palavra1.length > palavra2.length) {
                if (palavra1[i] == palavra2[j]) {
                    newPalavra += palavra2[j]
                    j++;
                } else {
                    newPalavra += '_'
                    ocorrencias++;
                }
            }
        }
    }
    console.log(newPalavra)
    return [newPalavra, ocorrencias];
}



var counterElement = document.getElementById("counter");
var startButton = document.getElementById("startButton");

var intervalId;
var minutes = 11;
var seconds = 0;
var isRunning = false;

function startCounter() {
  if (!isRunning) {
    minutes = 11;
    seconds = 0;
    intervalId = setInterval(updateCounter, 1000);
    isRunning = true;
    $('#textData')[0].disabled = false;
    $('#textData')[0].value = '';
    $('#resultado')[0].innerHTML = '';
    
  }
}

function stopCounter() {
  clearInterval(intervalId);
  isRunning = false;
  $('#textData')[0].disabled = true;
}



function updateCounter() {
  if (minutes === 0 && seconds === 0) {
    stopCounter();
    return;
  }
  
  if (seconds === 0) {
    minutes--;
    seconds = 59;
  } else {
    seconds--;
  }
  
  var formattedTime = 
    (minutes < 10 ? "0" + minutes : minutes) + ":" +
    (seconds < 10 ? "0" + seconds : seconds);
  
  counterElement.textContent = formattedTime;
}

startButton.addEventListener("click", startCounter);