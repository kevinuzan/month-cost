
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

function formatCurrencyBRL(value) {
    const options = {
        style: 'currency',
        currency: 'BRL'
    };
    return value.toLocaleString('pt-BR', options);
}

var selectData = '<option selected disabled value="itemDespesa">Selecione o item</option>';
var selectData2 = '<option selected disabled value="itemDespesa">Selecione o item</option>';
// Preenche os dados do select com os dados do JSON
async function getJson() {

    await getCalendarData()

    await fetch('/json/itemData.json')
        .then(response => response.json())
        .then(data => {
            // Aqui você pode manipular o conteúdo do arquivo JSON
            for (i in data) {
                console.log(i, data, data[i], data[i][1])
                var keys = Object.keys(data[i][0])
                if (i === 'itemDespesa') {
                    for (j in keys) {
                        selectData += `<option value="${keys[j]}">${keys[j]}</option>`;
                        addItemToTable(keys[j], `${formatCurrencyBRL(data[i][0][keys[j]])}`, `despesasTable`);
                    }
                } else {
                    for (j in keys) {
                        selectData += `<option value="${keys[j]}">${keys[j]}</option>`;
                        addItemToTable(keys[j], `${formatCurrencyBRL(data[i][0][keys[j]])}`, `rendasTable`);
                    }
                }
            }
            saveJson(data)
        })
        .catch(error => {
            console.error('Ocorreu um erro ao carregar o arquivo JSON:', error);
        });

    initButtons();
    load();
}

async function getCalendarData() {
    fetch('/json/calendarData.json')
        .then(response => response.json())
        .then(data => {
            saveCalendarJson(data)
        })
        .catch(error => {
            console.error('Ocorreu um erro ao carregar o arquivo JSON:', error);
        });
}

function saveCalendarJson(data) {
    events = data
}


var dataJson
function saveJson(data) {
    dataJson = data
}

var dados
async function addItem(valor, id) {
    var valueDespesas = `/changeJsonData?name=${valor};${id}`;
    const resultado = await fetchGet(valueDespesas);
    dados = JSON.parse(resultado[0])
    console.log(dados)
    if (resultado[1]) {
        if (id === "despesasBtn") {
            document.querySelector("#despesasTable tbody").innerHTML = ''
            var keys = Object.keys(dados.itemDespesa[0]);
            for (i in keys) {
                console.log(dados.itemDespesa[0][keys[i]], keys[i], i)
                addItemToTable(keys[i], `R$ 0,00`, `despesasTable`);
            }
        } else {
            document.querySelector("#rendasTable tbody").innerHTML = ''
            var keys = Object.keys(dados.itemRenda[0]);
            for (i in keys) {
                addItemToTable(keys[i], `R$ 0,00`, `rendasTable`);
            }
        }
        alert('Item Adicionado');
    } else {
        alert(resultado);
    }
}

var items = document.getElementsByName('tab');

for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', activeClass(items));
}
class activeClass {
    constructor(items) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].classList.contains("active")) {
                items[i].classList.toggle("active")
                items[i].ariaSelected = "false"
            }
        }
        this.classList.add("active")
        this.ariaSelected = "true"

    }
}

