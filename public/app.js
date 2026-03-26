// ProtocoloBrasil — app.js
// Toda lógica de frontend; chama /api/chat, /api/log, /api/analytics

// ── CONFIG ──
// Em produção estas URLs são relativas (mesmo domínio Vercel)
const API = {
  chat:      '/api/chat',
  log:       '/api/log',
  analytics: '/api/analytics',
};

// ── STATE ──
let user    = {};
let conv    = [];
let myHist  = [];
let anData  = null;   // cache do analytics
let expData = null;   // cache do export
let filters = { br: true, pc: true, il: true, ra: true };
let busy    = false;

// ── STORAGE local (só para histórico pessoal) ──
function lsGet(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ── SPLASH / INIT ──
async function init() {
  const steps = [
    { t: 'Carregando 112 PCDTs CONITEC/MS...', p: 40 },
    { t: 'Iniciando ProtocoloBrasil...', p: 80 },
  ];
  for (const s of steps) {
    document.getElementById('spst').textContent = s.t;
    document.getElementById('spf').style.width  = s.p + '%';
    await sl(300);
  }
  // Testa conectividade ao banco com timeout de 3s — não trava se falhar
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(API.analytics + '?limit=1', { signal: controller.signal });
    clearTimeout(timeout);
    const d = await r.json();
    document.getElementById('dbstat').textContent =
      `${d.total || 0} consultas · ${d.medicos || 0} médicos · ${d.estados || 0} estados`;
    document.getElementById('hlive').textContent = `${d.total || 0} consultas`;
  } catch {
    document.getElementById('dbstat').textContent = 'Pronto para uso';
    document.getElementById('hlive').textContent = 'Online';
  }
  document.getElementById('spf').style.width = '100%';
  await sl(200);
  document.getElementById('splash').classList.add('gone');
  document.getElementById('ob').classList.add('show');
}

const sl = ms => new Promise(r => setTimeout(r, ms));

// ── ONBOARDING ──
function entrar() {
  const n = gi('onome'), c = gi('ocrm'), u = gi('ouf'), e = gi('oesp');
  if (!n || !c || !u || !e) { toast('Preencha todos os campos.', ''); return; }
  const tipo = gi('otipo') || 'CRM';
  user = { nome: n, crm: c, uf: u, esp: e, tipo_registro: tipo };
  const prefixoNome = tipo === 'COREN' ? /^Enf[a]?\.?\s*/i : /^Dr[a]?\.?\s*/i;
  const ini = n.replace(prefixoNome, '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('uav').textContent  = ini;
  document.getElementById('ulbl').textContent = `${tipo}-${u} ${c}`;
  const prefixo = tipo === 'COREN' ? /^Enf[a]?\.?\s*/i : /^Dr[a]?\.?\s*/i;
  document.getElementById('wcn').textContent = n.replace(prefixo, '').split(' ')[0];
  document.getElementById('ob').classList.remove('show');
  myHist = lsGet(`pb_hist_${c}`) || [];
  renderH(myHist);
  renderCat();
  // Reconstrói a tela de boas-vindas com sugestões corretas para a especialidade
  renderWelcome();
  toast('Bem-vindo(a), ' + n.replace(/^Dr[a]?\.?\s*/i,'').split(' ')[0] + '!', 'ok');
}
function gi(id) { return (document.getElementById(id)?.value || '').trim(); }

function atualizarTipoRegistro() {
  const tipo = gi('otipo');
  const lbl = document.getElementById('lbl-registro');
  const inp = document.getElementById('ocrm');
  const nomePlaceholder = document.getElementById('onome');
  if (tipo === 'CRM') {
    lbl.textContent = 'Número do CRM';
    inp.placeholder = '000000';
    nomePlaceholder.placeholder = 'Dr(a). Nome Sobrenome';
  } else if (tipo === 'RMS') {
    lbl.textContent = 'Número do RMS';
    inp.placeholder = 'RMS-000000';
    nomePlaceholder.placeholder = 'Dr(a). Nome Sobrenome';
  } else if (tipo === 'COREN') {
    lbl.textContent = 'Número do COREN';
    inp.placeholder = 'COREN-000000';
    nomePlaceholder.placeholder = 'Enf(a). Nome Sobrenome';
  }
}

// ── ADMIN AUTH ──
// Para trocar a senha: gere o SHA256 da sua senha em: https://emn178.github.io/online-tools/sha256.html
// Senha atual: admin123 — TROQUE ANTES DE PUBLICAR
const ADMIN_HASH = '5641e3f5c46432b1bf043cf93eaf3736feddb207177aaf2efb6f19c942558e65';
let adminUnlocked = false;

async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function checkAdmin() {
  if (adminUnlocked) return true;
  const pwd = prompt('\u{1F512} Área restrita — senha do administrador:');
  if (!pwd) return false;
  const hash = await sha256(pwd);
  if (hash === ADMIN_HASH) { adminUnlocked = true; return true; }
  toast('Senha incorreta.', 'err');
  return false;
}

// ── NAV ──
function goPage(id, btn) {
  if (id === 'analytics' || id === 'export') {
    checkAdmin().then(ok => {
      if (!ok) return;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
      document.getElementById('pg-' + id).classList.add('on');
      btn.classList.add('on');
      if (id === 'analytics') loadAnalytics();
      if (id === 'export')    loadExport();
    });
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('pg-' + id).classList.add('on');
  btn.classList.add('on');
}

// ── FILTERS ──
function togF(k) {
  filters[k] = !filters[k];
  document.getElementById('fp-' + k).classList.toggle('on', filters[k]);
}

// ── HISTORY (localStorage) ──
function renderH(arr) {
  const el = document.getElementById('hlist');
  if (!arr?.length) { el.innerHTML = '<div style="padding:10px;font-size:11px;color:var(--ink4);text-align:center">Sem consultas ainda</div>'; return; }
  el.innerHTML = arr.map((h, i) => `
    <div class="h-item${i === 0 ? ' on' : ''}" onclick="loadSess(${i})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px">
        <div class="hi-t" style="flex:1">${esc(h.titulo || '')}</div>
        <button class="del-btn" onclick="event.stopPropagation();delSess(${i})" title="Excluir consulta">×</button>
      </div>
      <div class="hi-m">${h.data} · ${h.uf}</div>
      <span class="hi-tag t${h.tipo || 'p'}">${{ k: 'PCDT', i: 'Intl', r: 'Raro', e: 'Estratégico', p: 'Protocolo' }[h.tipo || 'p'] || 'Protocolo'}</span>
    </div>`).join('');
}

function delSess(i) {
  myHist.splice(i, 1);
  lsSet(`pb_hist_${user.crm}`, myHist);
  renderH(myHist);
  // Se deletou a sessão atual, limpa o chat
  if (i === 0) newChat();
}
function filterH(q) { renderH(myHist.filter(h => (h.titulo || '').toLowerCase().includes(q.toLowerCase()))); }
function loadSess(i) {
  conv = myHist[i].msgs || [];
  document.getElementById('msgs').innerHTML = '';
  conv.forEach(m => { if (m.role === 'user') addU(m.content, false); else addAI(m.content, false); });
}
function saveSession(q, tipo) {
  const s = { id: Date.now(), titulo: q.slice(0, 52), data: new Date().toLocaleDateString('pt-BR'), tipo, msgs: conv, crm: user.crm, uf: user.uf, esp: user.esp };
  myHist.unshift(s);
  lsSet(`pb_hist_${user.crm}`, myHist.slice(0, 60));
  renderH(myHist);
}

// ── LOG QUERY (Supabase via Edge Function) ──
function extrairMedicamentos(resposta) {
  const meds = [];
  // Lista de medicamentos conhecidos
  const medsList = [
    'Adalimumabe','Etanercepte','Infliximabe','Certolizumabe','Golimumabe',
    'Abatacepte','Tocilizumabe','Rituximabe','Belimumabe','Anifrolumabe',
    'Baricitinibe','Tofacitinibe','Upadacitinibe','Secuquinumabe','Ixequizumabe',
    'Ustecinumabe','Guselcumabe','Rissanquizumabe','Natalizumabe','Ocrelizumabe',
    'Ofatumumabe','Fingolimode','Dimetilfumarato','Teriflunomida','Alentuzumabe',
    'Cladribina','Nusinersena','Risdiplam','Onasemnogene','Mepolizumabe',
    'Benralizumabe','Dupilumabe','Omalizumabe','Sacubitril','Dapagliflozina',
    'Empagliflozina','Evolocumabe','Tafamidis','Patisirana','Vutrisirana',
    'Trastuzumabe','Pertuzumabe','Palbociclibe','Ribociclibe','Abemaciclibe',
    'Olaparibe','Enzalutamida','Abiraterona','Darolutamida','Bevacizumabe',
    'Cetuximabe','Bortezomibe','Lenalidomida','Daratumumabe','Pomalidomida',
    'Voxelotor','Crizanlizumabe','Hidroxiureia','Emicizumabe','Vedolizumabe',
    'Risanquizumabe','Dupilumabe','Denosumabe','Teriparatida','Romosozumabe',
    'Liraglutida','Semaglutida','Ivabradina','Canabidiol','Lacosamida','Perampanel',
    'Budesonida','Fluticasona','Beclometasona','Formoterol','Umeclidínio',
    'Vilanterol','Glicopirrônio','Roflumilaste','Sofosbuvir','Velpatasvir',
    'Glecaprevir','Pibrentasvir','Dolutegravir','Tenofovir','Cabotegravir',
    'Rilpivirina','Bedaquilina','Linezolida','Clofazimina','Imiglicerase',
    'Agalsidase','Migalastate','Alglicosidase','Avalglicosidase','Laronidase',
    'Octreotida','Lanreotida','Pasireotida','Pegvisomanto','Leuprorrelina',
    'Icatibanto','Lanadelumabe','Deferasirox','Azacitidina','Eltrombopague',
    'Romiplostim','Ranibizumabe','Aflibercept','Bevacizumabe','Apixabana',
    'Rivaroxabana','Dabigatrana',
    // Combinações DPOC
    'Furoato de Fluticasona','Dipropionato de Beclometasona',
  ];
  
  const respostaUpper = resposta;
  medsList.forEach(med => {
    if (resposta.toLowerCase().includes(med.toLowerCase()) && !meds.includes(med)) {
      meds.push(med);
    }
  });
  
  return meds.slice(0, 10); // máximo 10 medicamentos por consulta
}

async function logQ(q, tipo, intl, resposta = '') {
  try {
    const medicamentos = resposta ? extrairMedicamentos(resposta) : [];
    await fetch(API.log, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        crm: user.crm, uf: user.uf, esp: user.esp, 
        query: q.slice(0, 100), tipo, intl,
        medicamentos: medicamentos.length ? medicamentos : null
      }),
    });
    document.getElementById('sync').textContent = 'Sincronizado ✓';
  } catch {
    document.getElementById('sync').textContent = 'Erro de sync';
  }
}

// ── CATALOG ──
let catArea = 'all';
function renderCat(q = '') {
  const tabs = document.getElementById('cattabs');
  if (!tabs.children.length) {
    const all = document.createElement('div');
    all.className = 'ctab on'; all.textContent = 'Todas';
    all.onclick = () => { catArea = 'all'; document.querySelectorAll('.ctab').forEach(t => t.classList.remove('on')); all.classList.add('on'); renderCat(document.getElementById('catq').value); };
    tabs.appendChild(all);
    const areas = [...new Set(Object.values(PCDT_DB).map(v => v.area.split('/')[0]))].sort();
    areas.forEach(a => {
      const t = document.createElement('div'); t.className = 'ctab'; t.textContent = a;
      t.onclick = () => { catArea = a; document.querySelectorAll('.ctab').forEach(x => x.classList.remove('on')); t.classList.add('on'); renderCat(document.getElementById('catq').value); };
      tabs.appendChild(t);
    });
  }
  const ql = q.toLowerCase();
  const f = Object.entries(PCDT_DB).filter(([k, v]) => {
    const mq = !ql || k.includes(ql) || v.area.toLowerCase().includes(ql);
    const ma = catArea === 'all' || v.area.includes(catArea);
    return mq && ma;
  });
  document.getElementById('pcdt-g').innerHTML = f.map(([k, v]) => {
    const name = k.replace(/\b\w/g, c => c.toUpperCase());
    const cl   = v.comp.includes('CEAF') ? 'ceaf' : v.comp.includes('Est') ? 'est' : 'bas';
    const bc   = v.comp.includes('CEAF') ? 'cc'   : v.comp.includes('Est') ? 'ce'  : 'cb';
    return `<div class="pc-chip ${cl}" onclick="askAbout('${k}')">
      <div class="pc-n">${name}</div>
      <div class="pc-area">${v.area}</div>
      <span class="pc-comp ${bc}">${v.comp}</span>
    </div>`;
  }).join('');
}
function filterCat(q) { renderCat(q); }
function askAbout(key) {
  newChat();
  goPage('chat', document.querySelectorAll('.nav-btn')[0]);
  const name = key.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  document.getElementById('cin').value = `Quais os critérios do PCDT de ${name} para medicamentos de alto custo no SUS? Detalhe os critérios específicos por medicamento e oriente o preenchimento do LME.`;
  send();
}

// ── CHAT ──
function useS(el) { document.getElementById('cin').value = el.dataset.query || el.querySelector('.sugg-t').textContent; send(); }
function aH(el)   { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }
function onK(e)   { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

function addU(txt, sc = true) {
  document.getElementById('wlc')?.remove();
  const cm  = document.getElementById('msgs');
  const ini = user.nome ? user.nome.replace(/^Dr[a]?\.?\s*/i, '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'MD';
  const r   = document.createElement('div'); r.className = 'm-row user';
  r.innerHTML = `<div class="m-av u">${ini}</div><div class="m-bub">${esc(txt)}</div>`;
  cm.appendChild(r); if (sc) cm.scrollTop = cm.scrollHeight;
}
function addAI(txt, sc = true) {
  const cm = document.getElementById('msgs');
  const r  = document.createElement('div'); r.className = 'm-row ai';

  // Detecta se a resposta envolve PCDT/alto custo para oferecer LME
  const isPCDT = /crit[eé]rios|LME|componente|CEAF|portaria|medicamento|SUS|dispensação/i.test(txt);
  const lmeBtn = isPCDT ? `
    <div class="followup-bar">
      <button class="followup-btn" onclick="askLME()">📝 Gerar rascunho do LME</button>
      <button class="followup-btn" onclick="askCriteria()">🔍 Detalhar critérios por medicamento</button>
      <button class="followup-btn" onclick="askDocs()">📋 Documentos necessários</button>
    </div>` : `
    <div class="followup-bar">
      <button class="followup-btn" onclick="askFollowup()">💬 Aprofundar esse tema</button>
      <button class="followup-btn" onclick="askAlternative()">🔄 Ver protocolo completo</button>
    </div>`;

  r.innerHTML = `<div class="m-av ai">🩺</div><div class="m-bub">${mdR(txt)}${lmeBtn}</div>`;
  cm.appendChild(r); if (sc) cm.scrollTop = cm.scrollHeight;
}

function askLME() {
  sendLME();
}

async function sendLME() {
  if (busy) return;
  busy = true; document.getElementById('sbtn').disabled = true;
  addU('📝 Gerando rascunho do LME...');

  // Extrai o medicamento e diagnóstico diretamente da última resposta da IA
  const lastAI = conv.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
  const lastUser = conv.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  const lmePrompt = `Com base EXCLUSIVAMENTE na última resposta sobre o caso clínico abaixo, gere o LME.
ATENÇÃO: Use SOMENTE o diagnóstico e medicamento que foi discutido nesta conversa. NÃO use exemplos de outras doenças.

ÚLTIMA PERGUNTA DO MÉDICO: ${lastUser.slice(0, 300)}

ÚLTIMA RESPOSTA SOBRE O CASO: ${lastAI.slice(0, 800)}

Responda SOMENTE com JSON válido, sem texto antes ou depois:
{"cid10":"código CID-10 da doença discutida","diagnostico":"nome da doença discutida","medicamento1":"nome genérico completo + dose + forma farmacêutica do medicamento recomendado na resposta acima","medicamento2":"segundo medicamento se houver combinação, senão vazio","qtd_mensal":"quantidade por mês conforme posologia","anamnese":"resumo do caso: diagnóstico, dados clínicos fornecidos (VEF1, scores, etc), tratamentos prévios, justificativa do medicamento conforme PCDT","tratamento_previo":"Sim ou Não — descreva tratamentos anteriores se houver","documentos":"espirometria pós-BD; laudo médico; cartão SUS; RG/CPF (liste os específicos da doença)","observacoes":"critérios do PCDT que o paciente preenche conforme discutido"}`;

  try {
    const res = await fetch(API.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'Você é um assistente médico. Leia atentamente o contexto fornecido e responda APENAS com JSON válido. O JSON deve refletir EXATAMENTE a doença e medicamento discutidos no contexto, nunca use exemplos de outras doenças.',
        messages: [{ role: 'user', content: lmePrompt }]
      }),
    });

    let raw = '';
    const ct = res.headers.get('content-type') || '';

    if (ct.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const dec = new TextDecoder(); let buf = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { const e = JSON.parse(line.slice(6)); if (e.text) raw += e.text; } catch {}
        }
      }
    } else {
      const data = await res.json();
      raw = data.consolidated_text || (data.content||[]).map(b=>b.text||'').join('');
    }

    // Parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON não encontrado');
    const d = JSON.parse(jsonMatch[0]);
    gerarLMEpdf(d);

  } catch(e) {
    addAI('❌ Erro ao gerar LME. Tente novamente ou descreva mais detalhes do caso.');
    console.error(e);
  }
  busy = false;
  document.getElementById('sbtn').disabled = false;
}

