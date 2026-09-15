// ==========================================
// CONFIGURAÇÃO E ESTADO DA APLICAÇÃO
// ==========================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRVwQYCAFaxcqTLhQwLPzXgJGwOWNslWgMUd7sz53nX9DYblu0XiMKNlJxodhLFbYkjA/exec";

const DEFAULT_SERVICOS = [
  { NOME_SERVICO: "Troca de óleo", INTERVALO_DIAS: 90, INTERVALO_KM: 3000, VALOR_SUGERIDO: 80 },
  { NOME_SERVICO: "Troca de filtro de óleo", INTERVALO_DIAS: 90, INTERVALO_KM: 3000 },
  { NOME_SERVICO: "Troca de filtro de ar" },
  { NOME_SERVICO: "Troca de vela" },
  { NOME_SERVICO: "Revisão geral" },
  { NOME_SERVICO: "Troca de pastilhas de freio" },
  { NOME_SERVICO: "Troca de lona de freio" },
  { NOME_SERVICO: "Troca de pneu" },
  { NOME_SERVICO: "Troca de corrente" },
  { NOME_SERVICO: "Troca de relação" },
  { NOME_SERVICO: "Troca de correia" },
  { NOME_SERVICO: "Troca de correia dentada" },
  { NOME_SERVICO: "Troca de bateria" },
  { NOME_SERVICO: "Troca de embreagem" },
  { NOME_SERVICO: "Troca de cabo" },
  { NOME_SERVICO: "Troca de lâmpada" },
  { NOME_SERVICO: "Troca de fluido de freio" },
  { NOME_SERVICO: "Troca de fluido de suspensão" },
  { NOME_SERVICO: "Lubrificação" },
  { NOME_SERVICO: "Limpeza" },
  { NOME_SERVICO: "Manutenção preventiva" },
  { NOME_SERVICO: "Manutenção corretiva" }
];

let state = {
  clientes: [],
  motos: [],
  manutencoes: [],
  retornos: [],
  servicos: DEFAULT_SERVICOS,
  configuracoes: [],
  soundEnabled: true
};

// ==========================================
// INICIALIZAÇÃO E CARREGAMENTO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  registerSW();
});

function saveToLocalStorage() {
  localStorage.setItem('oficina_state', JSON.stringify(state));
}

