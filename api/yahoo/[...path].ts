import type { VercelRequest, VercelResponse } from '@vercel/node'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
}

// Module-level cache — reused across warm function instances
let authCache: { crumb: string; cookie: string; expiry: number } | null = null

async function getAuth(): Promise<{ crumb: string; cookie: string }> {
  if (authCache && Date.now() < authCache.expiry) return authCache

  // Step 1: visit Yahoo Finance to get session cookies
  const pageRes = await fetch('https://finance.yahoo.com/', {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  const rawCookies: string[] =
    typeof (pageRes.headers as any).getSetCookie === 'function'
      ? (pageRes.headers as any).getSetCookie()
      : (pageRes.headers.get('set-cookie') ?? '').split(/,(?=[^ ])/)
  const cookie = rawCookies.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')

  // Step 2: fetch crumb using those cookies
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...BROWSER_HEADERS, Cookie: cookie, Referer: 'https://finance.yahoo.com/' },
  })
  const crumb = await crumbRes.text()

  authCache = { crumb, cookie, expiry: Date.now() + 25 * 60 * 1000 }
  return authCache
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParts = req.query.path as string[]
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : pathParts

  const { path: _, ...params } = req.query
  const queryParams: Record<string, string> = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? '')])
  )

  try {
    const { crumb, cookie } = await getAuth()
    queryParams.crumb = crumb
    const qs = new URLSearchParams(queryParams).toString()
    const reqHeaders = { ...BROWSER_HEADERS, Cookie: cookie, Referer: 'https://finance.yahoo.com/' }

    for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
      try {
        const r = await fetch(`${host}/${pathStr}?${qs}`, { headers: reqHeaders })
        if (r.ok) return res.status(200).json(await r.json())
      } catch { /* try next host */ }
    }

    res.status(502).json({ error: 'Yahoo Finance unavailable' })
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
}
