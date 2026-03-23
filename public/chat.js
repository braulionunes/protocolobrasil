// /api/chat.js — Edge Function Vercel
// Proxy seguro com busca web em tempo real (CONITEC, MS, fontes brasileiras)

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  try {
    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Chamada à Anthropic com busca web ativada
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: body.system || '',
        messages: body.messages,
        // Ferramenta de busca web nativa da Anthropic
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            // Prioriza fontes brasileiras oficiais
            allowed_domains: [
              'gov.br',
              'conitec.gov.br',
              'saude.gov.br',
              'ans.gov.br',
              'cfm.org.br',
              'sbcardiologia.org.br',
              'diabetes.org.br',
              'reumatologia.org.br',
              'sbp.com.br',
              'sbhci.org.br',
              'sbpt.org.br',
              'sbgastro.org.br',
              'sbn.org.br',
              'pubmed.ncbi.nlm.nih.gov',
              'who.int',
              'uptodate.com',
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    // Processa blocos de resposta incluindo resultados da busca
    const textBlocks = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Retorna resposta completa + texto consolidado
    return new Response(JSON.stringify({
      ...data,
      consolidated_text: textBlocks,
    }), {
      status: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