async function loadData() {
  const localData = localStorage.getItem('oficina_state');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      state = { ...state, ...parsed };
      if (!state.servicos || state.servicos.length === 0) {
        state.servicos = DEFAULT_SERVICOS;
      }
      renderApp();
    } catch (e) {
      console.error("Erro ao ler cache local:", e);
    }
  }

  if (!APPS_SCRIPT_URL) return;

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getAllData`);
    const data = await res.json();
    if (data && !data.error) {
      state = { ...state, ...data };
      if (!state.servicos || state.servicos.length === 0) {
        state.servicos = DEFAULT_SERVICOS;
      }
      saveToLocalStorage();
      renderApp();
    }
  } catch (err) {
    console.error("Erro ao carregar dados do Sheets:", err);
  }
}

// ==========================================
// RENDERIZAÇÃO DA INTERFACE
// ==========================================

function renderApp() {
  renderDashboard();
  renderClientes();
  renderMotos();
  renderRetornos();
  populateDropdowns();
  checkAlerts();
}

function renderDashboard() {
  if (state.configuracoes && state.configuracoes.length > 0) {
    const configOficina = state.configuracoes.find(c => c.PARAMETRO === 'NOME_OFICINA');
    if (configOficina && configOficina.VALOR) {
      const titleElem = document.getElementById('oficina-nome');
      if (titleElem) titleElem.innerText = configOficina.VALOR;
    }
  }

  document.getElementById('kpi-clientes').innerText = state.clientes.length;
  document.getElementById('kpi-motos').innerText = state.motos.length;
  document.getElementById('kpi-manutencoes').innerText = state.manutencoes.length;

  const today = getTodayFormatted();
  const hojeCount = state.retornos.filter(r => formatDateStandard(r.PROXIMO_RETORNO) === today && r.STATUS !== 'CONCLUIDO').length;
  const atrasadosCount = state.retornos.filter(r => isAtrasado(r.PROXIMO_RETORNO) && r.STATUS !== 'CONCLUIDO').length;
  const faturamento = state.manutencoes.reduce((acc, m) => acc + (parseFloat(m.VALOR) || 0), 0);

  document.getElementById('kpi-hoje').innerText = hojeCount;
  document.getElementById('kpi-atrasados').innerText = atrasadosCount;
  document.getElementById('kpi-faturamento').innerText = `R$ ${faturamento.toFixed(2)}`;
}

function renderClientes() {
  const container = document.getElementById('lista-clientes');
  if (!container) return;
  if (state.clientes.length === 0) {
    container.innerHTML = '<p style="padding: 10px; color: #666;">Nenhum cliente cadastrado.</p>';
    return;
  }
  container.innerHTML = state.clientes.map(c => `
    <div class="card">
      <h3>${c.NOME || 'Sem Nome'} (${c.ID_CLIENTE})</h3>
      <p><strong>Tel/Whats:</strong> ${c.WHATSAPP || c.TELEFONE || 'N/A'}</p>
      <p><strong>Cidade:</strong> ${c.CIDADE || 'N/A'} - ${c.UF || ''}</p>
    </div>
  `).join('');
}

function renderMotos() {
  const container = document.getElementById('lista-motos');
  if (!container) return;
  if (state.motos.length === 0) {
    container.innerHTML = '<p style="padding: 10px; color: #666;">Nenhuma moto cadastrada.</p>';
    return;
  }
  container.innerHTML = state.motos.map(m => {
    const cliente = state.clientes.find(c => c.ID_CLIENTE === m.ID_CLIENTE) || {};
    return `
      <div class="card">
        <h3>${m.MARCA || ''} ${m.MODELO || ''} - Placa: ${m.PLACA || 'N/A'}</h3>
        <p><strong>Cliente:</strong> ${cliente.NOME || 'N/A'} | <strong>KM:</strong> ${m.KM_ATUAL || 0}</p>
        <button class="btn-primary" onclick="openNovaManutencao('${m.ID_MOTO}')">+ Manutenção</button>
      </div>
    `;
  }).join('');
}

function renderRetornos() {
  const container = document.getElementById('lista-retornos');
  if (!container) return;
  if (state.retornos.length === 0) {
    container.innerHTML = '<p style="padding: 10px; color: #666;">Nenhum retorno agendado.</p>';
    return;
  }
  container.innerHTML = state.retornos.map(r => {
    const cliente = state.clientes.find(c => c.ID_CLIENTE === r.ID_CLIENTE) || {};
    const moto = state.motos.find(m => m.ID_MOTO === r.ID_MOTO) || {};
    const statusCalculado = getStatusRetorno(r);

    return `
      <div class="card ${statusCalculado.toLowerCase()}">
        <h3>${statusCalculado}: ${cliente.NOME || 'Cliente'}</h3>
        <p><strong>Moto:</strong> ${moto.MARCA || ''} ${moto.MODELO || ''} (${moto.PLACA || ''})</p>
        <p><strong>Serviço:</strong> ${r.SERVICO || ''} | <strong>Data:</strong> ${r.PROXIMO_RETORNO || ''}</p>
        <div style="display:flex; gap:6px; margin-top:8px;">
          <button class="btn-whatsapp" onclick="sendWhatsApp('${r.ID_RETORNO}')">📲 WhatsApp</button>
          <button class="btn-primary" onclick="concluirRetorno('${r.ID_RETORNO}')">✔️ Concluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function populateDropdowns() {
  const selectCli = document.getElementById('moto_ID_CLIENTE');
  if (selectCli) {
    const valAtual = selectCli.value;
    selectCli.innerHTML = '<option value="">Selecione o Cliente</option>' + 
      state.clientes.map(c => `<option value="${c.ID_CLIENTE}">${c.NOME}</option>`).join('');
    if (valAtual) selectCli.value = valAtual;
  }

  const selectSrv = document.getElementById('man_SERVICO');
  if (selectSrv) {
    const valAtual = selectSrv.value;
    const listSrv = state.servicos && state.servicos.length > 0 ? state.servicos : DEFAULT_SERVICOS;
    selectSrv.innerHTML = '<option value="">Selecione o Serviço...</option>' + 
      listSrv.map(s => `<option value="${s.NOME_SERVICO}">${s.NOME_SERVICO}</option>`).join('');
    if (valAtual) selectSrv.value = valAtual;
  }
}

