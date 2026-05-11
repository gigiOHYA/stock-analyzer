import type { VercelRequest, VercelResponse } from '@vercel/node'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const log: Record<string, unknown> = {}

  try {
    const pageRes = await fetch('https://finance.yahoo.com/', {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    })
    log.pageStatus = pageRes.status

    const rawCookies: string[] =
      typeof (pageRes.headers as any).getSetCookie === 'function'
        ? (pageRes.headers as any).getSetCookie()
        : (pageRes.headers.get('set-cookie') ?? '').split(/,(?=[^ ])/)
    const cookie = rawCookies.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
    log.cookiePreview = cookie.slice(0, 120)

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...BROWSER_HEADERS, Cookie: cookie, Referer: 'https://finance.yahoo.com/' },
    })
    log.crumbStatus = crumbRes.status
    const crumb = await crumbRes.text()
    log.crumb = crumb

    const chartRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5d&crumb=${encodeURIComponent(crumb)}`,
      { headers: { ...BROWSER_HEADERS, Cookie: cookie, Referer: 'https://finance.yahoo.com/' } }
    )
    log.chartStatus = chartRes.status
    const chartText = await chartRes.text()
    log.chartPreview = chartText.slice(0, 300)
  } catch (err) {
    log.error = String(err)
  }

  res.status(200).json(log)
}
