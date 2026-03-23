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
  // Atualiza sugestões da tela inicial com base na especialidade
  const mainSugg = document.getElementById('main-sugg-g');
  if (mainSugg) mainSugg.innerHTML = getSugestoes();
  toast('Bem-vindo(a) ao ProtocoloBrasil!', 'ok');
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
      <div class="hi-t">${esc(h.titulo || '')}</div>
      <div class="hi-m">${h.data} · ${h.uf}</div>
      <span class="hi-tag t${h.tipo || 'p'}">${{ k: 'PCDT', i: 'Intl', r: 'Raro', p: 'Protocolo' }[h.tipo || 'p']}</span>
    </div>`).join('');
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
  goPage('chat', document.querySelectorAll('.nav-btn')[0]);
  document.getElementById('cin').value = `Critérios PCDT e medicamentos SUS para ${key}?`;
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
  const lastQ = conv.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  document.getElementById('cin').value = `Com base na consulta anterior, gere um rascunho completo do LME (Laudo para Solicitação, Avaliação e Autorização de Medicamentos do Componente Especializado) para este caso, listando campo a campo o que deve ser preenchido, quais documentos anexar e onde entregar.`;
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
      ctx += `\n\n[PCDT: ${k.toUpperCase()} | ${v.portaria} | ${v.comp}]\nMedicamentos SUS: ${v.meds.join(', ')}\nCritérios:\n${v.criterios.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    }
  }
  const fn = Object.entries(filters).filter(([, fv]) => !fv).map(([k]) => k);
  return `Você é o ProtocoloBrasil, assistente clínico especializado em prescrição de medicamentos de alto custo pelo SUS, protocolos do Ministério da Saúde e apoio ao preenchimento do LME (Laudo para Solicitação, Avaliação e Autorização de Medicamentos do Componente Especializado).

═══════════════════════════════════════
REGRA ABSOLUTA — BUSCA WEB OBRIGATÓRIA
═══════════════════════════════════════
Antes de QUALQUER resposta sobre PCDT, medicamento, portaria, manual ou protocolo:
1. Busque em conitec.gov.br, saude.gov.br e gov.br/saude/pcdt
2. Use APENAS os critérios encontrados nas portarias oficiais — NUNCA invente ou generalize
3. Se não encontrar informação específica, diga claramente e indique onde verificar

═══════════════════════════════════════════
BLOCO A — PERGUNTAS SOBRE PCDT / ALTO CUSTO
═══════════════════════════════════════════
Quando perguntado sobre medicamento de alto custo ou PCDT, responda com TODOS estes blocos:

## 🏥 Disponibilidade no SUS
- Componente: CEAF / Estratégico / Básico
- Portaria vigente (número, data, link se disponível)
- CID-10 cobertos

## 📋 Critérios de Inclusão — GERAL
[Critérios que o paciente deve preencher para iniciar QUALQUER medicamento do PCDT]
- Diagnóstico confirmado (como confirmar)
- Exames obrigatórios antes do início
- Tratamentos prévios obrigatórios (escalonamento terapêutico)
- Contraindicações absolutas

## 💊 CRITÉRIOS ESPECÍFICOS POR MEDICAMENTO
[Para CADA medicamento do PCDT, detalhe:]

### [Nome do medicamento] — [Dose/via]
**Indicado quando:** [critérios específicos que diferenciam este drug dos demais]
**Contraindicações específicas:** [o que impede uso deste drug em particular]
**Exames necessários antes:** [exames específicos para este drug]
**Monitorização:** [como monitorar durante o tratamento]
**Critérios de suspensão:** [quando suspender este drug]

[Repita para cada medicamento do PCDT]

## 📝 Orientação para Preenchimento do LME
**O LME (Laudo para Solicitação, Avaliação e Autorização de Medicamentos) deve conter:**

**Campo 1 — Identificação do paciente:** nome completo, CNS, CPF, data de nascimento, endereço
**Campo 2 — Médico solicitante:** nome, CRM, especialidade, contato
**Campo 3 — Diagnóstico:** CID-10 principal + secundários relevantes
**Campo 4 — Anamnese e exame clínico:** descrever brevemente o caso, tempo de doença, tratamentos anteriores realizados e por quanto tempo, resposta/falha terapêutica documentada
**Campo 5 — Exames complementares:** listar com datas — [especifique quais exames são obrigatórios para esta doença]
**Campo 6 — Medicamento solicitado:** nome genérico, dose, posologia, via, quantidade para 6 meses
**Campo 7 — Justificativa:** por que este medicamento e não outro do PCDT (critério de escolha)
**Documentos obrigatórios a anexar:** [liste os documentos específicos do PCDT em questão]
**Onde entregar:** CEMA ou farmácia de alto custo da Secretaria Estadual de Saúde

## ⛔ Critérios de Exclusão e Suspensão
[Quando o paciente perde o direito ao medicamento]

## 📄 Fontes Consultadas
[Liste portarias, URLs e manuais utilizados com badge [BR] ou [Internacional]]

⚠️ Informação de apoio à decisão clínica. Consulte sempre a portaria original em gov.br/saude/pcdt

═══════════════════════════════════════════════════
BLOCO B — MANUAIS E PROTOCOLOS DO MINISTÉRIO DA SAÚDE
═══════════════════════════════════════════════════
Quando perguntado sobre tuberculose, HIV, dengue, hepatites, hanseníase, malária, leishmaniose, IST, saúde mental, atenção básica ou qualquer outro tema com manual do MS:

1. Busque o manual mais recente em saude.gov.br
2. Siga RIGOROSAMENTE o fluxograma nacional do MS
3. Estruture assim:

## 📖 Protocolo Nacional — [Tema]
**Manual:** [nome do manual, ano, link]

## 🔄 Fluxograma de Conduta
[Descreva o fluxograma passo a passo como o MS preconiza:]
- Passo 1: [critério/ação]
- Passo 2: [critério/ação]
- Se [condição] → [conduta A]
- Se [outra condição] → [conduta B]

## 💊 Tratamento Preconizado pelo MS
[Esquemas terapêuticos oficiais com doses e duração]

## ⚠️ Situações Especiais
[Gestantes, crianças, imunossuprimidos, coinfecções — conforme o manual]

## 📄 Fonte
[Manual do MS com link]

⚠️ Informação de apoio à decisão clínica. Consulte sempre o manual original em saude.gov.br

═══════════════════════════════════════════
BLOCO C — PERGUNTAS CLÍNICAS GERAIS
═══════════════════════════════════════════
Para diagnóstico diferencial, conduta clínica, exames:
1. Priorize diretrizes das sociedades brasileiras (SBC, SBD, SBR, SBN, SBP, CFM)
2. Use fontes internacionais (AHA/ACC/ESC/EULAR/KDIGO) apenas se não houver diretriz BR
3. Marque fontes internacionais com "⚠️ Fonte internacional"

REGRAS GERAIS:
- Linguagem técnica para médico especialista
- Use markdown com ## para títulos e listas com bullet points
- Seja ESPECÍFICO e DETALHADO — respostas vagas não ajudam o médico prescritor
- Sempre cite portaria e ano das informações${fn.length ? '\nFILTROS ATIVOS: NÃO usar ' + fn.join(', ') + '.' : ''}${ctx ? '\n\nBASE LOCAL DE PCDTs (use como referência inicial, mas prefira dados da busca web se mais atualizados):' + ctx : ''}`;
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
      const dec = new TextDecoder(); let buf = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.text) {
              fullAns += evt.text;
              bub.innerHTML = mdR(fullAns) + '<span class="stream-cursor">▌</span>';
              cm.scrollTop = cm.scrollHeight;
            }
            if (evt.done) {
              const isPCDT = /crit[eé]rios|LME|componente|CEAF|portaria|medicamento|SUS/i.test(fullAns);
              const btns = isPCDT
                ? `<div class="followup-bar"><button class="followup-btn" onclick="askLME()">📝 Gerar rascunho do LME</button><button class="followup-btn" onclick="askCriteria()">🔍 Critérios por medicamento</button><button class="followup-btn" onclick="askDocs()">📋 Documentos necessários</button></div>`
                : `<div class="followup-bar"><button class="followup-btn" onclick="askFollowup()">💬 Aprofundar tema</button><button class="followup-btn" onclick="askAlternative()">🔄 Protocolo completo MS</button></div>`;
              bub.innerHTML = mdR(fullAns) + btns;
              cm.scrollTop = cm.scrollHeight;
            }
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
    setSyncStatus('Sincronizado ✓');

  } catch (e) {
    hideTyp(); addAI('❌ Erro de conexão. Tente novamente.');
    setSyncStatus('Erro');
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
  h = h.replace(/^#{1,3} (.+)$/gm, '<h4>$1</h4>');
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

// ── BOOT ──
init();
