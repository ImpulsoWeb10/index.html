const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz3S6rIlAZNn2FSd1Ld6BaFwDT3VyeAuSPNZNn1TtrHZ1bRzEdPJ5FOHFpvOscr8iz_fA/exec";

let state = {
  clientes: [],
  motos: [],
  manutencoes: [],
  retornos: [],
  servicos: [],
  configuracoes: [],
  soundEnabled: true
};

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  registerSW();
});

async function loadData() {
  if (!APPS_SCRIPT_URL) return;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getAllData`);
    const data = await res.json();
    state = { ...state, ...data };
    renderApp();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

function renderApp() {
  renderDashboard();
  renderClientes();
  renderMotos();
  renderRetornos();
  populateDropdowns();
  checkAlerts();
}

function renderDashboard() {
  const configOficina = state.configuracoes.find(c => c.PARAMETRO === 'NOME_OFICINA');
  if (configOficina && configOficina.VALOR) {
    document.getElementById('oficina-nome').innerText = configOficina.VALOR;
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
  container.innerHTML = state.clientes.map(c => `
    <div class="card">
      <h3>${c.NOME || 'Sem Nome'} (${c.ID_CLIENTE})</h3>
      <p>Tel/Whats: ${c.WHATSAPP || c.TELEFONE || 'N/A'}</p>
      <button class="btn-secondary" onclick="viewClienteHistory('${c.ID_CLIENTE}')">Ver Histórico</button>
    </div>
  `).join('');
}

function renderMotos() {
  const container = document.getElementById('lista-motos');
  if (!container) return;
  container.innerHTML = state.motos.map(m => {
    const cliente = state.clientes.find(c => c.ID_CLIENTE === m.ID_CLIENTE) || {};
    return `
      <div class="card">
        <h3>${m.MARCA || ''} ${m.MODELO || ''} - Placa: ${m.PLACA || ''}</h3>
        <p>Cliente: ${cliente.NOME || 'N/A'} | KM: ${m.KM_ATUAL || 0}</p>
        <button class="btn-primary" onclick="openNovaManutencao('${m.ID_MOTO}')">+ Manutenção</button>
        <button class="btn-secondary" onclick="viewMotoHistory('${m.ID_MOTO}')">Histórico Moto</button>
      </div>
    `;
  }).join('');
}

function renderRetornos() {
  const container = document.getElementById('lista-retornos');
  if (!container) return;
  container.innerHTML = state.retornos.map(r => {
    const cliente = state.clientes.find(c => c.ID_CLIENTE === r.ID_CLIENTE) || {};
    const moto = state.motos.find(m => m.ID_MOTO === r.ID_MOTO) || {};
    const statusCalculado = getStatusRetorno(r);

    return `
      <div class="card ${statusCalculado}">
        <h3>${statusCalculado}: ${cliente.NOME || ''}</h3>
        <p>Moto: ${moto.MARCA || ''} ${moto.MODELO || ''} (${moto.PLACA || ''})</p>
        <p>Serviço: ${r.SERVICO || ''} | Data: ${r.PROXIMO_RETORNO || ''}</p>
        <div style="display:flex; gap:6px; margin-top:8px;">
          <button class="btn-whatsapp" onclick="sendWhatsApp('${r.ID_RETORNO}')">📲 WhatsApp</button>
          <button class="btn-primary" onclick="concluirRetorno('${r.ID_RETORNO}')">✔️ Concluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function getStatusRetorno(r) {
  if (r.STATUS === 'CONCLUIDO') return 'CONCLUIDO';
  const today = getTodayFormatted();
  const dateRet = formatDateStandard(r.PROXIMO_RETORNO);
  if (dateRet === today) return 'HOJE';
  if (isAtrasado(r.PROXIMO_RETORNO)) return 'ATRASADO';
  return 'AGENDADO';
}

function onServiceSelect(servicoNome) {
  const srv = state.servicos.find(s => s.NOME_SERVICO === servicoNome);
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

// SALVAR CLIENTE (CORRIGIDO)
async function saveCliente(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Salvando...";
  }

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

  try {
    await apiPost('addCliente', payload);
    state.clientes.push(payload);
    closeModal('modal-cliente');
    document.getElementById('form-cliente').reset();
    renderApp();
  } catch (err) {
    console.error("Erro ao salvar cliente:", err);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Salvar Cliente";
    }
  }
}

// SALVAR MOTO
async function saveMoto(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Salvando...";
  }

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

  try {
    await apiPost('addMoto', payload);
    state.motos.push(payload);
    closeModal('modal-moto');
    document.getElementById('form-moto').reset();
    renderApp();
  } catch (err) {
    console.error("Erro ao salvar moto:", err);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Salvar Moto";
    }
  }
}

// SALVAR MANUTENÇÃO
async function saveManutencao(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Salvando...";
  }

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

  try {
    await apiPost('addManutencao', manPayload);
    await apiPost('addRetorno', retPayload);

    state.manutencoes.push(manPayload);
    state.retornos.push(retPayload);

    closeModal('modal-manutencao');
    document.getElementById('form-manutencao').reset();
    renderApp();
  } catch (err) {
    console.error("Erro ao salvar manutenção:", err);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Confirmar e Salvar";
    }
  }
}

// ENVIO DE DADOS (COM SUPORTE NO-CORS CORRIGIDO)
async function apiPost(action, payload) {
  return fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
}

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
  const target = document.getElementById(secId);
  if (target) target.classList.add('active');
}

function openModal(id) { 
  const modal = document.getElementById(id);
  if (!modal) return;
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

function populateDropdowns() {
  const selectCli = document.getElementById('moto_ID_CLIENTE');
  if (selectCli) {
    selectCli.innerHTML = '<option value="">Selecione o Cliente</option>' + 
      state.clientes.map(c => `<option value="${c.ID_CLIENTE}">${c.NOME}</option>`).join('');
  }

  const selectSrv = document.getElementById('man_SERVICO');
  if (selectSrv) {
    selectSrv.innerHTML = '<option value="">Selecione o Serviço</option>' + 
      state.servicos.map(s => `<option value="${s.NOME_SERVICO}">${s.NOME_SERVICO}</option>`).join('');
  }
}

function exportBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `backup_oficina_${getTodayFormatted().replace(/\//g,'-')}.json`);
  dlAnchor.click();
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
