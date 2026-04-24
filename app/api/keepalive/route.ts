import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.RENDER_SERVICE_URL
  if (url) {
    try {
      await fetch(`${url}/health`, { signal: AbortSignal.timeout(15000) })
    } catch {
      // ignore — render might be cold starting
    }
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
