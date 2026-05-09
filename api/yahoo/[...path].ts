import type { VercelRequest, VercelResponse } from '@vercel/node'

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
}

// Module-level cache
let authCache: { crumb: string; cookie: string; expiry: number } | null = null

async function getAuth(): Promise<{ crumb: string; cookie: string }> {
    if (authCache && Date.now() < authCache.expiry) return authCache

  // Use the well-known A=B cookie bypass that Yahoo accepts
  const cookie = 'A=B; YFC=cjpeg'

  // Try to get crumb using the cookie
  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
        try {
                const crumbRes = await fetch(`${host}/v1/test/getcrumb`, {
                          headers: {
                                      ...BROWSER_HEADERS,
                                      'Cookie': cookie,
                                      'Referer': 'https://finance.yahoo.com/',
                          },
                })
                if (crumbRes.ok) {
                          const crumb = await crumbRes.text()
                          if (crumb && crumb.length > 0 && !crumb.includes('<')) {
                                      authCache = { crumb, cookie, expiry: Date.now() + 20 * 60 * 1000 }
                                      return authCache
                          }
                }
        } catch {
                // try next
        }
  }

  // Fallback: visit Yahoo Finance to get real cookies
  const pageRes = await fetch('https://finance.yahoo.com/', {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
  })
    const rawCookies: string[] =
          typeof (pageRes.headers as any).getSetCookie === 'function'
        ? (pageRes.headers as any).getSetCookie()
            : (pageRes.headers.get('set-cookie') ?? '').split(/,(?=[^ ])/)
    const realCookie = rawCookies.map((c: string) => c.split(';')[0].trim()).filter(Boolean).join('; ')
    const useCookie = realCookie || cookie

  const crumbRes2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: { ...BROWSER_HEADERS, Cookie: useCookie, Referer: 'https://finance.yahoo.com/' },
  })
    const crumb2 = await crumbRes2.text()
    authCache = { crumb: crumb2, cookie: useCookie, expiry: Date.now() + 20 * 60 * 1000 }
    return authCache
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const pathParts = req.query.path as string[]
    const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : pathParts
    const { path: _, ...params } = req.query
    const queryParams: Record<string, string> = Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? '')])
        )

  res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    if (req.method === 'OPTIONS') return res.status(200).end()

  try {
        const { crumb, cookie } = await getAuth()
        queryParams.crumb = crumb
        const qs = new URLSearchParams(queryParams).toString()
        const reqHeaders = { ...BROWSER_HEADERS, Cookie: cookie, Referer: 'https://finance.yahoo.com/' }

      for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
              try {
                        const r = await fetch(`${host}/${pathStr}?${qs}`, { headers: reqHeaders })
                        if (r.ok) {
                                    const data = await r.json()
                                    return res.status(200).json(data)
                        }
              } catch {
                        // try next host
              }
      }

      // If crumb failed, invalidate cache and retry once
      authCache = null
        const { crumb: crumb2, cookie: cookie2 } = await getAuth()
        queryParams.crumb = crumb2
        const qs2 = new URLSearchParams(queryParams).toString()
        const reqHeaders2 = { ...BROWSER_HEADERS, Cookie: cookie2, Referer: 'https://finance.yahoo.com/' }

      for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
              try {
                        const r = await fetch(`${host}/${pathStr}?${qs2}`, { headers: reqHeaders2 })
                        if (r.ok) return res.status(200).json(await r.json())
              } catch {
                        // try next
              }
      }

      res.status(502).json({ error: 'Yahoo Finance unavailable' })
  } catch (err) {
        res.status(502).json({ error: String(err) })
  }
}