function onServiceSelect(servicoNome) {
  const listSrv = state.servicos && state.servicos.length > 0 ? state.servicos : DEFAULT_SERVICOS;
  const srv = listSrv.find(s => s.NOME_SERVICO === servicoNome);
  if (!srv) return;

  const kmAtual = parseInt(document.getElementById('man_KM_SERVICO').value) || 0;
  if (srv.VALOR_SUGERIDO) document.getElementById('man_VALOR').value = srv.VALOR_SUGERIDO;

  const hoje = new Date();
  if (srv.INTERVALO_DIAS) {
    hoje.setDate(hoje.getDate() + parseInt(srv.INTERVALO_DIAS));
    document.getElementById('man_PROXIMA_DATA_SUGERIDA').value = hoje.toISOString().split('T')[0];
  }
  if (srv.INTERVALO_KM) {
    document.getElementById('man_PROXIMA_KM_SUGERIDA').value = kmAtual + parseInt(srv.INTERVALO_KM);
  }
}

// ==========================================
// BUSCA GLOBAL (NOVA FUNÇÃO)
// ==========================================

function handleSearch(term) {
  const container = document.getElementById('search-results');
  if (!container) return;
  
  if (!term || term.trim() === '') {
    navTo('sec-dashboard');
    return;
  }

  navTo('sec-search');
  const t = term.toLowerCase();

  const clis = state.clientes.filter(c => (c.NOME && c.NOME.toLowerCase().includes(t)) || (c.TELEFONE && c.TELEFONE.includes(t)) || (c.WHATSAPP && c.WHATSAPP.includes(t)));
  const mts = state.motos.filter(m => (m.PLACA && m.PLACA.toLowerCase().includes(t)) || (m.MODELO && m.MODELO.toLowerCase().includes(t)) || (m.MARCA && m.MARCA.toLowerCase().includes(t)));

  let html = '<h3>Clientes Encontrados</h3>';
  html += clis.length ? clis.map(c => `<div class="card"><p><strong>${c.NOME}</strong> - Tel: ${c.WHATSAPP || c.TELEFONE}</p></div>`).join('') : '<p>Nenhum cliente.</p>';

  html += '<h3>Motos Encontradas</h3>';
  html += mts.length ? mts.map(m => `<div class="card"><p><strong>${m.MARCA} ${m.MODELO}</strong> - Placa: ${m.PLACA}</p><button class="btn-primary" onclick="openNovaManutencao('${m.ID_MOTO}')">+ Manutenção</button></div>`).join('') : '<p>Nenhuma moto.</p>';

  container.innerHTML = html;
}

// ==========================================
// OPERAÇÕES DE SALVAMENTO E API
// ==========================================

async function apiPost(action, payload) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: payload })
    });
    console.log(`Enviado para o Sheets: ${action}`);
  } catch (err) {
    console.error(`Erro ao enviar ${action} para o Sheets:`, err);
  }
}

async function saveCliente(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Salvando..."; }

  const nextId = `CLI-${String(state.clientes.length + 1).padStart(4, '0')}`;
  const payload = {
    ID_CLIENTE: nextId,
    DATA_CADASTRO: getTodayFormatted(),
    NOME: document.getElementById('cli_NOME').value || '',
    CPF_CNPJ: document.getElementById('cli_CPF_CNPJ').value || '',
    TELEFONE: document.getElementById('cli_TELEFONE').value || '',
    WHATSAPP: document.getElementById('cli_WHATSAPP').value || '',
    EMAIL: document.getElementById('cli_EMAIL').value || '',
    CEP: document.getElementById('cli_CEP').value || '',
    ENDERECO: document.getElementById('cli_ENDERECO').value || '',
    NUMERO: document.getElementById('cli_NUMERO').value || '',
    BAIRRO: document.getElementById('cli_BAIRRO').value || '',
    CIDADE: document.getElementById('cli_CIDADE').value || '',
    UF: document.getElementById('cli_UF').value || '',
    OBSERVACOES: document.getElementById('cli_OBSERVACOES').value || '',
    STATUS: 'ATIVO'
  };

  state.clientes.push(payload);
  saveToLocalStorage();
  renderApp();

  closeModal('modal-cliente');
  document.getElementById('form-cliente').reset();

  try {
    await apiPost('addCliente', payload);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Salvar Cliente"; }
  }
}

