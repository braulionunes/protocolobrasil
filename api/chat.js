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
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: system || '',
        messages,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
          allowed_domains: [
            'gov.br',
            'conitec.gov.br',
            'saude.gov.br',
            'ans.gov.br',
            'cfm.org.br',
            'pubmed.ncbi.nlm.nih.gov',
            'who.int',
            'sbcardiologia.org.br',
            'reumatologia.org.br',
            'sbp.com.br',
            'sbpt.org.br',
            'sbgastro.org.br',
            'sbn.org.br',
          ],
        }],
      }),
    });

    const data = await r.json();

    // Consolida todos os blocos de texto (incluindo resultados de busca)
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    return res.status(r.status).json({ ...data, consolidated_text: text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = { maxDuration: 60 };
