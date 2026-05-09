import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParts = req.query.path as string[]
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : pathParts

  const { path: _, ...params } = req.query
  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? '')])
    )
  ).toString()

  const url = `https://query1.finance.yahoo.com/${pathStr}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  const data = await response.json()
  res.status(response.status).json(data)
}
