// URL da API publicada no Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfnoPvMwYaBIVFKUeP13u0bWtY7oIMPzB51NC4cdBX6pwWQXESwG1fiJ36G0Z01t43pA/exec";

const output = document.getElementById("output");

// Função genérica para requisições GET
async function apiGet(action, table = "") {
  output.textContent = "Carregando...";
  try {
    let url = `${APPS_SCRIPT_URL}?action=${action}`;
    if (table) url += `&table=${table}`;

    const response = await fetch(url);
    const data = await response.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = "Erro na requisição GET: " + error.message;
  }
}

// Função genérica para requisições POST (Compatível com CORS no Apps Script)
async function apiPost(action, table, payload) {
  output.textContent = "Enviando dados...";
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      // Usa text/plain para contornar preflight CORS no Google Apps Script
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: action,
        table: table,
        data: payload
      })
    });

    const data = await response.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = "Erro na requisição POST: " + error.message;
  }
}

// Eventos de Leitura
document.getElementById("btnPing").addEventListener("click", () => apiGet("ping"));
document.getElementById("btnClientes").addEventListener("click", () => apiGet("list", "CLIENTES"));
document.getElementById("btnMotos").addEventListener("click", () => apiGet("list", "MOTOS"));
document.getElementById("btnServicos").addEventListener("click", () => apiGet("list", "SERVICOS"));

// Evento de Cadastro de Cliente
document.getElementById("formCliente").addEventListener("submit", (e) => {
  e.preventDefault();

  const clienteData = {
    NOME: document.getElementById("nomeCliente").value,
    CPF_CNPJ: document.getElementById("cpfCliente").value,
    TELEFONE: document.getElementById("telCliente").value,
    WHATSAPP: document.getElementById("telCliente").value,
    EMAIL: document.getElementById("emailCliente").value
  };

  apiPost("insert", "CLIENTES", clienteData);
});
