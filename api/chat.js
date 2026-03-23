export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system } = req.body;
    if (!messages) return res.status(400).json({ error: 'Missing messages' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        stream: true,
        system: system || '',
        messages,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      let errMsg = `Erro ${r.status}`;
      if (r.status === 429) errMsg = 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.';
      if (r.status === 401) errMsg = 'Chave de API inválida. Verifique a configuração.';
      return res.status(r.status).json({ error: errMsg });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Keep-alive a cada 20s para evitar timeout em respostas longas
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 20000);

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
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ text: evt.delta.text })}\n\n`);
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
