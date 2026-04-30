import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { bulkSyncIntakes } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`SELECT * FROM intakes ORDER BY id ASC`
  await bulkSyncIntakes(rows)

  return NextResponse.json({ total: rows.length, ok: true })
}
