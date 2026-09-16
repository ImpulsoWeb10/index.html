// URL da API publicada no Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfnoPvMwYaBIVFKUeP13u0bWtY7oIMPzB51NC4cdBX6pwWQXESwG1fiJ36G0Z01t43pA/exec";

const output = document.getElementById("output");
let osAtual = null; // Armazena a O.S. aberta no momento

function showOutput(data) {
  if (output) {
    output.textContent = typeof data === "object" ? JSON.stringify(data, null, 2) : data;
  }
}

// Requisição GET (Leitura)
async function apiGet(action, table = "", extraParams = "") {
  showOutput("Consultando API...");
  try {
    let url = `${APPS_SCRIPT_URL}?action=${action}`;
    if (table) url += `&table=${table}`;
    if (extraParams) url += `&${extraParams}`;

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

// Requisição POST (Inserção e Atualização)
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

// Carrega lista de clientes nos Selects
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

// Carrega as motos do cliente selecionado
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

// Carrega a lista de Ordens de Serviço para o Modal de Gerenciamento
async function carregarListaOS() {
  const selectOS = document.getElementById("selectListaOS");
  if (!selectOS) return;

  selectOS.innerHTML = '<option value="">Carregando Ordens de Serviço...</option>';
  const res = await apiGet("list", "ORDENS");

  if (res && res.success && res.data) {
    if (res.data.length === 0) {
      selectOS.innerHTML = '<option value="">Nenhuma O.S. cadastrada</option>';
      return;
    }
    selectOS.innerHTML = '<option value="">Selecione uma O.S. *</option>';
    res.data.forEach(os => {
      const option = document.createElement("option");
      option.value = os.ID_OS;
      option.textContent = `${os.ID_OS} - Status: ${os.STATUS || 'EM ABERTO'}`;
      option.style.backgroundColor = "#121a2b";
      option.style.color = "#ffffff";
      selectOS.appendChild(option);
    });
  } else {
    selectOS.innerHTML = '<option value="">Erro ao carregar Ordens de Serviço</option>';
  }
}

// Abre os detalhes completos de uma O.S.
async function abrirDetalhesOS() {
  const idOS = document.getElementById("selectListaOS").value;
  if (!idOS) {
    alert("Selecione uma Ordem de Serviço!");
    return;
  }

  const res = await apiGet("get", "ORDENS", `id=${idOS}`);
  if (res && res.success && res.data) {
    osAtual = res.data;
    closeModal("modalGerenciarOS");
    
    // Preenche cabeçalho
    const infoHeader = document.getElementById("infoOSHeader");
    infoHeader.innerHTML = `
      <p><strong>Nº O.S.:</strong> ${osAtual.ID_OS}</p>
      <p><strong>Cliente:</strong> ${osAtual.ID_CLIENTE}</p>
      <p><strong>Moto:</strong> ${osAtual.ID_MOTO}</p>
      <p><strong>Status:</strong> <span class="badge-status status-andamento">${osAtual.STATUS || 'EM ABERTO'}</span></p>
      <p style="margin-top: 5px;"><strong>Defeito Relatado:</strong> ${osAtual.DEFEITO || 'Não informado'}</p>
    `;

    document.getElementById("novoStatusOS").value = osAtual.STATUS || "EM ABERTO";

    // Carrega itens gravados na tabela ITENS_OS
    await carregarItensDaOS(osAtual.ID_OS);

    openModal("modalDetalhesOS");
  } else {
    alert("Erro ao buscar detalhes da O.S.");
  }
}

// Carrega itens/peças pertencentes a uma O.S.
async function carregarItensDaOS(idOS) {
  const tbody = document.getElementById("tbodyItensOS");
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Buscando itens...</td></tr>';

  const res = await apiGet("list", "ITENS_OS");
  let total = 0;

  if (res && res.success && res.data) {
    const itensFiltrados = res.data.filter(item => String(item.ID_OS) === String(idOS));

    if (itensFiltrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum item lançado.</td></tr>';
    } else {
      tbody.innerHTML = "";
      itensFiltrados.forEach(item => {
        const qtd = Number(item.QUANTIDADE || 1);
        const valor = Number(item.VALOR_UNITARIO || 0);
        const subtotal = qtd * valor;
        total += subtotal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.DESCRICAO}</td>
          <td>${qtd}</td>
          <td>R$ ${valor.toFixed(2)}</td>
          <td>R$ ${subtotal.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } else {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Erro ao carregar itens.</td></tr>';
  }

  document.getElementById("valorTotalOS").textContent = `Total: R$ ${total.toFixed(2)}`;
}

// Salva a alteração do Status da O.S.
async function salvarStatusOS() {
  if (!osAtual) return;
  const novoStatus = document.getElementById("novoStatusOS").value;

  const payload = {
    ...osAtual,
    STATUS: novoStatus
  };

  const res = await apiPost("update", "ORDENS", payload);
  if (res && res.success) {
    osAtual.STATUS = novoStatus;
    alert("Status atualizado com sucesso!");
    abrirDetalhesOS(); // Recarrega
  } else {
    alert("Erro ao atualizar status.");
  }
}

// Imprimir O.S.
function imprimirOS() {
  const conteudo = document.getElementById("printArea").innerHTML;
  const win = window.open("", "", "height=700,width=900");
  win.document.write("<html><head><title>Imprimir O.S.</title>");
  win.document.write("<style>");
  win.document.write(`
    body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
    h2, h4 { color: #000; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f2f2f2; }
  `);
  win.document.write("</style></head><body>");
  win.document.write(conteudo);
  win.document.write("</body></html>");
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

// Gatilho executado ao abrir modais
window.onModalOpen = function(modalId) {
  if (modalId === "modalMoto") {
    carregarClientesNoSelect("idClienteMoto");
  } else if (modalId === "modalOS") {
    carregarClientesNoSelect("idClienteOS");
  } else if (modalId === "modalGerenciarOS") {
    carregarListaOS();
  }
};

// Eventos e Formulários
document.addEventListener("DOMContentLoaded", () => {
  const btnPing = document.getElementById("btnPing");
  const btnClientes = document.getElementById("btnClientes");
  const btnMotos = document.getElementById("btnMotos");
  const btnServicos = document.getElementById("btnServicos");

  if (btnPing) btnPing.addEventListener("click", () => apiGet("ping"));
  if (btnClientes) btnClientes.addEventListener("click", () => apiGet("list", "CLIENTES"));
  if (btnMotos) btnMotos.addEventListener("click", () => apiGet("list", "MOTOS"));
  if (btnServicos) btnServicos.addEventListener("click", () => apiGet("list", "SERVICOS"));

  const idClienteOS = document.getElementById("idClienteOS");
  if (idClienteOS) {
    idClienteOS.addEventListener("change", (e) => carregarMotosDoCliente(e.target.value));
  }

  // Cadastro de Cliente
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

  // Cadastro de Moto
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

  // Cadastro de O.S.
  const formOS = document.getElementById("formOS");
  if (formOS) {
    formOS.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        ID_CLIENTE: document.getElementById("idClienteOS").value,
        ID_MOTO: document.getElementById("idMotoOS").value,
        DEFEITO: document.getElementById("defeitoOS").value,
        STATUS: "EM ABERTO",
        DATA_ABERTURA: new Date().toLocaleDateString("pt-BR")
      };
      await apiPost("insert", "ORDENS", payload);
      formOS.reset();
      closeModal("modalOS");
    });
  }

  // Adicionar Peça / Serviço na O.S.
  const formAdicionarItem = document.getElementById("formAdicionarItem");
  if (formAdicionarItem) {
    formAdicionarItem.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!osAtual) return;

      const payload = {
        ID_OS: osAtual.ID_OS,
        DESCRICAO: document.getElementById("descItem").value,
        QUANTIDADE: document.getElementById("qtdItem").value,
        VALOR_UNITARIO: document.getElementById("valorItem").value
      };

      await apiPost("insert", "ITENS_OS", payload);
      formAdicionarItem.reset();
      await carregarItensDaOS(osAtual.ID_OS);
    });
  }
});
