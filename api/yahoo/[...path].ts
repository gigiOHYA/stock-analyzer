import type { VercelRequest, VercelResponse } from '@vercel/node'

const HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
]

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParts = req.query.path as string[]
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : pathParts

  const { path: _, ...params } = req.query
  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? '')])
    )
  ).toString()

  const suffix = `/${pathStr}${queryString ? '?' + queryString : ''}`

  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}${suffix}`, { headers: HEADERS })
      if (response.ok) {
        const data = await response.json()
        return res.status(200).json(data)
      }
    } catch {
      // try next host
    }
  }

  res.status(502).json({ error: 'Failed to fetch from Yahoo Finance' })
}
