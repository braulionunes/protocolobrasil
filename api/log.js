// /api/log.js — Edge Function Vercel
// Salva cada consulta anonimizada no Supabase (banco centralizado)

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { crm, uf, esp, query, tipo, intl, medicamentos } = await req.json();

    if (!crm || !uf || !query) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Insert no Supabase via REST API
    const supaRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/consultas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        crm,
        uf,
        especialidade: esp,
        query,
        tipo,
        fonte_internacional: intl,
        medicamentos: medicamentos || null,
        criado_em: new Date().toISOString(),
      }),
    });

    if (!supaRes.ok) {
      const err = await supaRes.text();
      throw new Error(`Supabase error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
