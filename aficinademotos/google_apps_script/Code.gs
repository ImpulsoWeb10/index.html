/**
 * API Google Apps Script - Oficina de Motos
 */

const SPREADSHEET_ID = "1Eltbd8ACp9IQ6PSscSY9aGIOdcnTKvH2qHq4QLPe9cM";

// Lista de abas válidas para segurança
const VALID_TABLES = [
  "CONFIGURACAO",
  "CLIENTES",
  "MOTOS",
  "SERVICOS",
  "ORDENS",
  "ITENS_OS",
  "MANUTENCOES"
];

// Mapeamento das chaves primárias de cada tabela
const TABLE_ID_KEYS = {
  "CLIENTES": "ID_CLIENTE",
  "MOTOS": "ID_MOTO",
  "SERVICOS": "ID_SERVICO",
  "ORDENS": "ID_OS",
  "ITENS_OS": "ID_ITEM",
  "MANUTENCOES": "ID_MANUTENCAO",
  "CONFIGURACAO": "ID"
};

// Mapeamento dos prefixos de ID para auto-incremento
const TABLE_PREFIXES = {
  "CLIENTES": "CLI",
  "MOTOS": "MOT",
  "SERVICOS": "SER",
  "ORDENS": "OS",
  "ITENS_OS": "ITM",
  "MANUTENCOES": "MAN",
  "CONFIGURACAO": "CFG"
};

/**
 * Tratamento de requisições GET (Consultas e Leitura)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const table = e.parameter.table;

    if (action === "ping") {
      return responseJSON({ success: true, message: "API da Oficina funcionando", timestamp: new Date() });
    }

    if (action === "list") {
      if (!table || !VALID_TABLES.includes(table)) {
        return responseJSON({ success: false, message: "Tabela inválida ou não informada" });
      }
      const data = getTableData(table);
      return responseJSON({ success: true, table: table, total: data.length, data: data });
    }

    if (action === "get") {
      const id = e.parameter.id;
      if (!table || !VALID_TABLES.includes(table) || !id) {
        return responseJSON({ success: false, message: "Tabela ou ID não informado" });
      }
      const idKey = TABLE_ID_KEYS[table];
      const allData = getTableData(table);
      const record = allData.find(item => String(item[idKey]) === String(id));
      return responseJSON({ success: true, data: record || null });
    }

    return responseJSON({ success: false, message: "Ação GET não reconhecida" });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

/**
 * Tratamento de requisições POST (Inserção, Atualização e Gravação)
 */
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const table = contents.table;
    const data = contents.data;

    if (action === "insert") {
      if (!table || !VALID_TABLES.includes(table)) {
        return responseJSON({ success: false, message: "Tabela inválida para inserção" });
      }
      const newRecord = insertRecord(table, data);
      return responseJSON({ success: true, message: "Registro inserido com sucesso", record: newRecord });
    }

    if (action === "update") {
      if (!table || !VALID_TABLES.includes(table)) {
        return responseJSON({ success: false, message: "Tabela inválida para atualização" });
      }
      const updatedRecord = updateRecord(table, data);
      return responseJSON({ success: true, message: "Registro atualizado com sucesso", record: updatedRecord });
    }

    return responseJSON({ success: false, message: "Ação POST não reconhecida" });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

/**
 * Busca todos os dados de uma aba específica
 */
function getTableData(tableName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tableName);
  
  if (!sheet) throw new Error("Aba não encontrada: " + tableName);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return []; // Retorna vazio se só houver o cabeçalho

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Insere um novo registro gerando o ID automático
 */
function insertRecord(tableName, recordData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tableName);

  if (!sheet) throw new Error("Aba não encontrada: " + tableName);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idKey = TABLE_ID_KEYS[tableName];
  const prefix = TABLE_PREFIXES[tableName];

  // Gera o próximo ID (ex: CLI-0002)
  if (idKey && !recordData[idKey]) {
    const nextNumber = sheet.getLastRow(); 
    recordData[idKey] = prefix + "-" + String(nextNumber).padStart(4, '0');
  }

  // Preenche a data de cadastro automaticamente se houver a coluna
  if (headers.includes("DATA_CADASTRO") && !recordData["DATA_CADASTRO"]) {
    recordData["DATA_CADASTRO"] = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
  }

  // Preenche o status inicial das ordens ou registros se não for enviado
  if (headers.includes("STATUS") && !recordData["STATUS"]) {
    recordData["STATUS"] = tableName === "ORDENS" ? "EM ABERTO" : "ATIVO";
  }

  // Mapeia os dados na ordem exata das colunas do cabeçalho
  const newRow = headers.map(header => recordData[header] !== undefined ? recordData[header] : "");

  sheet.appendRow(newRow);
  return recordData;
}

/**
 * Atualiza um registro existente com base na chave primária
 */
function updateRecord(tableName, recordData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tableName);

  if (!sheet) throw new Error("Aba não encontrada: " + tableName);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error("Nenhum dado encontrado na aba " + tableName);

  const headers = values[0];
  const idKey = TABLE_ID_KEYS[tableName];
  const recordId = recordData[idKey];

  if (!recordId) throw new Error("Chave primária " + idKey + " não fornecida para atualização.");

  const idIndex = headers.indexOf(idKey);
  if (idIndex === -1) throw new Error("Coluna ID " + idKey + " não encontrada na tabela.");

  // Encontra a linha do registro a ser atualizado
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(recordId)) {
      headers.forEach((header, colIdx) => {
        if (recordData[header] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(recordData[header]);
        }
      });
      return recordData;
    }
  }

  throw new Error("Registro com " + idKey + " = " + recordId + " não foi encontrado.");
}

/**
 * Formata a resposta da API como JSON
 */
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