async function saveMoto(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Salvando..."; }

  const nextId = `MOT-${String(state.motos.length + 1).padStart(4, '0')}`;
  const payload = {
    ID_MOTO: nextId,
    ID_CLIENTE: document.getElementById('moto_ID_CLIENTE').value || '',
    DATA_CADASTRO: getTodayFormatted(),
    MARCA: document.getElementById('moto_MARCA').value || '',
    MODELO: document.getElementById('moto_MODELO').value || '',
    ANO: document.getElementById('moto_ANO').value || '',
    COR: document.getElementById('moto_COR').value || '',
    PLACA: document.getElementById('moto_PLACA').value || '',
    CHASSI: document.getElementById('moto_CHASSI').value || '',
    RENAVAM: document.getElementById('moto_RENAVAM').value || '',
    KM_ATUAL: document.getElementById('moto_KM_ATUAL').value || '',
    STATUS: 'ATIVA'
  };

  state.motos.push(payload);
  saveToLocalStorage();
  renderApp();

  closeModal('modal-moto');
  document.getElementById('form-moto').reset();

  try {
    await apiPost('addMoto', payload);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Salvar Moto"; }
  }
}

async function saveManutencao(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Salvando..."; }

  const nextManId = `MAN-${String(state.manutencoes.length + 1).padStart(4, '0')}`;
  const nextRetId = `RET-${String(state.retornos.length + 1).padStart(4, '0')}`;

  const manPayload = {
    ID_MANUTENCAO: nextManId,
    ID_CLIENTE: document.getElementById('man_ID_CLIENTE').value || '',
    ID_MOTO: document.getElementById('man_ID_MOTO').value || '',
    DATA_SERVICO: getTodayFormatted(),
    KM_SERVICO: document.getElementById('man_KM_SERVICO').value || '',
    TIPO_MANUTENCAO: document.getElementById('man_TIPO_MANUTENCAO').value || '',
    SERVICO: document.getElementById('man_SERVICO').value || '',
    PECAS_UTILIZADAS: document.getElementById('man_PECAS_UTILIZADAS').value || '',
    VALOR: document.getElementById('man_VALOR').value || '',
    MECANICO: document.getElementById('man_MECANICO').value || '',
    OBSERVACOES: document.getElementById('man_OBSERVACOES').value || '',
    PROXIMA_DATA_SUGERIDA: formatDateBR(document.getElementById('man_PROXIMA_DATA_SUGERIDA').value),
    PROXIMA_KM_SUGERIDA: document.getElementById('man_PROXIMA_KM_SUGERIDA').value || ''
  };

  const retPayload = {
    ID_RETORNO: nextRetId,
    ID_CLIENTE: manPayload.ID_CLIENTE,
    ID_MOTO: manPayload.ID_MOTO,
    ID_MANUTENCAO: nextManId,
    SERVICO: manPayload.SERVICO,
    DATA_SERVICO: manPayload.DATA_SERVICO,
    PROXIMO_RETORNO: manPayload.PROXIMA_DATA_SUGERIDA,
    PROXIMA_KM: manPayload.PROXIMA_KM_SUGERIDA,
    STATUS: 'AGENDADO',
    CLIENTE_AVISADO: 'NAO'
  };

  state.manutencoes.push(manPayload);
  state.retornos.push(retPayload);
  saveToLocalStorage();
  renderApp();

  closeModal('modal-manutencao');
  document.getElementById('form-manutencao').reset();

  try {
    await apiPost('addManutencao', manPayload);
    await apiPost('addRetorno', retPayload);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Confirmar e Salvar"; }
  }
}

async function concluirRetorno(idRetorno) {
  const ret = state.retornos.find(r => r.ID_RETORNO === idRetorno);
  if (!ret) return;

  ret.STATUS = 'CONCLUIDO';
  ret.DATA_CONCLUSAO = getTodayFormatted();
  saveToLocalStorage();
  renderApp();

  try {
    await apiPost('updateRetornoStatus', { ID_RETORNO: idRetorno, STATUS: 'CONCLUIDO', DATA_CONCLUSAO: ret.DATA_CONCLUSAO });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
  }
}

// ==========================================
// EXPORTAÇÃO E IMPORTAÇÃO (NOVAS FUNÇÕES)
// ==========================================

function exportBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `backup_oficina_${getTodayFormatted().replace(/\//g,'-')}.json`);
  dlAnchor.click();
}