function gerarLMEpdf(d) {
  window._lmeData = d; // store for relatório and receita
  const hoje = new Date().toLocaleDateString('pt-BR');

  // Remove existing LME modal if present
  const existing = document.getElementById('lme-modal');
  if (existing) existing.remove();

  // Build modal overlay inside the page — no popup needed
  const modal = document.createElement('div');
  modal.id = 'lme-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:800;background:rgba(0,0,0,0.6);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px;';

  const tratPrevioSim = d.tratamento_previo && !d.tratamento_previo.toLowerCase().startsWith('n');

  modal.innerHTML = `
<div style="background:white;width:min(780px,98%);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);font-family:Arial,sans-serif;font-size:9px;color:#000;position:relative">

  <!-- TOOLBAR -->
  <div style="background:#004D43;color:white;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-family:'Plus Jakarta Sans',sans-serif;">
    <div style="font-size:13px;font-weight:700">📋 Rascunho do LME — ProtocoloBrasil</div>
    <div style="display:flex;gap:8px">
      <button onclick="imprimirLME()" style="padding:6px 14px;background:#18C4B0;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
      <button onclick="document.getElementById('lme-modal').remove()" style="padding:6px 14px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer">✕ Fechar</button>
    </div>
  </div>

  <!-- AVISO RASCUNHO -->
  <div style="background:#fff3cd;border-bottom:1px solid #ffc107;padding:7px 14px;font-size:11px;color:#856404;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;">
    ⚠️ RASCUNHO — Preencha os campos em amarelo antes de imprimir e assinar
  </div>

  <!-- FORMULÁRIO LME -->
  <div id="lme-form" style="padding:10px 14px;">

    <!-- CABEÇALHO OFICIAL -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:3px">
      <tr>
        <td style="width:60px;border:none;padding:2px;vertical-align:middle">
          <div style="background:#1351B4;color:white;font-size:14px;font-weight:900;padding:4px 6px;letter-spacing:-1px">SUS</div>
        </td>
        <td style="border:none;text-align:center;vertical-align:middle">
          <div style="font-size:7.5px;color:#333">Sistema Único de Saúde — Ministério da Saúde — Secretaria de Estado da Saúde</div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase">Componente Especializado da Assistência Farmacêutica</div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase">Laudo de Solicitação, Avaliação e Autorização de Medicamento(s)</div>
          <div style="font-size:8.5px;font-weight:700;text-transform:uppercase">Solicitação de Medicamento(s)</div>
        </td>
      </tr>
    </table>
    <div style="background:#000;color:white;font-size:8px;font-weight:700;padding:2px 5px;text-transform:uppercase;margin-bottom:3px">Campos de Preenchimento Exclusivo pelo Médico Solicitante</div>

    <!-- CAMPOS 1 e 2 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px;width:28%">
          <div style="font-size:7.5px;color:#555">1- Número do CNES <span style="color:red">*</span></div>
          <input contenteditable="true" style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Digite o CNES">
        </td>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">2- Nome do estabelecimento de saúde solicitante</div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Nome do estabelecimento">
        </td>
      </tr>
    </table>

    <!-- CAMPOS 3, 5, 6 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">3- Nome completo do Paciente <span style="color:red">*</span></div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Nome completo do paciente">
        </td>
        <td style="border:1px solid #666;padding:3px 5px;width:15%">
          <div style="font-size:7.5px;color:#555">5- Peso <span style="color:red">*</span></div>
          <input style="width:80%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="00"> kg
        </td>
        <td style="border:1px solid #666;padding:3px 5px;width:15%">
          <div style="font-size:7.5px;color:#555">6- Altura <span style="color:red">*</span></div>
          <input style="width:80%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="000"> cm
        </td>
      </tr>
    </table>

    <!-- CAMPO 4 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">4- Nome da Mãe do Paciente <span style="color:red">*</span></div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Nome da mãe do paciente">
        </td>
      </tr>
    </table>

    <!-- CAMPO 7 — MEDICAMENTOS -->
    <div style="font-size:8px;font-weight:700;margin-bottom:1px">7- Medicamento(s) <span style="color:red">*</span> &nbsp; <span style="font-size:7.5px;font-weight:400;color:#555">8- Quantidade solicitada</span></div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px;font-size:8px">
      <thead>
        <tr style="background:#e8e8e8">
          <th style="border:1px solid #666;padding:2px 4px;width:20px">#</th>
          <th style="border:1px solid #666;padding:2px 4px">Medicamento (nome genérico, dose, forma farmacêutica)</th>
          <th style="border:1px solid #666;padding:2px 3px;width:38px">1º mês</th>
          <th style="border:1px solid #666;padding:2px 3px;width:38px">2º mês</th>
          <th style="border:1px solid #666;padding:2px 3px;width:38px">3º mês</th>
          <th style="border:1px solid #666;padding:2px 3px;width:38px">4º mês</th>
          <th style="border:1px solid #666;padding:2px 3px;width:38px">5º mês</th>
          <th style="border:1px solid #666;padding:2px 3px;width:38px">6º mês</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border:1px solid #666;padding:2px 4px;text-align:center">1</td>
          <td style="border:1px solid #666;padding:1px 4px"><input style="width:100%;border:none;font-size:8.5px;font-weight:600;background:transparent;outline:none" value="${d.medicamento1||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value="${d.qtd_mensal||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value="${d.qtd_mensal||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value="${d.qtd_mensal||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value="${d.qtd_mensal||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value="${d.qtd_mensal||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value="${d.qtd_mensal||''}"></td>
        </tr>
        <tr>
          <td style="border:1px solid #666;padding:2px 4px;text-align:center">2</td>
          <td style="border:1px solid #666;padding:1px 4px"><input style="width:100%;border:none;font-size:8.5px;background:transparent;outline:none" value="${d.medicamento2||''}"></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value=""></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value=""></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value=""></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value=""></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value=""></td>
          <td style="border:1px solid #666;padding:1px 3px"><input style="width:100%;border:none;font-size:8px;text-align:center;background:transparent;outline:none" value=""></td>
        </tr>
        ${[3,4,5,6].map(n=>`<tr><td style="border:1px solid #666;padding:2px 4px;text-align:center">${n}</td>${Array(7).fill('<td style="border:1px solid #666;padding:1px 4px"><input style="width:100%;border:none;font-size:8px;background:transparent;outline:none" value=""></td>').join('')}</tr>`).join('')}
      </tbody>
    </table>

    <!-- CAMPOS 9 e 10 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px;width:20%">
          <div style="font-size:7.5px;color:#555">9- CID-10 <span style="color:red">*</span></div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;font-size:9px;font-weight:700;padding:1px;outline:none;background:transparent" value="${d.cid10||''}">
        </td>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">10- Diagnóstico</div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;font-size:9px;font-weight:600;padding:1px;outline:none;background:transparent" value="${d.diagnostico||''}">
        </td>
      </tr>
    </table>

    <!-- CAMPO 11 — ANAMNESE -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555;margin-bottom:2px">11- Anamnese <span style="color:red">*</span></div>
          <textarea style="width:100%;border:none;font-size:8.5px;line-height:1.5;resize:vertical;min-height:60px;outline:none;background:transparent;font-family:Arial">${d.anamnese||''}</textarea>
        </td>
      </tr>
    </table>

    <!-- CAMPO 12 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555;margin-bottom:2px">12- Paciente realizou tratamento prévio ou está em tratamento da doença? <span style="color:red">*</span></div>
          <label style="margin-right:12px;font-size:8.5px"><input type="radio" name="trat_previo" ${!tratPrevioSim?'checked':''}> NÃO</label>
          <label style="font-size:8.5px"><input type="radio" name="trat_previo" ${tratPrevioSim?'checked':''}> SIM. Relatar:</label>
          <textarea style="width:100%;border:none;border-bottom:1px solid #aaa;font-size:8.5px;resize:vertical;min-height:24px;outline:none;background:transparent;font-family:Arial;margin-top:2px">${tratPrevioSim?d.tratamento_previo:''}</textarea>
        </td>
      </tr>
    </table>

    <!-- CAMPO 13 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:8px;font-weight:700;margin-bottom:2px">13- Atestado de capacidade <span style="color:red">*</span></div>
          <div style="font-size:7.5px;color:#444;margin-bottom:3px">A solicitação do medicamento deverá ser realizada pelo paciente. O paciente é considerado incapaz?</div>
          <label style="margin-right:12px;font-size:8.5px"><input type="radio" name="incapaz" checked> NÃO</label>
          <label style="font-size:8.5px"><input type="radio" name="incapaz"> SIM. Nome do responsável: <input style="border:none;border-bottom:1px solid #aaa;font-size:8.5px;width:180px;outline:none;background:#fffde7" placeholder="Nome do responsável"></label>
        </td>
      </tr>
    </table>

    <!-- CAMPOS 14, 15, 16 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">14- Nome do médico solicitante <span style="color:red">*</span></div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Nome do médico">
        </td>
        <td style="border:1px solid #666;padding:3px 5px;width:30%">
          <div style="font-size:7.5px;color:#555">15- CNS do médico solicitante <span style="color:red">*</span></div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Número CNS">
        </td>
        <td style="border:1px solid #666;padding:3px 5px;width:20%">
          <div style="font-size:7.5px;color:#555">16- Data da solicitação <span style="color:red">*</span></div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;font-size:9px;padding:1px;outline:none;background:transparent" value="${hoje}">
        </td>
      </tr>
    </table>

    <!-- CAMPO 17 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px;height:40px">
          <div style="font-size:7.5px;color:#555">17- Assinatura e carimbo do médico <span style="color:red">*</span></div>
        </td>
      </tr>
    </table>

    <!-- CAMPO 18 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:8px;font-weight:700;margin-bottom:2px">18- Campos abaixo preenchidos por <span style="color:red">*</span>:</div>
          <label style="margin-right:10px;font-size:8.5px"><input type="checkbox"> Paciente</label>
          <label style="margin-right:10px;font-size:8.5px"><input type="checkbox"> Mãe do paciente</label>
          <label style="margin-right:10px;font-size:8.5px"><input type="checkbox"> Responsável (descrito no item 13)</label>
          <label style="font-size:8.5px"><input type="checkbox"> Médico solicitante</label>
          <div style="margin-top:3px;font-size:8px">Outro, informar nome: <input style="border:none;border-bottom:1px solid #aaa;width:160px;outline:none;background:#fffde7;font-size:8px" placeholder="Nome"> e CPF <input style="border:none;border-bottom:1px solid #aaa;width:100px;outline:none;background:#fffde7;font-size:8px" placeholder="CPF"></div>
        </td>
      </tr>
    </table>

    <!-- CAMPOS 19, 20, 21, 22, 23 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <tr>
        <td style="border:1px solid #666;padding:3px 5px;width:40%">
          <div style="font-size:7.5px;color:#555;margin-bottom:2px">19- Raça/Cor/Etnia <span style="color:red">*</span></div>
          <label style="margin-right:8px;font-size:8px"><input type="checkbox"> Branca</label>
          <label style="margin-right:8px;font-size:8px"><input type="checkbox"> Preta</label>
          <label style="margin-right:8px;font-size:8px"><input type="checkbox"> Parda</label>
          <label style="margin-right:8px;font-size:8px"><input type="checkbox"> Amarela</label>
          <label style="font-size:8px"><input type="checkbox"> Indígena. Etnia: <input style="border:none;border-bottom:1px solid #aaa;width:80px;outline:none;font-size:8px;background:#fffde7"></label>
        </td>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">20- Telefone(s) para contato do paciente</div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="Telefone">
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555;margin-bottom:2px">21- Número do documento do paciente</div>
          <label style="margin-right:8px;font-size:8px"><input type="checkbox"> CPF</label>
          <label style="margin-right:8px;font-size:8px"><input type="checkbox"> CNS</label>
          <input style="border:none;border-bottom:1px solid #aaa;width:120px;outline:none;background:#fffde7;font-size:9px" placeholder="Número">
        </td>
        <td style="border:1px solid #666;padding:3px 5px">
          <div style="font-size:7.5px;color:#555">22- Correio eletrônico do paciente</div>
          <input style="width:100%;border:none;border-bottom:1px solid #aaa;background:#fffde7;font-size:9px;padding:1px;outline:none" placeholder="E-mail do paciente">
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border:1px solid #666;padding:3px 5px;height:30px">
          <div style="font-size:7.5px;color:#555">23- Assinatura do responsável pelo preenchimento <span style="color:red">*</span></div>
        </td>
      </tr>
    </table>

    <div style="font-size:7.5px;text-align:center;margin:2px 0;color:#333">* CAMPOS DE PREENCHIMENTO OBRIGATÓRIO</div>
    <div style="font-size:7.5px;text-align:center;color:red">Para suporte, entre em contato pelo: ceaf.daf@saude.gov.br</div>

    ${d.documentos ? `
    <div style="margin-top:6px;border:1px solid #1351B4;border-radius:4px;padding:5px 8px;background:#f0f4ff">
      <div style="font-size:8.5px;font-weight:700;color:#1351B4;margin-bottom:3px">📋 DOCUMENTOS OBRIGATÓRIOS A ANEXAR (conforme PCDT)</div>
      <div style="font-size:8.5px;line-height:1.7">${d.documentos.split(';').map(doc => doc.trim() ? '• ' + doc.trim() : '').filter(Boolean).join('<br>')}</div>
    </div>` : ''}

    ${d.observacoes ? `
    <div style="margin-top:4px;border:1px solid #006B5E;border-radius:4px;padding:5px 8px;background:#f0faf8">
      <div style="font-size:8.5px;font-weight:700;color:#006B5E;margin-bottom:2px">✓ CRITÉRIOS DO PCDT ATENDIDOS PELO PACIENTE</div>
      <div style="font-size:8.5px;line-height:1.6">${d.observacoes}</div>
    </div>` : ''}

    <div style="margin-top:6px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:5px 8px;font-size:8px;color:#856404;font-family:'Plus Jakarta Sans',sans-serif">
      <strong>RASCUNHO ProtocoloBrasil</strong> — Gerado em ${hoje} — Campos em amarelo devem ser preenchidos pelo médico. Verifique todos os dados antes de assinar e entregar ao paciente.
    </div>

  </div><!-- /lme-form -->
</div>`;

  document.body.appendChild(modal);

  // Add buttons to open report and prescription
  const btnsDoc = document.createElement('div');
  btnsDoc.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding:10px 14px;border-top:1px solid var(--ln);background:#f8fcfc;';
  btnsDoc.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:var(--teal);width:100%;margin-bottom:4px">📦 Outros documentos do pacote CEAF:</div>
    <button onclick="gerarRelatorioMedico(window._lmeData)" style="padding:7px 14px;background:#EBF9F8;border:1.5px solid var(--teal2);border-radius:8px;font-size:12px;font-weight:600;color:var(--teal);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">📄 Relatório Médico</button>
    <button onclick="gerarReceita(window._lmeData)" style="padding:7px 14px;background:#EBF9F8;border:1.5px solid var(--teal2);border-radius:8px;font-size:12px;font-weight:600;color:var(--teal);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">📋 Receita (2 vias)</button>
  `;
  document.getElementById('lme-modal')?.querySelector('#lme-form')?.after(btnsDoc) || 
  document.getElementById('lme-modal')?.appendChild(btnsDoc);

  addAI('✅ **Pacote de documentos CEAF gerado!**\n\n📋 **LME** — formulário apareceu na tela\n📄 **Relatório Médico** — clique no botão abaixo do LME\n📋 **Receita em 2 vias** — clique no botão abaixo do LME\n\n⚠️ Preencha os campos em amarelo antes de imprimir e assinar.');
}

function gerarRelatorioMedico(d) {
  if (!d) { toast('Gere o LME primeiro.', ''); return; }
  const hoje = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const existing = document.getElementById('rel-modal'); if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'rel-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:803;background:rgba(0,0,0,0.65);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px;';
  modal.innerHTML = `<div style="background:white;width:min(700px,98%);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);font-family:Arial,sans-serif;">
    <div style="background:#004D43;color:white;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-family:'Plus Jakarta Sans',sans-serif;">
      <div style="font-size:13px;font-weight:700">📄 Relatório Médico — ProtocoloBrasil</div>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('rel-modal').querySelector('iframe').contentWindow.print()" style="padding:6px 14px;background:#18C4B0;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
        <button onclick="document.getElementById('rel-modal').remove()" style="padding:6px 14px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer">✕ Fechar</button>
      </div>
    </div>
    <iframe style="width:100%;height:620px;border:none;"></iframe>
  </div>`;
  document.body.appendChild(modal);
  const tratPrev = d.tratamento_previo && !d.tratamento_previo.toLowerCase().startsWith('n') ? d.tratamento_previo : '';
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
@page{size:A4;margin:22mm 18mm;}
body{font-family:Arial,sans-serif;font-size:11px;color:#000;line-height:1.6;margin:0;}
.hdr{text-align:center;border-bottom:2px solid #004D43;padding-bottom:10px;margin-bottom:14px;}
.hdr h1{font-size:15px;color:#004D43;margin:3px 0;}
.hdr p{font-size:9.5px;color:#555;margin:2px 0;}
.sec{font-size:9.5px;font-weight:700;color:#004D43;text-transform:uppercase;margin:12px 0 6px;border-bottom:1px solid #004D43;padding-bottom:2px;}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.fld{margin-bottom:8px;}
.fld label{font-size:8.5px;color:#666;text-transform:uppercase;font-weight:700;display:block;margin-bottom:2px;}
input{width:100%;border:none;border-bottom:1px solid #aaa;font-size:10.5px;outline:none;font-family:Arial;padding:1px 0;}
.edit{background:#fffde7;}
textarea{width:100%;border:1px solid #ccc;border-radius:3px;padding:5px;font-size:10.5px;font-family:Arial;resize:vertical;outline:none;box-sizing:border-box;}
.decl{margin-top:14px;background:#f0faf8;border:1px solid #004D43;border-radius:3px;padding:7px 10px;font-size:9.5px;color:#004D43;}
.assin{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;}
.assin-box{border-top:1px solid #000;padding-top:5px;text-align:center;font-size:9px;margin-top:24px;}
.warn{background:#fff3cd;border-radius:3px;padding:5px 8px;font-size:9px;color:#856404;}
.foot{margin-top:12px;font-size:8.5px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:5px;}
@media print{button,.warn{display:none;}}
</style></head><body>
<div class="hdr"><h1>RELATÓRIO MÉDICO</h1><p>Apoio à solicitação de medicamento — Componente Especializado da Assistência Farmacêutica (CEAF/SUS)</p></div>
<div class="sec">1. Identificação do Profissional</div>
<div class="r3">
  <div class="fld"><label>Nome do médico *</label><input class="edit" placeholder="Nome completo"></div>
  <div class="fld"><label>${user.tipo_registro||'CRM'}/RMS/COREN *</label><input class="edit" placeholder="Número"></div>
  <div class="fld"><label>Especialidade</label><input value="${user.esp||''}"></div>
</div>
<div class="r2">
  <div class="fld"><label>Estabelecimento (CNES)</label><input class="edit" placeholder="Nome — CNES 0000000"></div>
  <div class="fld"><label>UF / Município</label><input value="${user.uf||''}"></div>
</div>
<div class="sec">2. Identificação do Paciente</div>
<div class="r2">
  <div class="fld"><label>Nome completo do paciente *</label><input class="edit" placeholder="Nome completo"></div>
  <div class="fld"><label>Data de nascimento</label><input class="edit" placeholder="DD/MM/AAAA"></div>
</div>
<div class="r3">
  <div class="fld"><label>CPF ou CNS *</label><input class="edit" placeholder="000.000.000-00"></div>
  <div class="fld"><label>CID-10 *</label><input value="${d.cid10||''}"></div>
  <div class="fld"><label>Diagnóstico *</label><input value="${d.diagnostico||''}"></div>
</div>
<div class="sec">3. Histórico Clínico</div>
<div class="fld"><label>Anamnese e evolução clínica *</label><textarea rows="4">${d.anamnese||''}</textarea></div>
<div class="fld"><label>Tratamentos prévios (nome, dose, duração, resposta terapêutica) *</label><textarea rows="3">${tratPrev||'Descrever tratamentos anteriores realizados, dose utilizada, duração e motivo da troca ou falha terapêutica'}</textarea></div>
<div class="sec">4. Medicamento Solicitado e Justificativa</div>
<div class="r2">
  <div class="fld"><label>Medicamento (nome genérico, dose, forma) *</label><input value="${d.medicamento1||''}"></div>
  <div class="fld"><label>Posologia *</label><input class="edit" placeholder="Ex: 40mg SC a cada 2 semanas"></div>
</div>
<div class="fld"><label>Justificativa — critérios do PCDT atendidos *</label><textarea rows="3">${d.observacoes||'Descrever os critérios do PCDT vigente que o paciente preenche para receber este medicamento'}</textarea></div>
<div class="sec">5. Exames e Documentos</div>
<div class="fld"><label>Exames realizados (com datas e resultados)</label><textarea rows="3" placeholder="Ex:
- Espirometria (DD/MM/AAAA): VEF1/CVF 0,65, VEF1 42%
- Hemograma (DD/MM/AAAA): eosinófilos 380/μL
- Rx tórax (DD/MM/AAAA): sem alterações"></textarea></div>
<div class="fld"><label>Documentos obrigatórios a anexar (conforme PCDT)</label><textarea rows="2">${d.documentos ? d.documentos.split(';').filter(x=>x.trim()).map((doc,i)=>(i+1)+'. '+doc.trim()).join('\n') : 'Listar documentos obrigatórios conforme PCDT vigente'}</textarea></div>
<div class="decl">Declaro que as informações acima são verídicas, que o paciente foi devidamente avaliado e que preenche os critérios estabelecidos pelo PCDT vigente para uso do medicamento solicitado.</div>
<div class="assin">
  <div><div class="assin-box">Assinatura e carimbo do profissional</div><div style="text-align:center;font-size:9px;margin-top:4px">Data: ____/____/_______</div></div>
  <div class="warn">⚠️ RASCUNHO ProtocoloBrasil — Verifique todos os campos antes de assinar. Consulte a portaria original em gov.br/saude/pcdt. Gerado em ${hoje}.</div>
</div>
<div class="foot">ProtocoloBrasil v1.0 · Apoio à Decisão Clínica · Dados anonimizados · LGPD</div>
</body></html>`;
  modal.querySelector('iframe').srcdoc = html;
}

