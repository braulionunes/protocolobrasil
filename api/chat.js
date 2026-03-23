export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system } = req.body;
    if (!messages) return res.status(400).json({ error: 'Missing messages' });

    // Detecta se a pergunta envolve PCDT/medicamento para forçar busca
    const lastMsg = messages[messages.length - 1]?.content || '';
    const needsSearch = /pcdt|portaria|medicamento|sus|ceaf|crit[eé]rio|dose|prescri|dpoc|asma|artrite|diabetes|esclerose|hiv|tuberculose|hepatite|câncer|cancer|tumor|lúpus|lupus|crohn|colite|nefrite|hemofilia|mieloma|gaucher|fabry|pompe|insufici[eê]ncia|dislipidemia|hipertensão|osteoporose|endometriose|psoríase|psoriase|epilepsia|parkinson|esquizofrenia/i.test(lastMsg);

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      stream: true,
      system: system || '',
      messages,
    };

    // Ativa busca web para perguntas clínicas
    if (needsSearch) {
      body.tools = [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
        // Prioriza fontes oficiais brasileiras
        allowed_domains: [
          'conitec.gov.br',
          'saude.gov.br',
          'gov.br',
          'ans.gov.br',
          'cfm.org.br',
          'sbcardiologia.org.br',
          'reumatologia.org.br',
          'sbpt.org.br',
          'sbgastro.org.br',
          'sbn.org.br',
          'sbp.com.br',
          'diabetes.org.br',
          'pubmed.ncbi.nlm.nih.gov',
        ],
      }];
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Keep-alive ping every 15s — evita timeout em respostas longas
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 15000);

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sentDone = false;

    const finish = (errMsg) => {
      clearInterval(keepAlive);
      if (!sentDone) {
        sentDone = true;
        try {
          res.write(`data: ${JSON.stringify({ done: true, ...(errMsg ? { error: errMsg } : {}) })}\n\n`);
        } catch {}
      }
      try { res.end(); } catch {}
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { finish(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { finish(); return; }
          try {
            const evt = JSON.parse(data);
            // Texto da resposta
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ text: evt.delta.text })}\n\n`);
            }
            // Sinaliza busca em andamento para o frontend
            if (evt.type === 'content_block_start' && evt.content_block?.type === 'tool_use') {
              res.write(`data: ${JSON.stringify({ searching: true })}\n\n`);
            }
            if (evt.type === 'message_stop') { finish(); return; }
            if (evt.type === 'error') { finish(evt.error?.message); return; }
          } catch {}
        }
      }
    } catch (e) {
      finish(e.message);
    }

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

export const config = { maxDuration: 90 };
