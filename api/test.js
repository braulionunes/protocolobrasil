export const config = { runtime: 'edge' };

export default async function handler(req) {
  const key = process.env.ANTHROPIC_API_KEY || 'NAO_ENCONTRADA';
  return new Response(JSON.stringify({
    key_exists: !!process.env.ANTHROPIC_API_KEY,
    key_preview: key.substring(0, 15) + '...',
    key_length: key.length,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