function gerarReceita(d) {
  if (!d) { toast('Gere o LME primeiro.', ''); return; }
  const hoje = new Date().toLocaleDateString('pt-BR');
  const existing = document.getElementById('rec-modal'); if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'rec-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:804;background:rgba(0,0,0,0.65);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px;';
  modal.innerHTML = `<div style="background:white;width:min(620px,98%);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
    <div style="background:#004D43;color:white;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-family:'Plus Jakarta Sans',sans-serif;">
      <div style="font-size:13px;font-weight:700">📋 Receita Médica em 2 Vias</div>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('rec-modal').querySelector('iframe').contentWindow.print()" style="padding:6px 14px;background:#18C4B0;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖨️ Imprimir (2 páginas)</button>
        <button onclick="document.getElementById('rec-modal').remove()" style="padding:6px 14px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer">✕ Fechar</button>
      </div>
    </div>
    <iframe style="width:100%;height:560px;border:none;"></iframe>
  </div>`;
  document.body.appendChild(modal);

  // Each via is a full A4 page — separated by page-break
  const viaHTML = (n) => `
<div class="via">
  <div class="via-header">
    <div>
      <div class="titulo">RECEITA MÉDICA</div>
      <div class="subtitulo">Componente Especializado da Assistência Farmacêutica — CEAF/SUS</div>
      <div class="subtitulo" style="color:#c00;font-weight:700">Via ${n}ª de 2 — ${n===1?'Farmácia (reter)':'Paciente (conservar)'}</div>
    </div>
    <div style="text-align:right;font-size:9px;color:#555;">
      Data: <strong>${hoje}</strong><br>
      Validade: 90 dias
    </div>
  </div>

  <div class="secao">DADOS DO PACIENTE</div>
  <div class="grid2">
    <div class="campo"><label>Nome completo do paciente *</label><input class="edit" placeholder="Nome completo"></div>
    <div class="campo"><label>CPF ou CNS *</label><input class="edit" placeholder="000.000.000-00"></div>
  </div>
  <div class="grid3">
    <div class="campo"><label>Data de nascimento</label><input class="edit" placeholder="DD/MM/AAAA"></div>
    <div class="campo"><label>CID-10</label><input value="${d.cid10||''}"></div>
    <div class="campo"><label>Diagnóstico</label><input value="${d.diagnostico||''}"></div>
  </div>

  <div class="secao">PRESCRIÇÃO</div>
  <div class="rp-box">
    <div class="rp-label">Rp.</div>
    <div class="rp-item"><strong>1.</strong> ${d.medicamento1||'_________________________________'}</div>
    ${d.medicamento2 ? `<div class="rp-item"><strong>2.</strong> ${d.medicamento2}</div>` : ''}
    <div class="rp-qtd">Quantidade: ${d.qtd_mensal||'______'} / mês × 6 meses (dispensação semestral no CEAF)</div>
  </div>
  <div class="campo" style="margin-top:8px;">
    <label>Posologia e modo de usar *</label>
    <input class="edit" placeholder="Ex: 1 inalação 1x/dia pela manhã — conforme orientação médica e bula">
  </div>

  <div class="aviso">⚠️ Medicamento de uso exclusivo no CEAF/SUS. Apresentar esta receita junto ao LME, relatório médico e demais documentos obrigatórios conforme PCDT vigente.</div>

  <div class="secao">MÉDICO SOLICITANTE</div>
  <div class="grid2">
    <div class="campo"><label>Nome do médico *</label><input class="edit" placeholder="Nome completo do médico"></div>
    <div class="campo"><label>CRM — número — UF *</label><input class="edit" placeholder="Ex: CRM 123456 SP"></div>
  </div>
  <div class="grid2">
    <div class="campo"><label>Especialidade</label><input value="${user.esp||''}"></div>
    <div class="campo"><label>Estabelecimento (CNES)</label><input class="edit" placeholder="Nome — CNES 0000000"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;align-items:end;">
    <div>
      <div style="height:35px;border-bottom:1px solid #000;"></div>
      <div style="text-align:center;font-size:9px;margin-top:3px;">Assinatura e carimbo do médico</div>
    </div>
    <div style="font-size:8.5px;color:#856404;background:#fff3cd;border-radius:3px;padding:6px 8px;">
      ⚠️ RASCUNHO ProtocoloBrasil · Verifique todos os dados antes de assinar · ${hoje}
    </div>
  </div>
</div>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
@page { size: A4; margin: 18mm 16mm; }
body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }
.via { page-break-after: always; break-after: page; min-height: calc(297mm - 36mm); box-sizing: border-box; padding-bottom: 10mm; }
.via:last-child { page-break-after: avoid; break-after: avoid; }
.via-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004D43; padding-bottom: 8px; margin-bottom: 10px; }
.titulo { font-size: 14px; font-weight: 700; color: #004D43; }
.subtitulo { font-size: 8.5px; color: #555; margin-top: 1px; }
.secao { font-size: 8.5px; font-weight: 700; color: #004D43; text-transform: uppercase; border-bottom: 1px solid #004D43; padding-bottom: 2px; margin: 10px 0 6px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 6px; }
.campo label { display: block; font-size: 8px; color: #666; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
input { width: 100%; border: none; border-bottom: 1px solid #aaa; font-size: 10px; outline: none; font-family: Arial; padding: 1px 0; box-sizing: border-box; }
.edit { background: #fffde7; }
.rp-box { border: 1px solid #ccc; border-radius: 4px; padding: 8px 10px; background: #fafafa; min-height: 65px; }
.rp-label { font-weight: 700; font-size: 10px; color: #004D43; margin-bottom: 4px; }
.rp-item { margin-bottom: 4px; font-size: 10.5px; }
.rp-qtd { margin-top: 6px; font-size: 9px; color: #555; }
.aviso { background: #fff3cd; border-radius: 3px; padding: 5px 8px; font-size: 8.5px; color: #856404; margin: 8px 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
${viaHTML(1)}${viaHTML(2)}
</body></html>`;

  modal.querySelector('iframe').srcdoc = html;
}

