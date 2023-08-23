import { createServer } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

var app = express();
var server = createServer(app);
server.listen(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.get('/changeJsonData', function (req, res) {
  var newDataAppend = req.query.name.split(';')[0]
  var id = req.query.name.split(';')[1]
  var resultado = changeJson(newDataAppend, id)
  res.json(resultado)
});

function changeJson(newDataAppend, id) {
  try {
    // Leitura do arquivo JSON
    const data = fs.readFileSync(path.join(__dirname + '/public/json/itemData.json'), 'utf8');
    // Conversão do JSON em objeto JavaScript
    const jsonData = JSON.parse(data);

    // Adição de um novo item à lista 'itemDespesas'
    var newItem = newDataAppend;
    if (id === "despesasBtn") {
      if (jsonData["itemDespesa"].indexOf(newItem.toLowerCase()) == -1) {
        jsonData["itemDespesa"][0][newItem] = 0;
      }
    } else {
      if (jsonData["itemRenda"].indexOf(newItem.toLowerCase()) == -1) {
        jsonData["itemRenda"][0][newItem] = 0;
      }
    }

    // Conversão do objeto JavaScript atualizado de volta para JSON
    const updatedJson = JSON.stringify(jsonData, null, 2);
    // Escrita do JSON atualizado de volta ao arquivo
    fs.writeFileSync(path.join(__dirname + '/public/json/itemData.json'), updatedJson, 'utf8');
    return [updatedJson, true];
  } catch (err) {
    console.error('Erro ao ler ou escrever o arquivo JSON:', err);
    return [err, false];
  }
}

app.get('/changeJsonCalendar', function (req, res) {
  var newCalendarData = req.query.name;
  fs.writeFileSync(path.join(__dirname + '/public/json/calendarData.json'), newCalendarData, 'utf8');
  res.json('true')
});