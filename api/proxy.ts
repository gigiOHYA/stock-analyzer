import type { VercelRequest, VercelResponse } from '@vercel/node'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path, ...rest } = req.query
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing path param' })
  }

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? '')]))
  ).toString()

  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const r = await fetch(`${host}/${path}${qs ? '?' + qs : ''}`, { headers: HEADERS })
      if (r.ok) return res.status(200).json(await r.json())
    } catch { /* try next */ }
  }

  res.status(502).json({ error: 'Yahoo Finance unavailable' })
}
