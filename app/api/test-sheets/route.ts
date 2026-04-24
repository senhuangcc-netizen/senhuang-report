import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!raw) return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY not set' }, { status: 500 })
  if (!sheetId) return NextResponse.json({ error: 'GOOGLE_SHEET_ID not set' }, { status: 500 })

  let key: Record<string, string>
  try {
    key = JSON.parse(raw)
    if (key.private_key) key.private_key = key.private_key.replace(/\\n/g, '\n')
  } catch (e) {
    return NextResponse.json({ error: 'JSON.parse failed', detail: String(e) }, { status: 500 })
  }

  // Build JWT
  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  let token: string
  try {
    const signing = `${header}.${payload}`
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signing)
    const sig = sign.sign(key.private_key, 'base64url')
    const assertion = `${signing}.${sig}`

    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    const td = await tr.json()
    if (!td.access_token) return NextResponse.json({ error: 'Token failed', detail: td }, { status: 500 })
    token = td.access_token
  } catch (e) {
    return NextResponse.json({ error: 'JWT/token error', detail: String(e) }, { status: 500 })
  }

  // Try reading the sheet (first try Sheet1, then 工作表1)
  const results: Record<string, unknown> = { sheetId, clientEmail: key.client_email }
  for (const sheetName of ['Sheet1', '工作表1', 'sheet1']) {
    const r = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName + '!A1:A3')}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const d = await r.json()
    results[sheetName] = { status: r.status, body: d }
  }

  return NextResponse.json({ ok: true, ...results })
}
