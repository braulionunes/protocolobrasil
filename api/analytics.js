// /api/analytics.js — Edge Function Vercel
// Retorna dados agregados do Supabase para o painel de analytics

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const url = new URL(req.url);
  const limit = url.searchParams.get('limit') || '500';
  const uf    = url.searchParams.get('uf')    || '';
  const esp   = url.searchParams.get('esp')   || '';
  const days  = url.searchParams.get('days')  || '';

  try {
    // Construir query string para Supabase
    let query = `${process.env.SUPABASE_URL}/rest/v1/consultas?select=crm,uf,especialidade,query,tipo,fonte_internacional,medicamentos,criado_em&limit=${limit}&order=criado_em.desc`;

    if (uf)   query += `&uf=eq.${encodeURIComponent(uf)}`;
    if (esp)  query += `&especialidade=eq.${encodeURIComponent(esp)}`;
    if (days) {
      const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
      query += `&criado_em=gte.${since}`;
    }

    const supaRes = await fetch(query, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!supaRes.ok) throw new Error(`Supabase error: ${supaRes.status}`);

    const rows = await supaRes.json();

    // Agrega aqui no servidor para reduzir payload ao frontend
    const total    = rows.length;
    const medicos  = new Set(rows.map(r => r.crm)).size;
    const estados  = new Set(rows.map(r => r.uf)).size;
    const pct_pcdt = total ? Math.round(rows.filter(r => r.tipo === 'k' || r.tipo === 'r').length / total * 100) : 0;
    const pct_intl = total ? Math.round(rows.filter(r => r.fonte_internacional).length / total * 100) : 0;

    // Por UF
    const por_uf = {};
    rows.forEach(r => {
      if (!r.uf) return;
      por_uf[r.uf] = (por_uf[r.uf] || 0) + 1;
    });

    // Por especialidade
    const por_esp = {};
    rows.forEach(r => {
      if (!r.especialidade) return;
      por_esp[r.especialidade] = (por_esp[r.especialidade] || 0) + 1;
    });

    // Por medicamento — dado estratégico para monetização
    const por_med = {};
    rows.forEach(r => {
      if (!r.medicamentos) return;
      const meds = Array.isArray(r.medicamentos) ? r.medicamentos : [r.medicamentos];
      meds.forEach(m => {
        if (!m) return;
        const nome = String(m).trim();
        if (nome) por_med[nome] = (por_med[nome] || 0) + 1;
      });
    });

    // Medicamentos por especialidade
    const med_por_esp = {};
    rows.forEach(r => {
      if (!r.medicamentos || !r.especialidade) return;
      if (!med_por_esp[r.especialidade]) med_por_esp[r.especialidade] = {};
      const meds = Array.isArray(r.medicamentos) ? r.medicamentos : [r.medicamentos];
      meds.forEach(m => {
        if (!m) return;
        const nome = String(m).trim();
        if (nome) med_por_esp[r.especialidade][nome] = (med_por_esp[r.especialidade][nome] || 0) + 1;
      });
    });

    // Medicamentos por UF
    const med_por_uf = {};
    rows.forEach(r => {
      if (!r.medicamentos || !r.uf) return;
      if (!med_por_uf[r.uf]) med_por_uf[r.uf] = {};
      const meds = Array.isArray(r.medicamentos) ? r.medicamentos : [r.medicamentos];
      meds.forEach(m => {
        if (!m) return;
        const nome = String(m).trim();
        if (nome) med_por_uf[r.uf][nome] = (med_por_uf[r.uf][nome] || 0) + 1;
      });
    });

    // Série temporal (por dia)
    const por_dia = {};
    rows.forEach(r => {
      const d = (r.criado_em || '').slice(0, 10);
      if (!d) return;
      if (!por_dia[d]) por_dia[d] = { total: 0, pcdt: 0, intl: 0 };
      por_dia[d].total++;
      if (r.tipo === 'k' || r.tipo === 'r') por_dia[d].pcdt++;
      if (r.fonte_internacional) por_dia[d].intl++;
    });

    return new Response(JSON.stringify({
      total, medicos, estados, pct_pcdt, pct_intl,
      por_uf, por_esp, por_dia,
      por_med, med_por_esp, med_por_uf,
      rows_recentes: rows.slice(0, 50), // só as 50 mais recentes para a tabela preview
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