function imprimirLME() {
  const d = window._lmeData;
  if (!d) { toast('Gere o LME primeiro.',''); return; }
  const hoje = new Date().toLocaleDateString('pt-BR');

  // Read current values from the form (user may have edited them)
  const fv = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const rc = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : 'NAO'; };
  
  const cnes = fv('lme-cnes') || ''; 
  const estab = fv('lme-estab') || '';
  const paciente = fv('lme-paciente') || '';
  const mae = fv('lme-mae') || '';
  const peso = fv('lme-peso') || '00';
  const altura = fv('lme-altura') || '000';
  const med1 = fv('lme-med1') || d.medicamento1 || '';
  const med2 = fv('lme-med2') || d.medicamento2 || '';
  const qtd = fv('lme-qtd') || d.qtd_mensal || '30';
  const cid = fv('lme-cid') || d.cid10 || '';
  const diag = fv('lme-diag') || d.diagnostico || '';
  const anamnese = fv('lme-anamnese') || d.anamnese || '';
  const tratPrev = rc('tratprev');
  const tratPrevTxt = fv('lme-tratprev-txt') || d.tratamento_previo || '';
  const medico = fv('lme-medico') || user.nome || '';
  const cnsMedico = fv('lme-cns-medico') || '';
  const incapaz = rc('incapaz');
  const responsavel = fv('lme-responsavel') || '';

  const existing = document.getElementById('lme-print-modal');
  if (existing) existing.remove();
  const pm = document.createElement('div');
  pm.id = 'lme-print-modal';
  pm.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px;';
  pm.innerHTML = `<div style="background:white;width:min(860px,98%);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
    <div style="background:#004D43;color:white;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-family:'Plus Jakarta Sans',sans-serif;">
      <div style="font-size:13px;font-weight:700">🖨️ LME — Modelo Oficial MS</div>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('lme-print-modal').querySelector('iframe').contentWindow.print()" style="padding:6px 14px;background:#18C4B0;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
        <button onclick="document.getElementById('lme-print-modal').remove()" style="padding:6px 14px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer">✕ Fechar</button>
      </div>
    </div>
    <div style="background:#f0f0f0;padding:6px 12px;font-size:11px;color:#555;font-family:'Plus Jakarta Sans',sans-serif;">
      💡 Ao imprimir: <strong>Tamanho A4 · Margens mínimas ou nenhuma · Escala 100%</strong>
    </div>
    <iframe style="width:100%;height:720px;border:none;background:white;"></iframe>
  </div>`;
  document.body.appendChild(pm);

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>LME — ${diag}</title>
<style>
@page { size: A4 portrait; margin: 7mm 8mm; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;font-size:7.5px;color:#000;background:white;}
.page{width:100%;max-width:195mm;}
/* Header */
.sus-bar{display:flex;align-items:center;gap:6px;margin-bottom:2px;}
.sus-logo{font-size:18px;font-weight:900;color:#1351B4;letter-spacing:-1px;}
.sus-title{flex:1;}
.sus-title h1{font-size:7px;text-transform:uppercase;font-weight:700;text-align:center;}
.sus-title h2{font-size:7.5px;font-weight:700;text-align:center;text-transform:uppercase;margin-top:1px;}
.sus-title h3{font-size:7px;text-align:center;margin-top:1px;}
.lme-title{text-align:right;font-size:8px;font-weight:700;}
/* Grid fields */
.grid{display:grid;margin-bottom:1px;}
.cell{border:0.5px solid #666;padding:2px 3px;min-height:14px;vertical-align:top;}
.cell-lbl{font-size:6.5px;color:#333;display:block;margin-bottom:1px;font-weight:700;}
.cell-val{font-size:7.5px;font-weight:600;min-height:8px;}
.cell-input{width:100%;border:none;outline:none;font-family:Arial;font-size:7.5px;background:transparent;padding:0;}
textarea.cell-input{resize:none;min-height:30px;display:block;overflow:hidden;}
/* Rows */
.row1{grid-template-columns:60px 1fr 1fr;}
.row-peso{grid-template-columns:1fr 50px 50px;}
.row-med{grid-template-columns:3fr 1fr 1fr 1fr 1fr 1fr 1fr;}
.row-cid{grid-template-columns:80px 1fr;}
.row3{grid-template-columns:1fr 1fr 1fr;}
.row-doc{grid-template-columns:1fr 1fr 1fr 1fr;}
/* Section headers */
.sec{background:#000;color:#fff;font-size:6.5px;font-weight:700;text-transform:uppercase;padding:1px 3px;margin:2px 0 0;}
/* Radio/Checkbox */
.radio-group{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.radio-opt{display:flex;align-items:center;gap:2px;font-size:7.5px;}
.rb{width:9px;height:9px;border:1px solid #555;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;}
.rb.on::after{content:"";width:5px;height:5px;background:#000;border-radius:50%;display:block;}
.cb{width:9px;height:9px;border:1px solid #555;display:inline-flex;align-items:center;justify-content:center;font-size:9px;}
.cb.on::after{content:"✓";font-size:8px;color:#000;}
/* Footer */
.footer-bar{border:0.5px dashed #999;padding:3px 5px;margin-top:2px;font-size:6.5px;color:#555;text-align:center;}
.docs-box{border:0.5px solid #1351B4;border-radius:2px;padding:3px 5px;background:#f0f4ff;margin-top:2px;}
.docs-title{font-size:6.5px;font-weight:700;color:#1351B4;margin-bottom:2px;}
.crit-box{border:0.5px solid #006B5E;border-radius:2px;padding:3px 5px;background:#f0faf8;margin-top:2px;}
.crit-title{font-size:6.5px;font-weight:700;color:#006B5E;margin-bottom:2px;}
.rascunho{background:#fff3cd;border:0.5px solid #ffc107;padding:2px 4px;font-size:6.5px;color:#856404;margin-top:2px;text-align:center;}
@media print{.rascunho{display:block;} body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="page">

<!-- HEADER -->
<div class="sus-bar">
  <div class="sus-logo">SUS</div>
  <div class="sus-title">
    <h1>Sistema Único de Saúde — Ministério da Saúde — Secretaria de Estado da Saúde</h1>
    <h2>Componente Especializado da Assistência Farmacêutica<br>Laudo de Solicitação, Avaliação e Autorização de Medicamento(s)</h2>
    <h3>Solicitação de Medicamento(s)</h3>
  </div>
  <div class="lme-title">LME</div>
</div>
<div style="font-size:6.5px;font-weight:700;text-align:center;border:0.5px solid #000;padding:1px;margin-bottom:2px;">CAMPOS DE PREENCHIMENTO EXCLUSIVO PELO MÉDICO SOLICITANTE</div>

<!-- CAMPOS 1-2: CNES e Estabelecimento -->
<div class="grid row1">
  <div class="cell"><span class="cell-lbl">1- Número do CNES *</span><div class="cell-val">${cnes}</div></div>
  <div class="cell" style="grid-column:span 2"><span class="cell-lbl">2- Nome do estabelecimento de saúde solicitante</span><div class="cell-val">${estab}</div></div>
</div>

<!-- CAMPO 3: Paciente + Peso + Altura -->
<div class="grid row-peso">
  <div class="cell"><span class="cell-lbl">3- Nome completo do Paciente *</span><div class="cell-val">${paciente}</div></div>
  <div class="cell"><span class="cell-lbl">5- Peso *</span><div class="cell-val" style="font-size:11px;text-align:center;">${peso}<br><span style="font-size:7px;">kg</span></div></div>
  <div class="cell"><span class="cell-lbl">6- Altura *</span><div class="cell-val" style="font-size:11px;text-align:center;">${altura}<br><span style="font-size:7px;">cm</span></div></div>
</div>

<!-- CAMPO 4: Mãe -->
<div class="grid">
  <div class="cell"><span class="cell-lbl">4- Nome da Mãe do Paciente *</span><div class="cell-val">${mae}</div></div>
</div>

<!-- CAMPO 7: Medicamentos -->
<div class="sec">7- Medicamento(s) * &nbsp; 8- Quantidade Solicitada</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:1px;">
  <thead>
    <tr style="background:#eee;">
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:18px;">#</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;">Medicamento (nome genérico, dose, forma farmacêutica)</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:35px;">1º mês</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:35px;">2º mês</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:35px;">3º mês</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:35px;">4º mês</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:35px;">5º mês</th>
      <th style="border:0.5px solid #666;padding:1px 2px;font-size:6.5px;width:35px;">6º mês</th>
    </tr>
  </thead>
  <tbody>
    ${[med1, med2, '', '', '', ''].map((m, i) => `<tr>
      <td style="border:0.5px solid #666;padding:1px 2px;text-align:center;">${i+1}</td>
      <td style="border:0.5px solid #666;padding:1px 2px;">${m}</td>
      ${['','','','','',''].map(() => `<td style="border:0.5px solid #666;padding:1px 2px;text-align:center;">${m ? qtd.replace(/[^0-9]/g,'')+(qtd.includes('comprimid')||qtd.includes('cápsula')||qtd.includes('caps')?'':' un') : ''}</td>`).join('')}
    </tr>`).join('')}
  </tbody>
</table>

<!-- CAMPOS 9-10: CID e Diagnóstico -->
<div class="grid row-cid">
  <div class="cell"><span class="cell-lbl">9- CID-10 *</span><div class="cell-val" style="font-size:10px;">${cid}</div></div>
  <div class="cell"><span class="cell-lbl">10- Diagnóstico</span><div class="cell-val">${diag}</div></div>
</div>

<!-- CAMPO 11: Anamnese -->
<div class="cell" style="min-height:45px;margin-bottom:1px;">
  <span class="cell-lbl">11- Anamnese *</span>
  <div style="font-size:7.5px;white-space:pre-wrap;">${anamnese}</div>
</div>

<!-- CAMPO 12: Tratamento prévio -->
<div class="cell" style="margin-bottom:1px;">
  <span class="cell-lbl">12- Paciente realizou tratamento prévio ou está em tratamento da doença? *</span>
  <div class="radio-group" style="margin-top:2px;">
    <div class="radio-opt"><div class="rb ${tratPrev==='NAO'?'on':''}"></div> NÃO</div>
    <div class="radio-opt"><div class="rb ${tratPrev!=='NAO'?'on':''}"></div> SIM. Relatar:</div>
    <div style="flex:1;font-size:7.5px;white-space:pre-wrap;">${tratPrevTxt}</div>
  </div>
</div>

<!-- CAMPO 13: Atestado de capacidade -->
<div class="cell" style="margin-bottom:1px;">
  <span class="cell-lbl">13- Atestado de capacidade *</span>
  <div style="font-size:7px;margin-bottom:2px;">A solicitação do medicamento deverá ser realizada pelo paciente. O paciente é considerado incapaz?</div>
  <div class="radio-group">
    <div class="radio-opt"><div class="rb ${incapaz==='NAO'?'on':''}"></div> NÃO</div>
    <div class="radio-opt"><div class="rb ${incapaz!=='NAO'?'on':''}"></div> SIM. Nome do responsável: <span style="margin-left:4px;font-weight:600;">${responsavel}</span></div>
  </div>
</div>

<!-- CAMPOS 14-16: Médico, CNS, Data -->
<div class="grid row3">
  <div class="cell"><span class="cell-lbl">14- Nome do médico solicitante *</span><div class="cell-val">${medico}</div></div>
  <div class="cell"><span class="cell-lbl">15- CNS do médico solicitante</span><div class="cell-val">${cnsMedico}</div></div>
  <div class="cell"><span class="cell-lbl">16- Data da solicitação *</span><div class="cell-val">${hoje}</div></div>
</div>

<!-- CAMPO 17: Assinatura -->
<div class="cell" style="min-height:22px;margin-bottom:1px;">
  <span class="cell-lbl">17- Assinatura e carimbo do médico *</span>
</div>

<!-- CAMPOS 18-22: Responsável pelo preenchimento -->
<div class="sec">Campos abaixo preenchidos por *:</div>
<div class="cell" style="margin-bottom:1px;">
  <div class="radio-group" style="margin:2px 0;">
    <div class="radio-opt"><div class="cb"></div> Paciente</div>
    <div class="radio-opt"><div class="cb"></div> Mãe do paciente</div>
    <div class="radio-opt"><div class="cb"></div> Responsável (descrito no item 13)</div>
    <div class="radio-opt"><div class="cb on"></div> Médico solicitante</div>
    <div style="font-size:7px;">Outro, informar nome: _____________ e CPF: _____________</div>
  </div>
</div>

<div class="grid row3">
  <div class="cell">
    <span class="cell-lbl">19- Raça/Cor/Etnia *</span>
    <div class="radio-group">
      <div class="radio-opt"><div class="cb"></div> Branca</div>
      <div class="radio-opt"><div class="cb"></div> Preta</div>
      <div class="radio-opt"><div class="cb"></div> Parda</div>
      <div class="radio-opt"><div class="cb"></div> Amarela</div>
    </div>
    <div style="margin-top:1px;font-size:7px;">Indígena. Etnia: _______________</div>
  </div>
  <div class="cell"><span class="cell-lbl">20- Telefone(s) para contato do paciente</span><div style="font-size:7.5px;margin-top:2px;">&nbsp;</div></div>
  <div class="cell"><span class="cell-lbl">22- Correio eletrônico do paciente</span><div style="font-size:7.5px;margin-top:2px;">&nbsp;</div></div>
</div>

<div class="grid row-cid">
  <div class="cell">
    <span class="cell-lbl">21- Número do documento do paciente *</span>
    <div class="radio-group" style="margin-top:2px;">
      <div class="radio-opt"><div class="cb"></div> CPF</div>
      <div class="radio-opt"><div class="cb"></div> CNS</div>
      <div style="font-size:7px;">Número: ___________________</div>
    </div>
  </div>
  <div class="cell"><span class="cell-lbl">23- Assinatura do responsável pelo preenchimento *</span><div style="min-height:14px;"></div></div>
</div>

<div style="font-size:6.5px;text-align:center;color:#c00;margin-top:2px;">* CAMPOS DE PREENCHIMENTO OBRIGATÓRIO &nbsp;&nbsp; Para suporte, entre em contato pelo: ceaf.daf@saude.gov.br</div>

<!-- DOCUMENTOS OBRIGATÓRIOS -->
<div class="docs-box">
  <div class="docs-title">📋 DOCUMENTOS OBRIGATÓRIOS A ANEXAR (conforme PCDT)</div>
  <div style="font-size:7px;">${d.documentos ? d.documentos.split(';').filter(x=>x.trim()).map(doc=>'• '+doc.trim()).join('<br>') : '• laudo médico com CID-10<br>• exames complementares<br>• cartão SUS<br>• RG/CPF<br>• prescrição médica'}</div>
</div>

<!-- CRITÉRIOS -->
<div class="crit-box">
  <div class="crit-title">✓ CRITÉRIOS DO PCDT ATENDIDOS PELO PACIENTE</div>
  <div style="font-size:7px;">${d.observacoes||''}</div>
</div>

<div class="rascunho">RASCUNHO ProtocoloBrasil — Gerado em ${hoje} — Campos em amarelo devem ser preenchidos pelo médico. Verifique todos os dados antes de assinar e entregar ao paciente.</div>

</div>
</body></html>`;

  pm.querySelector('iframe').srcdoc = html;
}

function sendFollowupQ(btn) {
  const q = btn.getAttribute('data-query');
  if (!q) return;
  document.getElementById('cin').value = q;
  send();
}

function askCriteria() {
  document.getElementById('cin').value = `Detalhe os critérios específicos de cada medicamento disponível no SUS para esta condição — para qual perfil de paciente cada um está indicado, contraindicações específicas e exames necessários antes de iniciar cada um.`;
  send();
}
function askDocs() {
  document.getElementById('cin').value = `Liste todos os documentos e exames obrigatórios que precisam ser anexados ao LME para esta solicitação, incluindo validade dos exames e onde obter os formulários.`;
  send();
}
function askFollowup() {
  document.getElementById('cin').value = `Aprofunde mais sobre este tema com informações adicionais relevantes para a prática clínica.`;
  send();
}
function askAlternative() {
  document.getElementById('cin').value = `Mostre o protocolo completo do Ministério da Saúde para esta condição, incluindo fluxograma de diagnóstico e tratamento.`;
  send();
}
function showTyp() {
  const cm = document.getElementById('msgs');
  const r  = document.createElement('div'); r.className = 'typ-w'; r.id = 'typ';
  r.innerHTML = `<div class="m-av ai" style="margin-top:2px">🩺</div><div class="typ-b"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  cm.appendChild(r); cm.scrollTop = cm.scrollHeight;
}
function hideTyp() { document.getElementById('typ')?.remove(); }

function classQ(q) {
  const ql = q.toLowerCase();
  // Doenças raras — classificação específica
  if (/\braro\b|fabry|gaucher|pompe|wilson|\bmps\b|\bame\b|atrofia muscular espinhal|amiloidose|mucopolissacaridose|lipofuscinose|hipoparatireoidismo|angioedema hereditário/.test(ql)) return 'r';
  // Componente Estratégico — infectologia
  if (/\btuberculose\b|\btb\b|\bhiv\b|\baids\b|hepatite [bc]|leishmaniose|hanseníase|malária|esquistossomose|chagas|\biltb\b|\bripe\b|\btarv\b/.test(ql)) return 'e';
  // PCDT/CEAF
  if (/pcdt|sus|ceaf|componente|critério|alto custo|dispensação|lme|portaria/.test(ql)) return 'k';
  return 'p';
}

// ── PROTOCOLOS ESTADUAIS ──
const PROTO_ESTADUAL = {
  "SP": {
    nome: "São Paulo",
    secretaria: "SES-SP",
    farmacia: "CEAF — Farmácias Dose Certa (unidades credenciadas pelo estado)",
    entrega_lme: "Farmácia Dose Certa do município de residência ou polo regional",
    obs_dispensacao: "SP exige cadastro prévio no sistema HYGIA. Documentação via e-SUS ou presencial.",
    protocolos_extras: [
      "Protocolo SP para Hepatite C: inclui genotipagem obrigatória pelo IAL antes de iniciar DAA",
      "Programa Dose Certa SP: distribuição descentralizada — verificar farmácia mais próxima em www.farmaciadosecerta.sp.gov.br",
      "SP possui protocolo próprio para TB-MDR com acompanhamento no Instituto Emílio Ribas e Hospital Nestor Goulart Reis",
      "Oncologia: tratamento via RUTE/CACON/UNACON — encaminhar ao serviço de referência regional",
      "Saúde Mental SP: caps.saude.sp.gov.br — rede CAPS para dispensação de psicofármacos de alto custo"
    ]
  },
  "RJ": {
    nome: "Rio de Janeiro",
    secretaria: "SES-RJ",
    farmacia: "CEAF — Central de Medicamentos do RJ (CEMEFARJ) e farmácias regionais",
    entrega_lme: "CEMEFARJ ou farmácia regional da SES-RJ",
    obs_dispensacao: "RJ: LME deve ser entregue na regional de saúde de referência do município.",
    protocolos_extras: [
      "RJ possui protocolo estadual para HIV com distribuição nas UDMs (Unidades Dispensadoras de Medicamentos)",
      "Hepatite C RJ: triagem e acompanhamento pelos Centros de Referência em DST/AIDS",
      "Oncologia RJ: INCA como referência nacional — encaminhar casos complexos"
    ]
  },
  "MG": {
    nome: "Minas Gerais",
    secretaria: "SES-MG",
    farmacia: "CEAF — Farmácias de Medicamentos Excepcionais (FME)",
    entrega_lme: "FME do município ou macrorregião de saúde (Belo Horizonte, Juiz de Fora, Uberlândia, Montes Claros, etc.)",
    obs_dispensacao: "MG: sistema SISREG para encaminhamento. LME via SISAFAR-MG.",
    protocolos_extras: [
      "MG possui protocolo próprio para doenças raras: NUPAD/UFMG como referência para triagem neonatal ampliada",
      "Protocolo MG para Hepatite C: triagem via Hemocentros regionais (HEMOMINAS)",
      "TB MG: acompanhamento pelos CRTs (Centros de Referência em Tuberculose) regionais"
    ]
  },
  "RS": {
    nome: "Rio Grande do Sul",
    secretaria: "SES-RS",
    farmacia: "CEAF — Assistência Farmacêutica Estadual (AFRS)",
    entrega_lme: "Farmácia estadual de referência ou DAF regional",
    obs_dispensacao: "RS: sistema de dispensação via FARMÁCIA CIDADÃ ESTADUAL e postos regionais.",
    protocolos_extras: [
      "RS possui protocolo estadual para dor crônica com dispensação via CAPS AD",
      "Programa RS para Hepatite C com rastreamento em populações-chave",
      "Oncologia RS: Hospital de Clínicas de Porto Alegre (HCPA) como referência terciária"
    ]
  },
  "BA": {
    nome: "Bahia",
    secretaria: "SES-BA",
    farmacia: "CEAF — CAFAS (Central de Assistência Farmacêutica)",
    entrega_lme: "CAFAS Salvador ou farmácias regionais das 28 regiões de saúde da BA",
    obs_dispensacao: "BA: documentação e LME entregues na DIRES (Diretoria Regional de Saúde) de referência.",
    protocolos_extras: [
      "BA possui alta prevalência de anemia falciforme — protocolo estadual com HEMOBA como referência",
      "Leishmaniose visceral endêmica no BA — acompanhamento pelos CCZ municipais e hospitais de referência",
      "TB BA: programa estadual com acompanhamento pelo LACEN-BA"
    ]
  },
  "PR": {
    nome: "Paraná",
    secretaria: "SESA-PR",
    farmacia: "CEAF — Central de Medicamentos do Paraná (CEMEPAR)",
    entrega_lme: "CEMEPAR Curitiba ou farmácias regionais (22 Regionais de Saúde do PR)",
    obs_dispensacao: "PR: solicitação via SISAFAR-PR. Retirada na regional de saúde do município.",
    protocolos_extras: [
      "PR possui protocolo próprio para saúde do idoso com dispensação priorizada de medicamentos do CEAF",
      "Oncologia PR: Hospital Erasto Gaertner e HC-UFPR como referências estaduais",
      "TB PR: acompanhamento pelo LACEN-PR e pneumologistas das regionais"
    ]
  },
  "PE": {
    nome: "Pernambuco",
    secretaria: "SES-PE",
    farmacia: "CEAF — Assistência Farmacêutica Estadual de PE",
    entrega_lme: "Farmácia de Medicamentos Especializados (FME) da Gerência Regional de Saúde",
    obs_dispensacao: "PE: 12 Gerências Regionais de Saúde (GERES). LME na GERES de referência.",
    protocolos_extras: [
      "PE possui alta incidência de arboviroses — protocolo estadual para dengue/zika/chikungunya",
      "Leishmaniose visceral endêmica no sertão pernambucano",
      "Oncologia PE: IMIP e Hospital de Câncer de Pernambuco como referências"
    ]
  },
  "CE": {
    nome: "Ceará",
    secretaria: "SESA-CE",
    farmacia: "CEAF — Farmácia da Secretaria de Saúde (Núcleo de Assistência Farmacêutica)",
    entrega_lme: "Farmácia Estadual em Fortaleza ou CRES (Coordenadoria Regional de Saúde)",
    obs_dispensacao: "CE: 22 coordenadorias regionais de saúde. Dispensação descentralizada.",
    protocolos_extras: [
      "CE possui protocolo estadual para doenças endêmicas: leishmaniose, esquistossomose, dengue",
      "Alta prevalência de doença de Chagas no CE — protocolo de triagem e tratamento via LACEN-CE"
    ]
  },
  "GO": {
    nome: "Goiás",
    secretaria: "SES-GO",
    farmacia: "CEAF — Superintendência de Assistência Farmacêutica de GO",
    entrega_lme: "Farmácia de Alto Custo nas 18 Regionais de Saúde de GO",
    obs_dispensacao: "GO: sistema E-SAÚDE para solicitação eletrônica do LME em alguns municípios.",
    protocolos_extras: [
      "GO possui protocolo estadual para doença de Chagas — endêmica na região",
      "Oncologia GO: Hospital Araújo Jorge como referência estadual"
    ]
  },
  "SC": {
    nome: "Santa Catarina",
    secretaria: "SES-SC",
    farmacia: "CEAF — DIAF (Diretoria de Assistência Farmacêutica de SC)",
    entrega_lme: "Farmácia Escola UFSC ou farmácias regionais das 16 SDR (Secretarias de Desenvolvimento Regional)",
    obs_dispensacao: "SC: HÓRUS sistema de dispensação estadual. LME eletrônico disponível em alguns municípios.",
    protocolos_extras: [
      "SC possui protocolo integrado para doenças raras com referência no HU-UFSC",
      "Oncologia SC: CEPON (Centro de Pesquisas Oncológicas) como referência estadual"
    ]
  },
  "DF": {
    nome: "Distrito Federal",
    secretaria: "SES-DF",
    farmacia: "CEAF — NAFAR (Núcleo de Assistência Farmacêutica) — dispensação via hospitais da REDE-DF",
    entrega_lme: "Farmácia do hospital de referência da rede SES-DF (HUB, HBDF, HMIB, etc.)",
    obs_dispensacao: "DF: dispensação integrada à rede hospitalar. Solicitar via GDF Saúde.",
    protocolos_extras: [
      "DF possui referência nacional para doenças raras — HBDF e UNB como centros de excelência",
      "Oncologia DF: HBDF (Hospital de Base) como referência primária",
      "DF: acesso a medicamentos via REMUME-DF além do CEAF federal"
    ]
  },
  "MA": {
    nome: "Maranhão",
    secretaria: "SES-MA",
    farmacia: "CEAF — Farmácia Estadual de Medicamentos (FEM-MA) em São Luís e regionais",
    entrega_lme: "FEM-MA em São Luís ou Farmácia Regional nas 19 regiões de saúde do MA",
    obs_dispensacao: "MA: alguns medicamentos biológicos de alta complexidade podem ter disponibilidade limitada ou estar em processo de credenciamento. Verificar disponibilidade na FEM-MA antes de solicitar.",
    protocolos_extras: [
      "MA possui alta prevalência de leishmaniose visceral e tegumentar — referência no HU-UFMA",
      "Esquistossomose endêmica no MA — triagem e tratamento via APS",
      "MA: biológicos de maior complexidade (rituximabe, ocrelizumabe, biológicos para doenças raras) podem ter disponibilidade limitada — verificar estoque na FEM-MA (98) 3218-4100",
      "Em caso de indisponibilidade de biológico: abrir processo administrativo na SES-MA ou acionar Defensoria Pública do Estado",
      "TB MA: acompanhamento pelo LACEN-MA e hospitais de referência em São Luís"
    ]
  },
  "AM": {
    nome: "Amazonas",
    secretaria: "SUSAM",
    farmacia: "CEAF — Gerência de Assistência Farmacêutica do AM",
    entrega_lme: "Farmácia de Alto Custo em Manaus ou municípios do interior via SCTIE regional",
    obs_dispensacao: "AM: acesso dificultado no interior — telemedecina e farmácia itinerante disponíveis.",
    protocolos_extras: [
      "AM possui protocolos específicos para malária — referência no FMT-HVD (Fundação de Medicina Tropical)",
      "Leishmaniose tegumentar endêmica no AM — acompanhamento pelo FMT",
      "AM possui alta prevalência de hepatites virais B e C — triagem prioritária em comunidades ribeirinhas"
    ]
  },
};

// Contatos das Secretarias Estaduais de Saúde para verificação de disponibilidade
// O CEAF é descentralizado — cada estado tem sua própria lista de medicamentos disponíveis
// Fonte: sites oficiais das SES (verificado Mar/2026)
const SES_CONTATOS = {
  "AC": {site:"http://saude.ac.gov.br", farmacia:"DAF/SESACRE — (68) 3223-0210", obs:"Verificar lista no site da SESACRE"},
  "AL": {site:"http://saude.al.gov.br", farmacia:"DAF/SESAU-AL — (82) 3315-1616", obs:"Farmácia Estadual em Maceió"},
  "AP": {site:"http://saude.ap.gov.br", farmacia:"SESA-AP — (96) 3312-1430", obs:"Macapá — verificar disponibilidade local"},
  "AM": {site:"http://susam.am.gov.br", farmacia:"GAFAR/SUSAM — (92) 3182-7009", obs:"Farmácia Estadual Manaus. Interior: acesso limitado a biológicos de alta complexidade"},
  "BA": {site:"http://saude.ba.gov.br", farmacia:"CAFAS/SESAB — (71) 3116-1270", obs:"28 regionais. HEMOBA para hemopatias"},
  "CE": {site:"http://saude.ce.gov.br", farmacia:"NAFE/SESA-CE — (85) 3101-4712", obs:"22 coordenadorias regionais"},
  "DF": {site:"http://saude.df.gov.br", farmacia:"NAFAR/SES-DF — (61) 3346-9050", obs:"Dispensação via hospitais da REDE-DF"},
  "ES": {site:"http://saude.es.gov.br", farmacia:"AFAS/SESA-ES — (27) 3636-7300", obs:"Farmácia Estadual Vitória + regionais"},
  "GO": {site:"http://saude.go.gov.br", farmacia:"SAFAR/SES-GO — (62) 3201-5804", obs:"18 regionais. Sistema E-SAÚDE"},
  "MA": {site:"http://saude.ma.gov.br", farmacia:"FEM-MA/SES-MA — (98) 3218-4100", obs:"Biológicos de alta complexidade: verificar disponibilidade prévia na FEM-MA. Alguns podem estar em processo de credenciamento"},
  "MT": {site:"http://saude.mt.gov.br", farmacia:"AFMT/SES-MT — (65) 3613-7606", obs:"Farmácia Estadual Cuiabá + regionais"},
  "MS": {site:"http://saude.ms.gov.br", farmacia:"DAF/SES-MS — (67) 3318-1550", obs:"Campo Grande + regionais"},
  "MG": {site:"http://saude.mg.gov.br", farmacia:"FME/SES-MG — (31) 3339-9300", obs:"Sistema SISAFAR-MG. HEMOMINAS para hemopatias"},
  "PA": {site:"http://saude.pa.gov.br", farmacia:"DAF/SESPA — (91) 4006-6280", obs:"Belém + regionais. Interior: acesso pode ser limitado"},
  "PB": {site:"http://saude.pb.gov.br", farmacia:"DAF/SES-PB — (83) 3218-8228", obs:"Farmácia Estadual João Pessoa + regionais"},
  "PR": {site:"http://saude.pr.gov.br", farmacia:"CEMEPAR/SESA-PR — (41) 3330-4200", obs:"22 regionais. 96% municípios cobertos. Sistema SISAFAR-PR"},
  "PE": {site:"http://saude.pe.gov.br", farmacia:"GERES/SES-PE — (81) 3184-6300", obs:"12 GERES. Farmácias Especializadas regionais"},
  "PI": {site:"http://saude.pi.gov.br", farmacia:"DAF/SESAPI — (86) 3216-3688", obs:"Teresina + regionais. Verificar disponibilidade de biológicos"},
  "RJ": {site:"http://saude.rj.gov.br", farmacia:"CEMEFARJ/SES-RJ — (21) 2333-7500", obs:"UDMs para HIV. Regionais para demais CEAF"},
  "RN": {site:"http://saude.rn.gov.br", farmacia:"DAF/SESAP-RN — (84) 3232-1500", obs:"Natal + regionais"},
  "RS": {site:"http://saude.rs.gov.br/medicamentos-disponibilizados", farmacia:"DAF/SES-RS — (51) 3288-5800", obs:"316 itens padronizados. Programa de Medicamentos Especiais estadual adicional"},
  "RO": {site:"http://saude.ro.gov.br", farmacia:"DAF/SESAU-RO — (69) 3216-6027", obs:"Porto Velho + regionais. Interior: acesso limitado"},
  "RR": {site:"http://saude.rr.gov.br", farmacia:"DAF/SESAU-RR — (95) 2121-0150", obs:"Boa Vista — verificar disponibilidade de medicamentos de alta complexidade"},
  "SC": {site:"http://saude.sc.gov.br", farmacia:"DIAF/SES-SC — (48) 3665-1600", obs:"Sistema HÓRUS. Farmácias municipais descentralizadas"},
  "SP": {site:"http://saude.sp.gov.br", farmacia:"Farmácia Dose Certa — 0800 722 4848", obs:"Maior rede do Brasil. Sistema HYGIA. www.farmaciadosecerta.sp.gov.br"},
  "SE": {site:"http://saude.se.gov.br", farmacia:"DAF/SES-SE — (79) 3226-7300", obs:"Aracaju + regionais"},
  "TO": {site:"http://saude.to.gov.br", farmacia:"DAF/SES-TO — (63) 3218-1700", obs:"Palmas + regionais. Verificar biológicos de alta complexidade"},
};

// Fallback para estados sem protocolo específico cadastrado
const PROTO_PADRAO = {
  farmacia: "CEAF — Farmácia de Medicamentos Especializados da Secretaria Estadual de Saúde",
  entrega_lme: "Farmácia de Alto Custo da Secretaria Estadual de Saúde ou Regional de Saúde de referência",
  obs_dispensacao: "Consulte a Secretaria Estadual de Saúde para informações sobre disponibilidade local."
};

function buildSys(q) {
  let ctx = '';
  const qn = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(PCDT_DB)) {
    const kn = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (kn.split(/\s+/).some(w => w.length > 3 && qn.includes(w))) {
      let medsTxt = '';
      // Se tiver meds_exatos, usa eles — dados autoritativos por grupo terapêutico
      if (v.meds_exatos) {
        medsTxt = '\nMEDICAMENTOS EXATOS DO SUS (use SOMENTE estes, exatamente como escrito):';
        for (const [grupo, lista] of Object.entries(v.meds_exatos)) {
          medsTxt += `\n  [${grupo}]: ${lista.join(' | ')}`;
        }
      } else {
        medsTxt = `\nMedicamentos SUS: ${v.meds.join(', ')}`;
      }
      ctx += `\n\n[PCDT: ${k.toUpperCase()} | ${v.portaria} | ${v.comp}]${medsTxt}\nCritérios:\n${v.criterios.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    }
  }
  // Injeta contexto do estado do médico
  const uf = user.uf || '';
  const proto = PROTO_ESTADUAL[uf] || PROTO_PADRAO;
  const sesInfo = SES_CONTATOS[uf] || null;
  const estadoCtx = uf ? `
\n\nCONTEXTO ESTADUAL — ${uf} (${proto.nome || uf}):
- Secretaria: ${proto.secretaria || 'SES-' + uf}
- Onde retirar medicamentos do CEAF: ${sesInfo ? sesInfo.farmacia : proto.farmacia}
- Site oficial: ${sesInfo ? sesInfo.site : 'site da SES-' + uf}
- Observação local: ${sesInfo ? sesInfo.obs : proto.obs_dispensacao}
${proto.protocolos_extras ? '- Particularidades estaduais:\n  • ' + proto.protocolos_extras.join('\n  • ') : ''}
- ⚠️ DISPONIBILIDADE ESTADUAL: O CEAF é descentralizado — cada estado define seus medicamentos disponíveis. SEMPRE oriente o médico a confirmar disponibilidade na SES-${uf} antes de solicitar, especialmente para biológicos de alta complexidade recém-incorporados. Em caso de indisponibilidade: orientar abertura de processo administrativo na SES ou acionamento da Defensoria Pública.` : '';

  const fn = Object.entries(filters).filter(([, fv]) => !fv).map(([k]) => k);
  // Detect if this is a follow-up question (conversation already has turns)
  const isFollowUp = conv.filter(m => m.role === 'assistant').length > 0;
  const followUpRule = isFollowUp
    ? `\nREGRA ANTI-REPETIÇÃO: Esta é uma pergunta de acompanhamento. NÃO repita informações já fornecidas na conversa anterior. Seja DIRETO — responda APENAS o que foi perguntado agora, acrescentando somente informações novas.`
    : '';

  return `Você é o ProtocoloBrasil. Assistente clínico para médicos brasileiros.

REGRA CRÍTICA — LEIA ANTES DE RESPONDER:
A seção "BASE DE PCDTs" no final deste prompt contém os dados OFICIAIS e AUTORITATIVOS.
Você DEVE usar EXCLUSIVAMENTE os dados dessa base. Seu conhecimento interno sobre medicamentos é DESATUALIZADO — IGNORE-O.
Se a BASE contiver "NÃO PRESCREVER" ou "NÃO DISPONÍVEL", nunca cite esses itens.

PARA CASOS CLÍNICOS:
1. Leia os dados do paciente
2. Consulte a BASE DE PCDTs abaixo para encontrar o grupo correto
3. Liste APENAS os medicamentos do grupo correto encontrado na BASE
4. Nunca misture medicamentos de grupos diferentes
5. Nunca cite medicamentos da lista "NÃO DISPONÍVEIS" ou "NÃO PRESCREVER"

ESTRUTURA (seja conciso):

## Classificação
[Dados → Grupo segundo PCDT da BASE abaixo]

## Medicamentos Disponíveis no SUS — [nome do grupo]
[Liste APENAS os itens daquele grupo na BASE — nome completo, dose, forma]
**Indicado neste caso:** [qual e por quê]

## Critérios do PCDT
[Inclusão / Exclusão — lista curta]

## Orientação LME
CID: [código] | Medicamento: [nome exato da BASE]
Documentos obrigatórios: [lista]

📄 [Portaria da BASE] [BR]
⚠️ Apoio à decisão — consulte gov.br/saude/pcdt${fn.length ? `\nFILTROS: NÃO usar ${fn.join(', ')}.` : ''}${followUpRule}${estadoCtx}${ctx ? '\n\n════ BASE DE PCDTs — USE EXCLUSIVAMENTE ESTES DADOS ════\n' + ctx : ''}

AO FINAL DE TODA RESPOSTA — OBRIGATÓRIO:
Inclua EXATAMENTE este bloco (não modifique o formato):
<followup>
P1: [pergunta curta e específica sobre o caso clínico — ex: "Deseja calcular a dose pelo peso do paciente?"]
P2: [segunda pergunta relevante — ex: "Quer saber os principais efeitos colaterais desta medicação?"]
P3: [terceira pergunta opcional e específica — ex: "Gostaria de saber os critérios de suspensão do tratamento?"]
</followup>

REGRAS para as perguntas de follow-up:
- Sejam ESPECÍFICAS para o caso discutido, nunca genéricas
- NUNCA sugira "preencher o LME" para doenças do Componente ESTRATÉGICO: tuberculose, HIV/AIDS, hepatite B, hepatite C, leishmaniose, doença de Chagas, malária, hanseníase, esquistossomose e outros do CESAF — esses medicamentos são dispensados diretamente pela rede sem LME
- Para doenças do CEAF (biológicos, reumatologia, neurologia, etc.): pode sugerir LME
- Use 2 perguntas se o caso for simples, 3 se for complexo
- Exemplos válidos: calcular dose por peso, efeitos colaterais, critérios de troca, monitorização, exames de acompanhamento, conduta em falha terapêutica, interações medicamentosas`;
}

async function send() {
  if (busy) return;
  const inp = document.getElementById('cin');
  const txt = inp.value.trim(); if (!txt) return;
  inp.value = ''; inp.style.height = 'auto';
  busy = true; document.getElementById('sbtn').disabled = true;
  addU(txt); conv.push({ role: 'user', content: txt });
  showTyp();
  const tipo = classQ(txt); let intl = false; let fullAns = '';

  try {
    const res = await fetch(API.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: buildSys(txt), messages: conv.map(m => ({ role: m.role, content: m.content })) }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ct = res.headers.get('content-type') || '';

    if (ct.includes('text/event-stream')) {
      hideTyp();
      const cm = document.getElementById('msgs');
      const row = document.createElement('div'); row.className = 'm-row ai';
      const bub = document.createElement('div'); bub.className = 'm-bub';
      bub.innerHTML = '<span class="stream-cursor">▌</span>';
      row.innerHTML = '<div class="m-av ai">🩺</div>';
      row.appendChild(bub); cm.appendChild(row);

      const reader = res.body.getReader();
      const dec = new TextDecoder(); let buf = ''; let streamDone = false;

      function finalizeStream() {
        if (streamDone) return;
        streamDone = true;

        // Extract <followup> block from AI response
        let mainAns = fullAns;
        let followupBtns = '';
        const fuMatch = fullAns.match(/<followup>([\s\S]*?)<\/followup>/i);

        if (fuMatch) {
          mainAns = fullAns.replace(/<followup>[\s\S]*?<\/followup>/i, '').trim();
          const questions = fuMatch[1].trim().split('\n')
            .map(l => l.replace(/^P\d+:\s*/i, '').trim())
            .filter(q => q.length > 3);
          if (questions.length) {
            const qBtns = questions.map(q =>
              `<button class="followup-btn fu-q" onclick="sendFollowupQ(this)" data-query="${q.replace(/"/g,'&quot;')}">${q}</button>`
            ).join('');
            followupBtns = `<div class="followup-bar fu-questions">${qBtns}</div>`;
          }
        }

        // Always add action buttons below
        // Componente Estratégico — não usa LME
        const isEstrategico = /\btuberculose\b|\btb\b|\bhiv\b|\baids\b|\bhepatite\s*[bc]\b|\bleishmaniose\b|\bhanseníase\b|\bhansenÃ­ase\b|\bmalária\b|\besquistossomose\b|\bdoença de chagas\b|\bRIPE\b|\bTARV\b|\bisoniazida\b|\brifampicina\b|\btenofovir\b|\bdolutegravir\b|\bsofosbuvir\b|\banfotericina\b|\bantimoniato\b/i.test(mainAns);
        const isPCDT = !isEstrategico && /crit[eé]rios|LME|componente|CEAF|portaria|medicamento|SUS|tratamento|dose|paciente/i.test(mainAns);
        const actionBtns = isEstrategico
          ? `<div class="followup-bar"><button class="followup-btn" onclick="askCriteria()">🔍 Critérios do protocolo</button><button class="followup-btn" onclick="askDocs()">📋 Documentos necessários</button><button class="followup-btn" onclick="askFollowup()">💬 Aprofundar tema</button></div>`
          : isPCDT
          ? `<div class="followup-bar"><button class="followup-btn" onclick="askLME()">📝 Gerar rascunho do LME</button><button class="followup-btn" onclick="askCriteria()">🔍 Critérios por medicamento</button><button class="followup-btn" onclick="askDocs()">📋 Documentos necessários</button></div>`
          : `<div class="followup-bar"><button class="followup-btn" onclick="askFollowup()">💬 Aprofundar tema</button><button class="followup-btn" onclick="askAlternative()">🔄 Protocolo completo MS</button></div>`;

        bub.innerHTML = mdR(mainAns) + followupBtns + actionBtns;
        // Save clean answer (without followup block) to conv
        conv[conv.length - 1] = { role: 'assistant', content: mainAns };
        cm.scrollTop = cm.scrollHeight;
        busy = false;
        document.getElementById('sbtn').disabled = false;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) { finalizeStream(); break; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.searching) {
              bub.innerHTML = '<div class="searching-ind">🔍 Buscando na portaria oficial (CONITEC)...</div><span class="stream-cursor">▌</span>';
            }
            if (evt.text) {
              fullAns += evt.text;
              bub.innerHTML = mdR(fullAns) + '<span class="stream-cursor">▌</span>';
              cm.scrollTop = cm.scrollHeight;
            }
            if (evt.done || evt.error) finalizeStream();
          } catch {}
        }
      }
    } else {
      const data = await res.json();
      hideTyp();
      fullAns = data.consolidated_text || (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n') || 'Erro ao processar.';
      addAI(fullAns);
    }

    intl = /internacional|aha |esc |acc |eular|kdigo|nice |uptodate/i.test(fullAns);
    conv.push({ role: 'assistant', content: fullAns });
    if (conv.length === 2) { saveSession(txt, intl ? 'i' : tipo); logQ(txt, tipo, intl, fullAns); }
    try { document.getElementById('sync').textContent = 'Sincronizado ✓'; } catch {}

  } catch (e) {
    hideTyp(); addAI('❌ Erro de conexão. Tente novamente.');
    try { document.getElementById('sync').textContent = 'Erro de sync'; } catch {}
  }
  busy = false; document.getElementById('sbtn').disabled = false;
}

// ── SUGESTÕES POR ESPECIALIDADE ──
const SUGG_BY_ESP = {
  'Cardiologia': [
    {ic:'🫀',t:'PCDT — Insuficiência Cardíaca',d:'Sacubitril/valsartana e dapagliflozina: critérios SUS',q:'Quais os critérios do PCDT de Insuficiência Cardíaca para uso de sacubitril/valsartana e dapagliflozina no SUS? Detalhe por medicamento e oriente o preenchimento do LME.'},
    {ic:'💊',t:'PCDT — Dislipidemia',d:'Evolocumabe: critérios para alto risco cardiovascular',q:'Quais os critérios do PCDT de Dislipidemia para uso de evolocumabe (inibidor de PCSK9) no SUS? Quando está indicado e como solicitar?'},
    {ic:'🩺',t:'Amiloidose por Transtirretina 2025',d:'Tafamidis e patisirana: critérios CEAF',q:'Quais os critérios da portaria 2025 para uso de tafamidis e patisirana na amiloidose por transtirretina (ATTR) pelo CEAF? Detalhe por medicamento.'},
    {ic:'⚡',t:'Fibrilação Atrial',d:'Anticoagulantes disponíveis no SUS e fluxograma',q:'Quais anticoagulantes estão disponíveis no SUS para fibrilação atrial? Quais os critérios do PCDT e o fluxograma de escolha entre varfarina e os DOACs?'},
  ],
  'Reumatologia': [
    {ic:'💊',t:'PCDT — Artrite Reumatoide',d:'Biológicos e JAK inibidores: critérios de escolha',q:'Quais os critérios do PCDT de Artrite Reumatoide para uso de biológicos e inibidores de JAK no SUS? Detalhe os critérios específicos de cada medicamento e como preencher o LME.'},
    {ic:'🦴',t:'PCDT — Artrite Psoriásica 2026',d:'Secuquinumabe, ixequizumabe: quando indicar',q:'Quais os critérios da portaria jan/2026 de Artrite Psoriásica para uso de biológicos no SUS? Detalhe quando usar secuquinumabe vs ixequizumabe vs adalimumabe e como solicitar o LME.'},
    {ic:'🧬',t:'PCDT — Lúpus Eritematoso',d:'Belimumabe e anifrolumabe: critérios CEAF',q:'Quais os critérios do PCDT de Lúpus Eritematoso Sistêmico para uso de belimumabe e anifrolumabe no CEAF? Quais scores e exames são obrigatórios?'},
    {ic:'💉',t:'PCDT — Espondilite Anquilosante',d:'Biológicos no SUS e critérios BASDAI',q:'Quais os critérios do PCDT de Espondilite Anquilosante para uso de biológicos no SUS? Qual o valor mínimo de BASDAI exigido e quais os biológicos disponíveis?'},
  ],
  'Neurologia': [
    {ic:'🧠',t:'PCDT — Esclerose Múltipla',d:'DMTs: critérios de escolha por perfil do paciente',q:'Quais os critérios do PCDT de Esclerose Múltipla 2024 para cada DMT disponível no SUS? Detalhe para qual perfil de paciente está indicado cada medicamento.'},
    {ic:'💊',t:'PCDT — Atrofia Muscular Espinhal',d:'Nusinersena, risdiplam e gene therapy: elegibilidade',q:'Quais os critérios do PCDT de AME 2023 para nusinersena, risdiplam e onasemnogene abeparvovec? Detalhe os critérios específicos de elegibilidade para cada um.'},
    {ic:'⚡',t:'PCDT — Epilepsia',d:'Canabidiol e antiepilépticos de 2ª linha no SUS',q:'Quais os critérios do PCDT de Epilepsia para uso de canabidiol e antiepilépticos de segunda linha no SUS? Quando está indicado escalar para segunda linha?'},
    {ic:'🧬',t:'PCDT — Miastenia Gravis',d:'Eculizumabe: critérios para forma refratária',q:'Quais os critérios para uso de eculizumabe na miastenia gravis refratária pelo SUS? Quais imunoterapias precisam ter falhado antes e quais exames são obrigatórios?'},
  ],
  'Pneumologia': [
    {ic:'🫁',t:'PCDT — DPOC 2025',d:'Terapia tripla e escalonamento: critérios por paciente',q:'Quais os critérios do PCDT de DPOC 2025 para cada medicamento disponível no SUS? Quando está indicada a terapia tripla com furoato de fluticasona + umeclidínio + vilanterol vs outras combinações? Oriente o LME.'},
    {ic:'💨',t:'PCDT — Asma Grave',d:'Omalizumabe, dupilumabe, mepolizumabe: qual biológico?',q:'Quais os critérios do PCDT de Asma para uso de biológicos no SUS? Detalhe para qual perfil está indicado omalizumabe vs mepolizumabe vs benralizumabe vs dupilumabe, incluindo os exames obrigatórios para cada um.'},
    {ic:'🧬',t:'PCDT — Fibrose Cística',d:'Moduladores CFTR: elegibilidade por genótipo',q:'Quais os critérios do PCDT de Fibrose Cística para uso dos moduladores CFTR (elexacaftor/tezacaftor/ivacaftor, lumacaftor/ivacaftor) no SUS? Quais genótipos são elegíveis?'},
    {ic:'❤️',t:'PCDT — Hipertensão Pulmonar',d:'Macitentana, selexipague: critérios',q:'Quais os critérios do PCDT de Hipertensão Arterial Pulmonar para uso de macitentana, selexipague e outros medicamentos do CEAF? Como deve ser o cateterismo de diagnóstico?'},
  ],
  'Gastroenterologia': [
    {ic:'🩺',t:'PCDT — Doença de Crohn',d:'Biológicos e pequenas moléculas: critérios de escolha',q:'Quais os critérios do PCDT de Doença de Crohn para uso de biológicos e pequenas moléculas no SUS? Detalhe quando usar adalimumabe vs infliximabe vs ustecinumabe vs vedolizumabe.'},
    {ic:'💊',t:'PCDT — Retocolite Ulcerativa',d:'Vedolizumabe, ustecinumabe, tofacitinibe: quando usar',q:'Quais os critérios do PCDT de Retocolite Ulcerativa para biológicos e tofacitinibe no SUS? Quando está indicado cada medicamento e quais as contraindicações específicas?'},
    {ic:'🧬',t:'PCDT — Hepatite C',d:'Antivirais por genótipo disponíveis no SUS',q:'Quais antivirais de ação direta estão disponíveis no SUS para Hepatite C por genótipo? Quais os critérios do PCDT 2023 e como preencher a solicitação?'},
    {ic:'🫀',t:'PCDT — Doença de Wilson',d:'Critérios diagnósticos e terapêuticos'},
  ],
  'Endocrinologia': [
    {ic:'💉',t:'PCDT — Diabetes Tipo 2',d:'Empagliflozina e semaglutida: critérios para alto risco CV',q:'Quais os critérios do PCDT de Diabetes Mellitus tipo 2 para uso de empagliflozina, dapagliflozina e semaglutida no SUS? Quais evidências de doença cardiovascular ou risco são exigidas?'},
    {ic:'🧬',t:'PCDT — Acromegalia 2025',d:'Octreotida LAR, pasireotida, pegvisomanto: quando usar',q:'Quais os critérios da portaria 2025 de Acromegalia para uso de análogos de somatostatina, pegvisomanto e pasireotida no CEAF? Detalhe os critérios específicos de cada medicamento.'},
    {ic:'📏',t:'PCDT — Deficiência de GH',d:'Somatropina: critérios diagnósticos e de prescrição'},
    {ic:'💊',t:'PCDT — Puberdade Precoce Central',d:'Análogos de GnRH: elegibilidade e critérios'},
  ],
  'Oncologia': [
    {ic:'🎗️',t:'DDT — Carcinoma de Mama',d:'Trastuzumabe, palbociclibe, olaparibe: indicações'},
    {ic:'💊',t:'DDT — Adenocarcinoma de Próstata',d:'Enzalutamida, abiraterona: critérios mCRPC'},
    {ic:'🧬',t:'DDT — Carcinoma Colorretal',d:'Bevacizumabe, cetuximabe: critérios por status RAS'},
    {ic:'💉',t:'DDT — Leucemia Linfoide Aguda',d:'Blinatumomabe, iTK: critérios por perfil molecular'},
  ],
  'Infectologia': [
    {ic:'🦠',t:'PCDT HIV — TARV 2023',d:'TDF+3TC+DTG: esquemas, resistência e situações especiais',q:'Qual o esquema preferencial de TARV para HIV pelo PCDT 2023? Quando trocar o esquema, como manejar resistência e quais as situações especiais (gestação, coinfecção TB, hepatite)?'},
    {ic:'🫁',t:'Manual TB — MS 2024',d:'Esquemas RIPE, TB-MDR: fluxograma diagnóstico e tratamento',q:'Qual o fluxograma do Manual de Tuberculose do MS 2024 para diagnóstico e tratamento? Detalhe os esquemas RIPE, TB-MDR e situações especiais como gestação e coinfecção HIV.'},
    {ic:'🩸',t:'Manual Dengue — MS',d:'Fluxograma de classificação e conduta por grupo de risco',q:'Qual o fluxograma do MS para classificação e conduta na dengue? Detalhe os grupos A, B, C e D, critérios de internação e sinais de alarme.'},
    {ic:'💊',t:'PCDT — Hepatite B 2023',d:'Tenofovir, entecavir: critérios de início'},
  ],
  'Dermatologia': [
    {ic:'🧴',t:'PCDT — Psoríase',d:'Biológicos IL-17, IL-23, TNF: critérios de escolha por perfil',q:'Quais os critérios do PCDT de Psoríase para uso de biológicos no SUS? Detalhe quando usar anti-IL-17 (secuquinumabe, ixequizumabe) vs anti-IL-23 (ustequinumabe, rissanquizumabe) vs anti-TNF, e como calcular PASI/DLQI para o LME.'},
    {ic:'💊',t:'PCDT — Hidradenite Supurativa',d:'Adalimumabe, secuquinumabe: critérios Hurley II/III',q:'Quais os critérios do PCDT de Hidradenite Supurativa para adalimumabe e secuquinumabe no SUS? Quais os critérios de estadiamento Hurley exigidos e como documentar para o LME?'},
    {ic:'🩺',t:'Hanseníase — Manual MS',d:'Fluxograma diagnóstico e esquemas PQT no SUS'},
    {ic:'🧬',t:'Psoríase Ungueal / Artropática',d:'Quando escalar para biológico'},
  ],
  'Hematologia': [
    {ic:'🩸',t:'PCDT — Anemia Falciforme 2024',d:'Voxelotor, crizanlizumabe: critérios de escolha',q:'Quais os critérios do PCDT de Anemia Falciforme 2024 para uso de voxelotor e crizanlizumabe? Quando estão indicados em relação à hidroxiureia e como solicitar pelo CEAF?'},
    {ic:'💊',t:'PCDT — Hemofilia',d:'Emicizumabe para pacientes com inibidor: critérios',q:'Quais os critérios do PCDT de Hemofilia para uso de emicizumabe em pacientes com inibidor? Como documentar o inibidor e quais os critérios de elegibilidade?'},
    {ic:'🧬',t:'PCDT — Mieloma Múltiplo',d:'Daratumumabe, bortezomibe, lenalidomida: protocolos'},
    {ic:'💉',t:'PCDT — PTI Crônica',d:'Romiplostim, eltrombopague: agonistas de TPO'},
  ],
  'Nefrologia': [
    {ic:'🫘',t:'PCDT — Doença Renal Crônica',d:'Dapagliflozina, eritropoetina: critérios por estágio',q:'Quais os critérios do PCDT de Doença Renal Crônica para uso de dapagliflozina e eritropoetina no SUS? Quais os parâmetros de TFGe, hemoglobina e proteinúria exigidos?'},
    {ic:'💊',t:'PCDT — Síndrome Nefrótica',d:'Rituximabe: critérios para forma refratária'},
    {ic:'🩺',t:'Diretrizes KDIGO — DRC',d:'Metas terapêuticas e escalonamento no Brasil'},
    {ic:'🧬',t:'Transplante Renal — imunossupressão',d:'Tacrolimus, micofenolato: protocolos SUS'},
  ],
  'Pediatria': [
    {ic:'🧬',t:'PCDT — AME Pediátrica',d:'Risdiplam, nusinersena: critérios por tipo e idade',q:'Quais os critérios do PCDT de AME 2023 para nusinersena, risdiplam e terapia gênica em crianças? Detalhe as janelas de idade, número de cópias SMN2 e critérios por tipo de AME (1, 2, 3).'},
    {ic:'💊',t:'PCDT — AIJ',d:'Biológicos pediátricos: canacinumabe, tocilizumabe',q:'Quais os critérios do PCDT de Artrite Idiopática Juvenil para uso de biológicos no SUS? Detalhe canacinumabe (AIJ sistêmica), tocilizumabe, adalimumabe e abatacepte: quando indicar cada um?'},
    {ic:'📋',t:'Manual HIV Pediátrico — MS 2023',d:'TARV em crianças: fluxograma MS'},
    {ic:'🫁',t:'PCDT — Fibrose Cística Pediátrica',d:'Moduladores CFTR por genótipo e idade'},
  ],
  'Psiquiatria': [
    {ic:'🧠',t:'PCDT — Esquizofrenia Refratária',d:'Clozapina: critérios e monitorização obrigatória',q:'Quais os critérios para uso de clozapina na esquizofrenia refratária pelo SUS? Quantos antipsicóticos precisam ter falhado, como documentar a refratariedade e qual a monitorização hematológica obrigatória?'},
    {ic:'💊',t:'Palmitato de Paliperidona IM',d:'Injetável de longa duração: critérios SUS'},
    {ic:'🩺',t:'PCDT — Transtorno Bipolar',d:'Lítio, valproato, quetiapina: escalonamento'},
    {ic:'📋',t:'Manual Saúde Mental — MS',d:'Fluxograma RAPS e rede de atenção psicossocial'},
  ],
  'Ginecologia e Obstetrícia': [
    {ic:'💊',t:'PCDT — Endometriose',d:'Dienogeste, análogos de GnRH: critérios de escolha',q:'Quais os critérios do PCDT de Endometriose para uso de dienogeste e análogos de GnRH no CEAF? Quando está indicado cada medicamento e qual documentação é necessária?'},
    {ic:'🧬',t:'PCDT — SOP',d:'Metformina, ACO, clomifeno: abordagem por fenótipo'},
    {ic:'🦠',t:'Manual IST — MS 2022',d:'Fluxograma diagnóstico e tratamento das ISTs'},
    {ic:'🩺',t:'Pré-natal de Alto Risco',d:'Fluxograma MS para gestantes de risco'},
  ],
  'Medicina de Família': [
    {ic:'🩺',t:'Manual Dengue — MS',d:'Classificação de risco e conduta na APS'},
    {ic:'💊',t:'PCDT — Hipertensão Arterial',d:'Escalonamento terapêutico no SUS'},
    {ic:'🧬',t:'Manual Tuberculose — MS 2024',d:'Diagnóstico e tratamento na atenção básica'},
    {ic:'🫀',t:'PCDT — Diabetes Tipo 2',d:'Metformina, glibenclamida: critérios e metas'},
  ],
  'Clínica Médica': [
    {ic:'💊',t:'PCDT — Dor Crônica 2024',d:'Morfina, pregabalina: critérios de escalonamento',q:'Quais os critérios da Portaria de Dor Crônica 2024 para uso de morfina, pregabalina, duloxetina e outros medicamentos no SUS? Qual o escalonamento terapêutico preconizado?'},
    {ic:'🫀',t:'PCDT — Insuficiência Cardíaca',d:'Sacubitril/valsartana e dapagliflozina: critérios SUS'},
    {ic:'🦠',t:'Manual Dengue — MS',d:'Classificação de risco e fluxograma de conduta'},
    {ic:'🧬',t:'PCDT HIV — TARV 2023',d:'Esquemas, resistência e situações especiais'},
  ],
};
const DEFAULT_SUGG = [
  {ic:'💊',t:'PCDT — Artrite Psoriásica 2026',d:'Critérios e medicamentos SUS — portaria 2026'},
  {ic:'🧬',t:'PCDT — Doença de Fabry',d:'Terapia de reposição enzimática e elegibilidade'},
  {ic:'🫁',t:'DPOC — PCDT 2025',d:'Escalonamento terapêutico e medicamentos SUS'},
  {ic:'🧠',t:'Esclerose Múltipla — DMTs SUS',d:'Moduladores disponíveis no SUS — portaria 2024'},
];
function getSugestoes() {
  const s = SUGG_BY_ESP[user.esp] || DEFAULT_SUGG;
  return s.map(x => `<div class="sugg" onclick="useS(this)" data-query="${x.q || x.t}"><div class="sugg-ic">${x.ic}</div><div class="sugg-t">${x.t}</div><div class="sugg-d">${x.d}</div></div>`).join('');
}

function renderWelcome() {
  const nome = user.nome ? user.nome.replace(/^Dr[a]?\.?\s*/i,'').split(' ')[0] : 'Doutor(a)';
  const el = document.getElementById('msgs');
  if (!el) return;
  el.innerHTML = `<div class="welcome" id="wlc">
      <div class="wlc-logo">🩺</div>
      <h2>Olá, ${nome}</h2>
      <p>Consulte PCDTs, critérios do SUS e diretrizes brasileiras. Banco centralizado Supabase — analytics em tempo real.</p>
      <div class="db-bar"><div class="pls"></div><span id="dbstat">Pronto para uso</span></div>
      <div class="sugg-g" id="main-sugg-g">${getSugestoes()}</div>
    </div>`;
}

function newChat() {
  conv = [];
  document.getElementById('msgs').innerHTML = `<div class="welcome" id="wlc">
    <div class="wlc-logo">🩺</div><h2>Nova consulta</h2>
    <p>Descreva o caso clínico ou faça sua pergunta sobre PCDTs e medicamentos do SUS.</p>
    <div class="sugg-g">${getSugestoes()}</div></div>`;
}

// ── ANALYTICS (Supabase via Edge Function) ──
async function loadAnalytics() {
  try {
    const r = await fetch(API.analytics + '?limit=500');
    anData  = await r.json();
    renderAn(anData);
  } catch { toast('Erro ao carregar analytics.', 'err'); }
}

function renderAn(d) {
  if (!d) return;
  animN('kv1', d.total || 0);
  animN('kv2', d.medicos || 0);
  animN('kv3', d.pct_pcdt || 0, '%');
  animN('kv4', d.pct_intl || 0, '%');
  document.getElementById('kd1').textContent = (d.estados || 0) + ' estados';

  // Temas (extrai de rows_recentes)
  const rows = d.rows_recentes || [];
  const tc = {};
  rows.forEach(r => {
    const q = (r.query || '').toLowerCase();
    ['artrite','esclerose','hepatite','diabetes','dpoc','asma','parkinson','epilepsia','lúpus','hiv','gaucher','fabry','crohn','osteoporose','tuberculose'].forEach(t => { if (q.includes(t)) tc[t] = (tc[t] || 0) + 1; });
  });
  const ta = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const mx = ta[0]?.[1] || 1;
  document.getElementById('an-top').innerHTML = ta.length
    ? ta.map(([t, v]) => `<div class="bar"><div class="bl">${t.charAt(0).toUpperCase() + t.slice(1)}</div><div class="bt"><div class="bf" style="width:${Math.round(v / mx * 100)}%"></div></div><div class="bv">${v}</div></div>`).join('')
    : '<p style="font-size:12px;color:var(--ink4)">Sem dados suficientes ainda.</p>';

  // Especialidades
  const ea = Object.entries(d.por_esp || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  document.getElementById('an-esp').innerHTML = ea.length
    ? ea.map(([e, v]) => `<div class="sp-row"><span class="sp-n">${e}</span><span class="sp-v">${v}</span></div>`).join('')
    : '<p style="font-size:12px;color:var(--ink4)">Sem dados.</p>';

  // Mapa UF
  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const ufMap = d.por_uf || {};
  const ms = Math.max(...Object.values(ufMap), 1);
  document.getElementById('an-map').innerHTML = ufs.map(u => {
    const v = ufMap[u] || 0; const p = v / ms;
    const cl = p >= .7 ? 'd1' : p >= .4 ? 'd2' : p >= .15 ? 'd3' : v > 0 ? 'd4' : '';
    return `<div class="uf ${cl}" title="${u}: ${v}"><div class="u">${u}</div><div class="n">${v}</div></div>`;
  }).join('');

  // Tags
  const ws  = rows.flatMap(r => (r.query || '').toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const wc  = {}; ws.forEach(w => { wc[w] = (wc[w] || 0) + 1; });
  const stop = new Set(['para','como','quais','sobre','criterios','tratamento','medicamentos','protocolo','doença']);
  const tw  = Object.entries(wc).filter(([w]) => !stop.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 18);
  document.getElementById('an-tags').innerHTML = tw.length
    ? tw.map(([w, v], i) => `<span class="tag${i % 4 === 0 ? ' g' : i % 6 === 0 ? ' b' : i % 8 === 0 ? ' p' : ''}">${w} (${v})</span>`).join('')
    : '<span style="color:var(--ink4);font-size:12px">Sem dados.</span>';

  // Fontes
  const tot = d.total || 1;
  const srcs = [
    { l: 'Protocolos MS/PCDT', n: Math.round(tot * (1 - (d.pct_intl || 0) / 100)) },
    { l: 'Fontes internacionais', n: Math.round(tot * (d.pct_intl || 0) / 100) },
  ];
  const sm = Math.max(...srcs.map(s => s.n), 1);
  document.getElementById('an-src').innerHTML = srcs.map(s => `<div class="bar"><div class="bl">${s.l}</div><div class="bt"><div class="bf" style="width:${Math.round(s.n / sm * 100)}%"></div></div><div class="bv">${s.n}</div></div>`).join('');

  // Medicamentos mais pesquisados
  const medEl = document.getElementById('an-meds');
  if (medEl && d.por_med) {
    const topMeds = Object.entries(d.por_med).sort((a,b) => b[1]-a[1]).slice(0,15);
    const mxMed = topMeds[0]?.[1] || 1;
    if (topMeds.length) {
      medEl.innerHTML = topMeds.map(([m,v]) => `
        <div class="bar">
          <div class="bl" style="width:200px">${m}</div>
          <div class="bt"><div class="bf" style="width:${Math.round(v/mxMed*100)}%"></div></div>
          <div class="bv">${v}</div>
        </div>`).join('');
    } else {
      medEl.innerHTML = '<p style="font-size:12px;color:var(--ink4)">Dados sendo coletados. Disponível após as primeiras consultas.</p>';
    }
  }

  // Medicamentos por especialidade
  const medEspEl = document.getElementById('an-meds-esp');
  if (medEspEl && d.med_por_esp) {
    const esps = Object.entries(d.med_por_esp).sort((a,b) => Object.keys(b[1]).length - Object.keys(a[1]).length).slice(0,6);
    if (esps.length) {
      medEspEl.innerHTML = esps.map(([esp, meds]) => {
        const top3 = Object.entries(meds).sort((a,b) => b[1]-a[1]).slice(0,3);
        return `<div class="med-esp-row">
          <div class="med-esp-name">${esp}</div>
          <div class="med-esp-pills">${top3.map(([m,v]) => `<span class="med-pill">${m} <strong>${v}</strong></span>`).join('')}</div>
        </div>`;
      }).join('');
    } else {
      medEspEl.innerHTML = '<p style="font-size:12px;color:var(--ink4)">Dados sendo coletados.</p>';
    }
  }

  // Medicamentos por UF (top 5 estados)
  const medUfEl = document.getElementById('an-meds-uf');
  if (medUfEl && d.med_por_uf) {
    const topUfs = Object.entries(d.med_por_uf)
      .map(([uf, meds]) => ({ uf, total: Object.values(meds).reduce((a,b)=>a+b,0), topMed: Object.entries(meds).sort((a,b)=>b[1]-a[1])[0] }))
      .sort((a,b) => b.total - a.total).slice(0,8);
    if (topUfs.length) {
      medUfEl.innerHTML = `<table style="width:100%;font-size:12px;border-collapse:collapse">
        <thead><tr style="background:var(--ln2)"><th style="padding:5px;text-align:left">UF</th><th style="padding:5px">Consultas</th><th style="padding:5px;text-align:left">Med. mais pesquisado</th></tr></thead>
        <tbody>${topUfs.map(r => `<tr><td style="padding:5px;font-weight:700;color:var(--teal)">${r.uf}</td><td style="padding:5px;text-align:center">${r.total}</td><td style="padding:5px;color:var(--ink2)">${r.topMed ? r.topMed[0] : '—'} ${r.topMed ? '<span style="color:var(--ink4)">(' + r.topMed[1] + 'x)</span>' : ''}</td></tr>`).join('')}</tbody>
      </table>`;
    } else {
      medUfEl.innerHTML = '<p style="font-size:12px;color:var(--ink4)">Dados sendo coletados.</p>';
    }
  }
}

// ── EXPORT ──
async function loadExport() {
  const params = new URLSearchParams();
  const days = gi('fp'); if (days) params.set('days', days);
  const uf   = gi('fuf'); if (uf)  params.set('uf', uf);
  const esp  = gi('fesp'); if (esp) params.set('esp', esp);
  try {
    const r = await fetch(API.analytics + '?' + params.toString() + '&limit=500');
    expData = await r.json();
    const n = expData.total || 0;
    document.getElementById('exp-cnt').textContent = n + ' registros com os filtros';
    animN('ek1', n);
    animN('ek2', expData.medicos || 0);
    animN('ek3', expData.estados || 0);
    animN('ek4', expData.pct_pcdt || 0, '%');
    renderExpTable(expData.rows_recentes || []);
    renderExpMap(expData.por_uf || {});
  } catch { toast('Erro ao carregar dados para exportação.', 'err'); }
}

function renderExpTable(rows) {
  document.getElementById('exp-tbl').innerHTML = rows.slice(0, 20).map((r, i) => {
    const d  = (r.criado_em || '').slice(0, 10);
    const tp = { k: 'PCDT', p: 'Protocolo', r: 'Raro', i: 'Intl' }[r.tipo || 'p'];
    const tc = { k: 'bdg-k', p: 'bdg-p', r: 'bdg-r', i: 'bdg-i' }[r.tipo || 'p'];
    return `<tr><td style="color:var(--ink4)">${i + 1}</td><td>${d}</td><td><strong>${r.uf || '—'}</strong></td><td>${r.especialidade || '—'}</td><td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.query || '')}</td><td><span class="bdg ${tc}">${tp}</span></td></tr>`;
  }).join('');
}

function renderExpMap(ufMap) {
  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const ms  = Math.max(...Object.values(ufMap), 1);
  document.getElementById('exp-map').innerHTML = ufs.map(u => {
    const v = ufMap[u] || 0; const p = v / ms;
    const cl = p >= .7 ? 'd1' : p >= .4 ? 'd2' : p >= .15 ? 'd3' : v > 0 ? 'd4' : '';
    return `<div class="uf ${cl}"><div class="u">${u}</div><div class="n">${v}</div></div>`;
  }).join('');
}

function showPT(id, btn) {
  ['t-raw', 't-map'].forEach(t => document.getElementById(t).style.display = 'none');
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('on'));
  document.getElementById(id).style.display = ''; btn.classList.add('on');
}

async function exportPDF() {
  if (!expData) { toast('Aplique os filtros primeiro.', ''); return; }
  const btn = document.getElementById('btn-pdf');
  btn.disabled = true; btn.innerHTML = '<span class="spin">⟳</span> Gerando...';
  const d    = expData;
  const n    = d.total || 0;
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const topUF  = Object.entries(d.por_uf  || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topEsp = Object.entries(d.por_esp || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const rows   = d.rows_recentes || [];
  const tc = {};
  rows.forEach(r => {
    const q = (r.query || '').toLowerCase();
    ['artrite','esclerose','hepatite','diabetes','dpoc','asma','hiv','lúpus','gaucher','fabry','crohn','mieloma'].forEach(t => { if (q.includes(t)) tc[t] = (tc[t] || 0) + 1; });
  });
  const ta = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
body{font-family:Georgia,serif;font-size:11.5px;color:#111;margin:0;}
.pg{width:210mm;min-height:297mm;padding:18mm 16mm;box-sizing:border-box;}
.cov{text-align:center;padding:10mm 0 8mm;border-bottom:2px solid #0E7C6E;margin-bottom:6mm;}
.logo{font-size:44px;margin-bottom:4mm;}
.cov h1{font-size:26px;color:#0A1628;letter-spacing:-.5px;margin-bottom:2mm;}
.cov .sub{font-size:13px;color:#0E7C6E;font-weight:bold;}
.cov .meta{font-size:10px;color:#888;margin-top:3mm;}
h2{font-size:13px;color:#0E7C6E;border-bottom:1px solid #ccc;padding-bottom:2mm;margin:5mm 0 3mm;}
.kg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:4mm 0;}
.kb{background:#EBF9F8;border-radius:6px;padding:6px 8px;text-align:center;}
.kv{font-size:20px;font-weight:bold;color:#0E7C6E;} .kl{font-size:9px;color:#555;margin-top:2px;}
table{width:100%;border-collapse:collapse;font-size:10.5px;margin:3mm 0;}
th{background:#0A1628;color:white;padding:4px 7px;text-align:left;font-size:9.5px;}
td{padding:4px 7px;border-bottom:1px solid #eee;} tr:nth-child(even) td{background:#F8FCFC;}
.br{display:flex;align-items:center;gap:5px;margin-bottom:3px;}
.bl{width:120px;font-size:10.5px;color:#333;} .bb{flex:1;background:#e0f2f1;height:6px;border-radius:2px;}
.bf{height:100%;background:#0E7C6E;border-radius:2px;} .bv{font-size:10px;color:#555;width:20px;text-align:right;}
.ins{background:#FFFBEB;border-left:3px solid #D97706;padding:5px 8px;border-radius:0 5px 5px 0;margin:3mm 0;font-size:10.5px;color:#5C3B00;}
.foot{margin-top:8mm;padding-top:3mm;border-top:1px solid #ccc;font-size:9px;color:#888;text-align:center;}
</style></head><body><div class="pg">
<div class="cov"><div class="logo">🩺</div><h1>ProtocoloBrasil</h1>
<div class="sub">Relatório Epidemiológico de Consultas Clínicas</div>
<div class="meta">Gerado em ${date} · protocolobrasil.com.br</div></div>
<h2>📊 Sumário Executivo</h2>
<div class="kg">
  <div class="kb"><div class="kv">${n}</div><div class="kl">Consultas</div></div>
  <div class="kb"><div class="kv">${d.medicos || 0}</div><div class="kl">Médicos únicos</div></div>
  <div class="kb"><div class="kv">${d.estados || 0}/27</div><div class="kl">Estados ativos</div></div>
  <div class="kb"><div class="kv">${d.pct_pcdt || 0}%</div><div class="kl">PCDT/SUS</div></div>
  <div class="kb"><div class="kv">${d.pct_intl || 0}%</div><div class="kl">Fontes internacionais</div></div>
  <div class="kb"><div class="kv">${ta.length}</div><div class="kl">Temas identificados</div></div>
</div>
${(d.pct_intl || 0) > 20 ? `<div class="ins">⚠️ ${d.pct_intl}% de fontes internacionais indicam lacunas nos PCDTs nacionais.</div>` : ''}
<h2>🔬 Temas Mais Consultados</h2>
${ta.map(([t, v], i) => { const p = Math.round(v / Math.max(ta[0][1], 1) * 100); return `<div class="br"><div class="bl">${i + 1}. ${t.charAt(0).toUpperCase() + t.slice(1)}</div><div class="bb"><div class="bf" style="width:${p}%"></div></div><div class="bv">${v}</div></div>`; }).join('')}
<h2>🗺️ Distribuição por Estado</h2>
<table><thead><tr><th>Estado</th><th>Consultas</th><th>% Total</th></tr></thead><tbody>
${topUF.map(([u, v]) => `<tr><td><b>${u}</b></td><td>${v}</td><td>${Math.round(v / Math.max(n, 1) * 100)}%</td></tr>`).join('')}
</tbody></table>
<h2>👩‍⚕️ Por Especialidade</h2>
<table><thead><tr><th>Especialidade</th><th>Consultas</th><th>%</th></tr></thead><tbody>
${topEsp.map(([e, v]) => `<tr><td>${e}</td><td>${v}</td><td>${Math.round(v / Math.max(n, 1) * 100)}%</td></tr>`).join('')}
</tbody></table>
<div class="foot">ProtocoloBrasil v1.0 · Dados anonimizados · LGPD compliant · protocolobrasil.com.br</div>
</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ProtocoloBrasil_Relatorio_${new Date().toISOString().slice(0, 10)}.html`;
  a.click(); URL.revokeObjectURL(url);
  toast('PDF gerado! Abra o arquivo → Ctrl+P → Salvar como PDF', 'ok');
  btn.disabled = false; btn.innerHTML = '📥 Baixar PDF Executivo';
}

async function exportXLSX() {
  if (!expData) { toast('Aplique os filtros primeiro.', ''); return; }
  const btn = document.getElementById('btn-xlsx');
  btn.disabled = true; btn.innerHTML = '<span class="spin">⟳</span> Gerando...';
  try {
    const rows = expData.rows_recentes || [];
    const wb   = XLSX.utils.book_new();
    const ws1  = XLSX.utils.json_to_sheet(rows.map(r => ({
      'Data': (r.criado_em || '').slice(0, 10),
      'UF': r.uf || '', 'Especialidade': r.especialidade || '',
      'Consulta': r.query || '', 'Tipo': { k: 'PCDT/SUS', p: 'Protocolo', r: 'Raro', i: 'Internacional' }[r.tipo || 'p'],
      'Internacional': r.fonte_internacional ? 'Sim' : 'Não',
    })));
    ws1['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 50 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Dados Brutos');
    const ws2 = XLSX.utils.json_to_sheet(Object.entries(expData.por_uf || {}).sort((a, b) => b[1] - a[1]).map(([u, v]) => ({ 'Estado': u, 'Consultas': v, '% Total': Math.round(v / Math.max(expData.total || 1, 1) * 100) + '%' })));
    XLSX.utils.book_append_sheet(wb, ws2, 'Por UF');
    const ws3 = XLSX.utils.json_to_sheet(Object.entries(expData.por_esp || {}).sort((a, b) => b[1] - a[1]).map(([e, v]) => ({ 'Especialidade': e, 'Consultas': v })));
    XLSX.utils.book_append_sheet(wb, ws3, 'Especialidades');
    const ws4 = XLSX.utils.json_to_sheet(Object.entries(expData.por_dia || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ 'Data': d, 'Total': v.total, 'PCDT': v.pcdt, 'Internacional': v.intl })));
    XLSX.utils.book_append_sheet(wb, ws4, 'Série Temporal');
    const ws5 = XLSX.utils.aoa_to_sheet([
      ['ProtocoloBrasil — Relatório Executivo', ''],
      ['Gerado em', new Date().toLocaleDateString('pt-BR')],
      ['', ''],
      ['INDICADOR', 'VALOR'],
      ['Total consultas', expData.total || 0],
      ['Médicos únicos', expData.medicos || 0],
      ['Estados ativos', expData.estados || 0],
      ['% PCDT/SUS', (expData.pct_pcdt || 0) + '%'],
      ['% Internacional', (expData.pct_intl || 0) + '%'],
      ['', ''],
      ['Site', 'protocolobrasil.com.br'],
      ['Conformidade', 'LGPD — Dados anonimizados'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws5, 'Resumo Executivo');
    XLSX.writeFile(wb, `ProtocoloBrasil_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('Excel baixado com sucesso!', 'ok');
  } catch (e) { toast('Erro ao gerar Excel: ' + e.message, 'err'); }
  btn.disabled = false; btn.innerHTML = '📥 Baixar Excel Analítico';
}

// ── MARKDOWN RENDERER ──
function mdR(t) {
  let h = esc(t);
  // Remove pipe tables — convert to list format
  h = h.replace(/\|(.+)\|/g, (match) => {
    // Skip separator rows (|---|---|)
    if (/^[\s|:-]+$/.test(match)) return '';
    // Convert table row to list item
    const cells = match.split('|').filter(c => c.trim());
    return cells.map(c => `<li>${c.trim()}</li>`).join('');
  });
  // Headers
  h = h.replace(/^#{1,6} (.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^#{1,6}\s*$/gm, '');
  h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  // Bold and italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Horizontal rule
  h = h.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--ln);margin:10px 0">');
  // Special emoji section headers (═══)
  h = h.replace(/^═+$/gm, '');
  // Lists
  h = h.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  h = h.replace(/^(\d+)\. (.+)$/gm, '<li><strong>$1.</strong> $2</li>');
  h = h.replace(/^  [-•] (.+)$/gm, '<li class="sub-li">$1</li>');
  h = h.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  // Source box
  h = h.replace(/(📄 Fontes?[^\n]*:[\s\S]*?)(?=⚠️|$)/g, m => {
    const lines = m.split('\n').filter(l => l.trim() && !/^📄 Fontes/.test(l));
    if (!lines.length) return m;
    const items = lines.map(l => {
      const br = /MS|SBC|SBD|SBR|PCDT|Minist|Brasil|CONITEC|Portaria|gov\.br/i.test(l);
      return `<div class="src-row"><span>📄</span><span>${esc(l.replace(/^[-•*]/, '').trim())}</span><span class="sbg ${br ? 'br' : 'il'}">${br ? 'BR' : 'Intl'}</span></div>`;
    }).join('');
    return `<div class="src-box"><div class="src-tit">📄 Fontes Consultadas</div>${items}</div>`;
  });
  // Warning box
  h = h.replace(/⚠️ (.+)/g, '<div class="warn-r">⚠️ <span>$1</span></div>');
  // LME offer box
  h = h.replace(/(📝 Deseja[^<]+LME[^<]+)/g, '<div class="lme-offer">$1</div>');
  // Paragraphs
  const blocks = h.split('\n\n');
  h = blocks.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return h;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ── UTILS ──
function animN(id, val, suf = '') {
  const el = document.getElementById(id); if (!el) return;
  let c = 0; const st = Math.max(1, Math.floor(val / 20));
  const tm = setInterval(() => { c = Math.min(c + st, val); el.textContent = c + suf; if (c >= val) clearInterval(tm); }, 30);
}
function toast(msg, type) {
  const t = document.getElementById('toast'); t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : ''); t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ── ACESSO ADMIN SECRETO (Ctrl+Shift+A) ──
document.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    const ok = await checkAdmin();
    if (!ok) return;
    // Mostra os botões ocultos
    document.getElementById('btn-analytics').style.display = '';
    document.getElementById('btn-export').style.display = '';
    toast('Modo administrador ativado', 'ok');
    // Abre analytics automaticamente
    goPage('analytics', document.getElementById('btn-analytics'));
  }
});

// ── IR PARA INÍCIO (logo clicável) ──
function irParaInicio() {
  newChat();
  // Ativa aba Consulta
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('pg-chat').classList.add('on');
  document.querySelectorAll('.nav-btn')[0].classList.add('on');
  // Atualiza sugestões com especialidade atual
  setTimeout(() => {
    const mainSugg = document.getElementById('main-sugg-g');
    if (mainSugg) mainSugg.innerHTML = getSugestoes();
  }, 50);
}

// ── BOOT ──
init();
