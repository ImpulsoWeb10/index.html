function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getAllData') {
      return responseJSON({
        clientes: getSheetData(ss, 'CLIENTES'),
        motos: getSheetData(ss, 'MOTOS'),
        manutencoes: getSheetData(ss, 'MANUTENCOES'),
        retornos: getSheetData(ss, 'RETORNOS'),
        servicos: getSheetData(ss, 'SERVICOS'),
        configuracoes: getSheetData(ss, 'CONFIGURACOES'),
        listasApp: getSheetData(ss, 'LISTAS_APP')
      });
    }
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'addCliente') return responseJSON(addRow(ss, 'CLIENTES', data.payload));
    if (action === 'addMoto') return responseJSON(addRow(ss, 'MOTOS', data.payload));
    if (action === 'addManutencao') return responseJSON(addRow(ss, 'MANUTENCOES', data.payload));
    if (action === 'addRetorno') return responseJSON(addRow(ss, 'RETORNOS', data.payload));
    if (action === 'updateRetorno') return responseJSON(updateRow(ss, 'RETORNOS', 'ID_RETORNO', data.payload.ID_RETORNO, data.payload));

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) val = formatDate(val);
      obj[h] = val;
    });
    return obj;
  });
}

function addRow(ss, sheetName, payload) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => payload[h] !== undefined ? payload[h] : '');
  sheet.appendRow(row);
  return { status: 'success', data: payload };
}

function updateRow(ss, sheetName, keyName, keyValue, payload) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf(keyName);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] == keyValue) {
      headers.forEach((h, colIdx) => {
        if (payload[h] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(payload[h]);
        }
      });
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Registro não encontrado' };
}

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
