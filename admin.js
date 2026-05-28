// api/admin.js — Vercel Serverless Function
// La service_role key NUNCA sale de este servidor.
// El HTML solo puede llamar este endpoint si está autenticado.

const SB_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // token secreto que genera el panel

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar token de admin enviado en el header
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { action, key, value } = req.body;

  if (!action || !key) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  try {
    if (action === 'set') {
      // Escritura a Supabase con service_role (ignora RLS)
      const sbRes = await fetch(`${SB_URL}/rest/v1/store`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
      });

      if (!sbRes.ok) {
        const err = await sbRes.text();
        return res.status(500).json({ error: 'Supabase error', detail: err });
      }

      return res.status(200).json({ ok: true });

    } else if (action === 'delete') {
      const sbRes = await fetch(
        `${SB_URL}/rest/v1/store?key=eq.${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`
          }
        }
      );

      if (!sbRes.ok) {
        const err = await sbRes.text();
        return res.status(500).json({ error: 'Supabase error', detail: err });
      }

      return res.status(200).json({ ok: true });

    } else {
      return res.status(400).json({ error: 'Acción no reconocida' });
    }

  } catch (e) {
    return res.status(500).json({ error: 'Error interno', detail: e.message });
  }
}
