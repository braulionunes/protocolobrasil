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
  user = { nome: n, crm: c, uf: u, esp: e };
  const ini = n.replace(/^Dr[a]?\.?\s*/i, '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('uav').textContent  = ini;
  document.getElementById('ulbl').textContent = `CRM-${u} ${c}`;
  document.getElementById('wcn').textContent  = n.replace(/^Dr[a]?\.?\s*/i, '').split(' ')[0];
  document.getElementById('ob').classList.remove('show');
  myHist = lsGet(`pb_hist_${c}`) || [];
  renderH(myHist);
  renderCat();
  // Reconstrói a tela de boas-vindas com sugestões corretas para a especialidade
  renderWelcome();
  toast('Bem-vindo(a), ' + n.replace(/^Dr[a]?\.?\s*/i,'').split(' ')[0] + '!', 'ok');
}
function gi(id) { return (document.getElementById(id)?.value || '').trim(); }

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
      <span class="hi-tag t${h.tipo || 'p'}">${{ k: 'PCDT', i: 'Intl', r: 'Raro', p: 'Protocolo' }[h.tipo || 'p']}</span>
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
async function logQ(q, tipo, intl) {
  try {
    await fetch(API.log, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm: user.crm, uf: user.uf, esp: user.esp, query: q.slice(0, 100), tipo, intl }),
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

  // Show confirmation in chat
  addAI('✅ **Rascunho do LME gerado!** O formulário apareceu na tela. Preencha os campos em amarelo, assine e entregue ao paciente.\\n\\n📋 Campos pré-preenchidos: CID-10, diagnóstico, medicamento, anamnese e critérios do PCDT.\\n⚠️ Campos que precisam ser completados: nome do paciente, peso, altura, CNES, CNS do médico e assinatura.');
}

function imprimirLME() {
  const form = document.getElementById('lme-form');
  if (!form) return;
  const w = window.open('', '_blank');
  if (!w) {
    // Fallback if popup blocked — use print directly
    const orig = document.body.innerHTML;
    const toolbar = document.querySelector('#lme-modal > div > div:first-child');
    const aviso = document.querySelector('#lme-modal > div > div:nth-child(2)');
    if (toolbar) toolbar.style.display = 'none';
    if (aviso) aviso.style.display = 'none';
    window.print();
    if (toolbar) toolbar.style.display = '';
    if (aviso) aviso.style.display = '';
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LME</title>
    <style>@page{size:A4;margin:10mm 12mm;}body{font-family:Arial,sans-serif;margin:0;padding:0;}
    input,textarea{border:none;border-bottom:1px solid #aaa;outline:none;font-family:Arial;font-size:inherit;}
    @media print{.no-print{display:none;}}</style></head>
    <body>${form.innerHTML}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  w.document.close();
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
  if (/raro|fabry|gaucher|pompe|wilson|mps|ame |atrofia muscular|amiloidose/.test(ql)) return 'r';
  if (/pcdt|sus|ceaf|componente|critério|alto custo|dispensação/.test(ql)) return 'k';
  return 'p';
}

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
  const fn = Object.entries(filters).filter(([, fv]) => !fv).map(([k]) => k);
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
⚠️ Apoio à decisão — consulte gov.br/saude/pcdt${fn.length ? `\nFILTROS: NÃO usar ${fn.join(', ')}.` : ''}${ctx ? '\n\n════ BASE DE PCDTs — USE EXCLUSIVAMENTE ESTES DADOS ════\n' + ctx : ''}`;
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
        const isPCDT = /crit[eé]rios|LME|componente|CEAF|portaria|medicamento|SUS/i.test(fullAns);
        const btns = isPCDT
          ? `<div class="followup-bar"><button class="followup-btn" onclick="askLME()">📝 Gerar rascunho do LME</button><button class="followup-btn" onclick="askCriteria()">🔍 Critérios por medicamento</button><button class="followup-btn" onclick="askDocs()">📋 Documentos necessários</button></div>`
          : `<div class="followup-bar"><button class="followup-btn" onclick="askFollowup()">💬 Aprofundar tema</button><button class="followup-btn" onclick="askAlternative()">🔄 Protocolo completo MS</button></div>`;
        bub.innerHTML = mdR(fullAns) + btns;
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
    if (conv.length === 2) { saveSession(txt, intl ? 'i' : tipo); logQ(txt, tipo, intl); }
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