function exportCSV() {
  if (!state.manutencoes.length) {
    alert("Não há dados de manutenções para exportar.");
    return;
  }
  const headers = Object.keys(state.manutencoes[0]).join(",");
  const rows = state.manutencoes.map(m => Object.values(m).map(v => `"${v}"`).join(","));
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `manutencoes_${getTodayFormatted().replace(/\//g,'-')}.csv`);
  document.body.appendChild(link);
  link.click();
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (imported.clientes) {
        state = { ...state, ...imported };
        saveToLocalStorage();
        renderApp();
        alert("Backup restaurado com sucesso!");
      }
    } catch (err) {
      alert("Arquivo de backup inválido.");
    }
  };
  reader.readAsText(file);
}

// ==========================================
// FUNÇÕES UTILITÁRIAS E NAVEGAÇÃO
// ==========================================

function sendWhatsApp(idRetorno) {
  const ret = state.retornos.find(r => r.ID_RETORNO === idRetorno);
  if (!ret) return;
  const cliente = state.clientes.find(c => c.ID_CLIENTE === ret.ID_CLIENTE) || {};
  const moto = state.motos.find(m => m.ID_MOTO === ret.ID_MOTO) || {};
  const oficina = state.configuracoes.find(c => c.PARAMETRO === 'NOME_OFICINA')?.VALOR || 'Oficina';

  const msg = `Olá, ${cliente.NOME || ''}! Tudo bem? Aqui é da ${oficina}. Estamos entrando em contato porque está chegando o período da manutenção da sua ${moto.MARCA || ''} ${moto.MODELO || ''}. Gostaria de agendar seu atendimento?`;
  
  if (cliente.WHATSAPP) {
    window.open(`https://wa.me/${cliente.WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  } else {
    alert("Cliente não possui WhatsApp cadastrado.");
  }
}

function checkAlerts() {
  const temUrgente = state.retornos.some(r => {
    const st = getStatusRetorno(r);
    return st === 'HOJE' || st === 'ATRASADO';
  });

  if (temUrgente && state.soundEnabled) playBeep();
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  const btn = document.getElementById('btn-sound');
  if (btn) btn.innerText = state.soundEnabled ? '🔊 SOM ON' : '🔇 SOM OFF';
}

function navTo(secId) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(secId);
  if (target) target.classList.add('active');

  const activeBtn = document.querySelector(`.bottom-nav button[onclick="navTo('${secId}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function openModal(id) { 
  const modal = document.getElementById(id);
  if (!modal) return;
  populateDropdowns();
  const form = modal.querySelector('form');
  if (form) form.reset();
  modal.classList.add('active'); 
}

function closeModal(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active'); 
}

function getTodayFormatted() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatDateStandard(brDate) {
  if(!brDate) return '';
  const parts = brDate.split('/');
  return parts.length === 3 ? `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2]}` : brDate;
}

function formatDateBR(isoDate) {
  if(!isoDate) return '';
  const parts = isoDate.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusRetorno(r) {
  if (r.STATUS === 'CONCLUIDO') return 'CONCLUIDO';
  const today = getTodayFormatted();
  const dateRet = formatDateStandard(r.PROXIMO_RETORNO);
  if (dateRet === today) return 'HOJE';
  if (isAtrasado(r.PROXIMO_RETORNO)) return 'ATRASADO';
  return 'AGENDADO';
}

function isAtrasado(dateStr) {
  if(!dateStr) return false;
  const parts = dateStr.split('/');
  if(parts.length !== 3) return false;
  const d = new Date(parts[2], parts[1]-1, parts[0]);
  const today = new Date();
  today.setHours(0,0,0,0);
  return d < today;
}

function openNovaManutencao(idMoto) {
  const moto = state.motos.find(m => m.ID_MOTO === idMoto);
  if (!moto) return;
  document.getElementById('man_ID_CLIENTE').value = moto.ID_CLIENTE || '';
  document.getElementById('man_ID_MOTO').value = moto.ID_MOTO || '';
  document.getElementById('man_KM_SERVICO').value = moto.KM_ATUAL || '';
  document.getElementById('man_info_moto').innerText = `${moto.MARCA || ''} ${moto.MODELO || ''} - Placa: ${moto.PLACA || ''}`;
  openModal('modal-manutencao');
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
