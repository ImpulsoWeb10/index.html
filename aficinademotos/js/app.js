// URL da API publicada no Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfnoPvMwYaBIVFKUeP13u0bWtY7oIMPzB51NC4cdBX6pwWQXESwG1fiJ36G0Z01t43pA/exec";

const output = document.getElementById("output");

function showOutput(data) {
  if (output) {
    output.textContent = typeof data === "object" ? JSON.stringify(data, null, 2) : data;
  }
}

// Funções de Controle dos Modais
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    if (modalId === "modalMoto" || modalId === "modalOS") {
      carregarClientesNoSelect(modalId === "modalMoto" ? "idClienteMoto" : "idClienteOS");
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

// Torna as funções globais para o onclick dos botões HTML
window.openModal = openModal;
window.closeModal = closeModal;

// Requisição GET (Leitura)
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
    return data;
  } catch (error) {
    showOutput("Erro na consulta GET: " + error.message);
    return null;
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
    return data;
  } catch (error) {
    showOutput("Erro na gravação POST: " + error.message);
    return null;
  }
}

// Preenche o Select com a lista de Clientes do banco de dados
async function carregarClientesNoSelect(selectId) {
  const selectCliente = document.getElementById(selectId);
  if (!selectCliente) return;

  selectCliente.innerHTML = '<option value="">Buscando clientes...</option>';
  
  const res = await apiGet("list", "CLIENTES");
  if (res && res.success && res.data) {
    selectCliente.innerHTML = '<option value="">Selecione o Cliente *</option>';
    res.data.forEach(cliente => {
      const option = document.createElement("option");
      option.value = cliente.ID_CLIENTE;
      option.textContent = `${cliente.NOME} (${cliente.ID_CLIENTE})`;
      option.style.backgroundColor = "#121a2b";
      option.style.color = "#ffffff";
      selectCliente.appendChild(option);
    });
  } else {
    selectCliente.innerHTML = '<option value="">Erro ao carregar clientes</option>';
  }
}

// Carrega as Motas filtradas do Cliente selecionado (para o Modal de OS)
async function carregarMotosDoCliente(idCliente) {
  const selectMoto = document.getElementById("idMotoOS");
  if (!selectMoto) return;

  if (!idCliente) {
    selectMoto.innerHTML = '<option value="">Selecione primeiro o cliente...</option>';
    return;
  }

  selectMoto.innerHTML = '<option value="">Buscando motos...</option>';
  const res = await apiGet("list", "MOTOS");
  
  if (res && res.success && res.data) {
    const motosFiltradas = res.data.filter(m => String(m.ID_CLIENTE) === String(idCliente));
    if (motosFiltradas.length === 0) {
      selectMoto.innerHTML = '<option value="">Nenhuma moto cadastrada para este cliente</option>';
      return;
    }
    selectMoto.innerHTML = '<option value="">Selecione a Moto *</option>';
    motosFiltradas.forEach(moto => {
      const option = document.createElement("option");
      option.value = moto.ID_MOTO;
      option.textContent = `${moto.MARCA} ${moto.MODELO} - Placa: ${moto.PLACA}`;
      option.style.backgroundColor = "#121a2b";
      option.style.color = "#ffffff";
      selectMoto.appendChild(option);
    });
  } else {
    selectMoto.innerHTML = '<option value="">Erro ao carregar motos</option>';
  }
}

// Inicialização dos Eventos
document.addEventListener("DOMContentLoaded", () => {
  const btnPing = document.getElementById("btnPing");
  const btnClientes = document.getElementById("btnClientes");
  const btnMotos = document.getElementById("btnMotos");
  const btnServicos = document.getElementById("btnServicos");

  if (btnPing) btnPing.addEventListener("click", () => apiGet("ping"));
  if (btnClientes) btnClientes.addEventListener("click", () => apiGet("list", "CLIENTES"));
  if (btnMotos) btnMotos.addEventListener("click", () => apiGet("list", "MOTOS"));
  if (btnServicos) btnServicos.addEventListener("click", () => apiGet("list", "SERVICOS"));

  // Evento no Select de Cliente do Modal de O.S. (carrega motos do cliente)
  const idClienteOS = document.getElementById("idClienteOS");
  if (idClienteOS) {
    idClienteOS.addEventListener("change", (e) => {
      carregarMotosDoCliente(e.target.value);
    });
  }

  // Evento Cadastro de Cliente
  const formCliente = document.getElementById("formCliente");
  if (formCliente) {
    formCliente.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        NOME: document.getElementById("nomeCliente").value,
        CPF_CNPJ: document.getElementById("cpfCliente").value,
        TELEFONE: document.getElementById("telCliente").value,
        WHATSAPP: document.getElementById("telCliente").value,
        EMAIL: document.getElementById("emailCliente").value
      };
      await apiPost("insert", "CLIENTES", payload);
      formCliente.reset();
      closeModal("modalCliente");
    });
  }

  // Evento Cadastro de Moto
  const formMoto = document.getElementById("formMoto");
  if (formMoto) {
    formMoto.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        ID_CLIENTE: document.getElementById("idClienteMoto").value,
        MARCA: document.getElementById("marcaMoto").value,
        MODELO: document.getElementById("modeloMoto").value,
        PLACA: document.getElementById("placaMoto").value,
        KM_ATUAL: document.getElementById("kmMoto").value || 0
      };
      await apiPost("insert", "MOTOS", payload);
      formMoto.reset();
      closeModal("modalMoto");
    });
  }

  // Evento Cadastro de O.S.
  const formOS = document.getElementById("formOS");
  if (formOS) {
    formOS.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        ID_CLIENTE: document.getElementById("idClienteOS").value,
        ID_MOTO: document.getElementById("idMotoOS").value,
        DEFEITO: document.getElementById("defeitoOS").value,
        STATUS: "Em Aberto",
        DATA_ABERTURA: new Date().toLocaleDateString("pt-BR")
      };
      await apiPost("insert", "OS", payload);
      formOS.reset();
      closeModal("modalOS");
    });
  }
});