// Função para adicionar um novo item à tabela
function addItemToTable(nome, valor, idTable) {
    const tableBody = document.querySelector(`#${idTable} tbody`);
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td style="padding: 0;">${nome}</td>
      <td class="currency" style="padding: 0;">${valor}</td>
    `;
    tableBody.appendChild(newRow);
}





// CALENDARIO

let nav = 0;
let clicked = null;
let events = [];


const calendar = document.getElementById('calendar');
const newEventModal = document.getElementById('newEventModal');
const deleteEventModal = document.getElementById('deleteEventModal');
const backDrop = document.getElementById('modalBackDrop');
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function openModal(date, title) {
    clicked = date;
    const eventForDay = events.find(e => e.date === clicked && e.title == title);
    const eventForDayCred = events.find(e => e.date === clicked && e.title == 'Crédito');
    var totalCredito = 0;
    for (const item of eventForDayCred.value) {
        const valor = parseFloat(item.valor);
        totalCredito += valor;
    }
    const eventForDayDebi = events.find(e => e.date === clicked && e.title == 'Débito');
    var totalDebito = 0;
    for (const item of eventForDayDebi.value) {
        const valor = parseFloat(item.valor);
        totalDebito += valor;
    }
    if (!totalCredito) totalCredito = 0
    if (!totalDebito) totalDebito = 0
    var totalSaldo = totalCredito - totalDebito
    if (eventForDay) {
        if (title == 'Saldo') {
            document.getElementById('tipoDado').innerText = `${eventForDay.title} - ${convertDateFormat(date)}`;
            document.getElementById('valueText').innerText = `R$ ${totalSaldo}`;
            document.getElementById('plusBotao').style.visibility = 'hidden'
            document.getElementById('editBotao').style.visibility = 'hidden'
            
        } else {
            document.getElementById('plusBotao').style.visibility = 'visible'
            document.getElementById('editBotao').style.visibility = 'visible'
            document.getElementById('eventText').innerText = '';
            document.getElementById('tipoDado').innerText = `${eventForDay.title} - ${convertDateFormat(date)}`;
            var newString = ''
            for (i = 0; i < eventForDay.value.length; i++) {
                newString = `${newString}${eventForDay.value[i].nome}: \tR$ ${eventForDay.value[i].valor}\n`
            }
            document.getElementById('valueText').innerText = newString;

        }
        deleteEventModal.style.display = 'block';
    } else {
        newEventModal.style.display = 'block';
    }

    backDrop.style.display = 'block';
}


async function editEvent(){
    paragraph.contentEditable = true;
    paragraph.focus()
}

const paragraph = document.getElementById('valueText');

// paragraph.addEventListener('dblclick', () => {
//     if (!(document.getElementById('tipoDado').innerText.indexOf('Saldo') >= 0)) {
//         paragraph.contentEditable = true;
//         paragraph.focus();
//     }
// });

paragraph.addEventListener('blur', async () => {
    paragraph.contentEditable = false;
    await changeValueEdit()
});

async function changeValueEdit() {
    console.log(paragraph.innerText)
    var newValues = paragraph.innerText.split('\n');
    var typeToAdd = document.getElementById('tipoDado').innerText.split(' - ')[0].replace('Add ', '')
    var dateToAdd = await convertDateFormat(document.getElementById('tipoDado').innerText.split(' - ')[1]);
    var newEndString = '['
    var valorToSub = 1
    if (newValues.length == 1) valorToSub = 0
    for (i = 0; i < newValues.length - valorToSub; i++) {
        newEndString += `{"nome": "${newValues[i].split(': ')[0]}","valor": "${newValues[i].split(': ')[1].replaceAll("R$ ", '').replaceAll("R$", '')}"},`
    }
    newEndString = newEndString.slice(0, -1)
    newEndString += ']'
    console.log(newEndString)
    events = events.map(obj => {
        if (obj.date.split('/')[1] === dateToAdd.split('/')[1] && obj.title === typeToAdd) {
            // Substitui o valor existente
            return {
                ...obj,
                value: JSON.parse(newEndString)
            };
        }
        return obj;
    });
    //console.log(events)
    await saveJsonDataCalendar(events)
}

function openModalNew(date) {
    clicked = date;
    newEventModal.style.display = 'block';

    backDrop.style.display = 'block';
}

function load() {
    const dt = new Date();

    if (nav !== 0) {
        dt.setMonth(new Date().getMonth() + nav);
    }

    const day = dt.getDate();
    const month = dt.getMonth();
    const year = dt.getFullYear();

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dateString = firstDayOfMonth.toLocaleDateString('en-us', {
        weekday: 'long',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });
    const paddingDays = weekdays.indexOf(dateString.split(', ')[0]);

    document.getElementById('monthDisplay').innerText =
        `${dt.toLocaleDateString('pt-br', { month: 'long' })} ${year}`;

    const oldDate = new Date(year, month - 1, 1);
    const posDate = new Date(year, month + 1, 1);

    document.getElementById('backButton').innerText =
        `< ${oldDate.toLocaleDateString('pt-BR', { month: 'long' })}`;
    document.getElementById('nextButton').innerText =
        `${posDate.toLocaleDateString('pt-BR', { month: 'long' })} >`;
    calendar.innerHTML = '';

    for (let i = 1; i <= paddingDays + daysInMonth; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day');

        const dayString = `${month + 1}/${i - paddingDays}/${year}`;

        if (i > paddingDays) {
            daySquare.innerText = i - paddingDays;
            //const eventForDay = events.find(e => e.date === dayString);
            const eventForDay = events.filter(e => e.date === dayString);

            if (i - paddingDays === day && nav === 0) {
                daySquare.id = 'currentDay';
            }
            if (eventForDay.length > 0) {
                for (j = 0; j < eventForDay.length; j++) { //new
                    // const eventDiv = document.createElement('div');
                    // eventDiv.classList.add('event');
                    // eventDiv.innerText = eventForDay[j].title;
                    // daySquare.appendChild(eventDiv);
                    // daySquare.children[j].addEventListener('click', () => openModal(dayString, eventForDay[j].title));
                    // daySquare.addEventListener('click', () => openModalNew(dayString));

                    const eventDiv = document.createElement('button');
                    eventDiv.classList.add('event');
                    eventDiv.id = `${eventForDay[j].title.replaceAll(" ", "")}`
                    eventDiv.innerText = eventForDay[j].title;
                    if (eventForDay[j].title == 'Crédito') {
                        eventDiv.style.backgroundColor = 'green'
                    } else if (eventForDay[j].title == 'Débito') {
                        eventDiv.style.backgroundColor = 'red'
                    }

                    eventDiv.addEventListener('click', () => openModal(dayString, eventDiv.innerText));
                    daySquare.appendChild(eventDiv);
                }
            } else {
                //daySquare.addEventListener('click', () => openModalNew(dayString));
            }
            // if (eventForDay) {
            //     const eventDiv = document.createElement('div');
            //     eventDiv.classList.add('event');
            //     eventDiv.innerText = eventForDay.title;
            //     daySquare.appendChild(eventDiv);
            //     daySquare.children[0].addEventListener('click', () => openModal(dayString));
            //     daySquare.addEventListener('click', () => openModalNew(dayString));

            // }
        } else {
            daySquare.classList.add('padding');
        }

        calendar.appendChild(daySquare);
    }
}

function closeModal() {
    newEventModal.style.display = 'none';
    deleteEventModal.style.display = 'none';
    backDrop.style.display = 'none';
    clicked = null;
    //load();
}


var dataToAdd = ''
async function addEvent() {
    dataToAdd = `Add ${document.getElementById('tipoDado').innerText}`

    closeModal();
    newEventModal.style.display = 'block';
    backDrop.style.display = 'block';
    document.getElementById('eventToADD').innerText = dataToAdd
}

function convertDateFormat(dateString) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const newDateFormat = `${parts[1]}/${parts[0]}/${parts[2]}`;
        return newDateFormat;
    } else {
        return dateString; // Retorna a data no formato original se não for possível converter
    }
}

async function addValor() {
    var typeToAdd = document.getElementById('eventToADD').innerText.split(' - ')[0].replace('Add ', '')
    var dateToAdd = await convertDateFormat(document.getElementById('eventToADD').innerText.split(' - ')[1]);
    var nameToAdd = document.getElementById('nameToADD').value
    var valueToAdd = document.getElementById('valueToADD').value
    var mensalAdd = document.getElementById('checkBoxSetMensal').value
    // Novo objeto que você deseja adicionar
    var novoObjeto = {
        "nome": nameToAdd,
        "valor": valueToAdd
    };
    // Crie um novo array com os objetos atualizados usando map
    events = events.map(obj => {
        if (mensalAdd) {
            if (obj.date.split('/')[1] === dateToAdd.split('/')[1] && obj.title === typeToAdd) {
                if (obj.value.length === 1 && obj.value[0].nome === "" && obj.value[0].valor === "") {
                    // Substitui o valor existente
                    return {
                        ...obj,
                        value: [novoObjeto]
                    };
                } else {
                    // Adiciona um novo valor à lista
                    return {
                        ...obj,
                        value: [...obj.value, novoObjeto]
                    };
                }
            }
        }
        else {
            if (obj.date === dateToAdd && obj.title === typeToAdd) {
                if (obj.value.length === 1 && obj.value[0].nome === "" && obj.value[0].valor === "") {
                    // Substitui o valor existente
                    return {
                        ...obj,
                        value: [novoObjeto]
                    };
                } else {
                    // Adiciona um novo valor à lista
                    return {
                        ...obj,
                        value: [...obj.value, novoObjeto]
                    };
                }
            }
        }
        return obj;
    });
    //console.log(events)
    await saveJsonDataCalendar(events)
    //     var valueDespesas = `/changeJsonCalendar?name=${JSON.stringify(events)}`;
    //     const resultado = await fetchGet(valueDespesas);
    //     if (resultado == 'true') {
    //         alert('feito')
    //     } else { alert('malfeito') }
}

async function saveJsonDataCalendar(newData) {
    // Supondo que 'newData' seja o JSON atualizado
    var jsonData = JSON.stringify(newData);
    // Enviar os dados para o servidor
    await fetch('/salvar-json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData
    })
        .then(response => response.json())
        .then(data => {
            console.log('Resposta do servidor:', data);
        })
        .catch(error => {
            console.error('Erro ao enviar dados:', error);
        });
}

function initButtons() {
    document.getElementById('nextButton').addEventListener('click', () => {
        nav++;
        load();
    });

    document.getElementById('backButton').addEventListener('click', () => {
        nav--;
        load();
    });

    document.getElementById('cancelButton').addEventListener('click', closeModal);
    document.getElementById('plusBotao').addEventListener('click', addEvent);
    document.getElementById('editBotao').addEventListener('click', editEvent);
    document.getElementById('closeButton').addEventListener('click', closeModal);
}

