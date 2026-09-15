
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

    return responseJSON({ success: false, message: "Ação GET não reconhecida" });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

/**
 * Tratamento de requisições POST (Inserção e Gravação)
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

  // Preenche o status como ATIVO se não for enviado
  if (headers.includes("STATUS") && !recordData["STATUS"]) {
    recordData["STATUS"] = "ATIVO";
  }

  // Mapeia os dados na ordem exata das colunas do cabeçalho
  const newRow = headers.map(header => recordData[header] !== undefined ? recordData[header] : "");

  sheet.appendRow(newRow);
  return recordData;
}

/**
 * Formata a resposta da API como JSON
 */
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
