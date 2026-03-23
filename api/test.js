export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Responda apenas: OK' }],
      }),
    });

    const data = await response.json();
    return new Response(JSON.stringify({
      status: response.status,
      resposta: data.content?.[0]?.text || null,
      erro: data.error || null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ erro: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
