// URL da API publicada no Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfnoPvMwYaBIVFKUeP13u0bWtY7oIMPzB51NC4cdBX6pwWQXESwG1fiJ36G0Z01t43pA/exec";

const output = document.getElementById("output");

function showOutput(data) {
  if (output) {
    output.textContent = typeof data === "object" ? JSON.stringify(data, null, 2) : data;
  }
}

// Requisição GET (Leitura) - Com suporte a redirecionamento do Apps Script
async function apiGet(action, table = "") {
  showOutput("Consultando API...");
  try {
    let url = `${APPS_SCRIPT_URL}?action=${action}`;
    if (table) url += `&table=${table}`;

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow"
    });

    const data = await response.json();
    showOutput(data);
  } catch (error) {
    showOutput("Erro na consulta GET: " + error.message);
  }
}

// Requisição POST (Gravação)
async function apiPost(action, table, payload) {
  showOutput("Enviando dados para a planilha...");
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: action,
        table: table,
        data: payload
      })
    });

    const data = await response.json();
    showOutput(data);
  } catch (error) {
    showOutput("Erro na gravação POST: " + error.message);
  }
}

// Mapeamento dos Botões e Formulários
document.addEventListener("DOMContentLoaded", () => {
  const btnPing = document.getElementById("btnPing");
  const btnClientes = document.getElementById("btnClientes");
  const btnMotos = document.getElementById("btnMotos");
  const btnServicos = document.getElementById("btnServicos");

  if (btnPing) btnPing.addEventListener("click", () => apiGet("ping"));
  if (btnClientes) btnClientes.addEventListener("click", () => apiGet("list", "CLIENTES"));
  if (btnMotos) btnMotos.addEventListener("click", () => apiGet("list", "MOTOS"));
  if (btnServicos) btnServicos.addEventListener("click", () => apiGet("list", "SERVICOS"));

  // Evento Formulário Cliente
  const formCliente = document.getElementById("formCliente");
  if (formCliente) {
    formCliente.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        NOME: document.getElementById("nomeCliente").value,
        CPF_CNPJ: document.getElementById("cpfCliente").value,
        TELEFONE: document.getElementById("telCliente").value,
        WHATSAPP: document.getElementById("telCliente").value,
        EMAIL: document.getElementById("emailCliente").value
      };
      apiPost("insert", "CLIENTES", payload);
      if (typeof closeModal === "function") closeModal("modalCliente");
    });
  }

  // Evento Formulário Moto
  const formMoto = document.getElementById("formMoto");
  if (formMoto) {
    formMoto.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        ID_CLIENTE: document.getElementById("idClienteMoto").value,
        MARCA: document.getElementById("marcaMoto").value,
        MODELO: document.getElementById("modeloMoto").value,
        PLACA: document.getElementById("placaMoto").value,
        KM_ATUAL: document.getElementById("kmMoto").value || 0
      };
      apiPost("insert", "MOTOS", payload);
      if (typeof closeModal === "function") closeModal("modalMoto");
    });
  }
});
