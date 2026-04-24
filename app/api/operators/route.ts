import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'

const DEFAULTS = ['所長', '助理A', '助理B', '助理C']

export async function GET() {
  const { rows } = await sql`SELECT name FROM operators ORDER BY created_at ASC`
  if (rows.length === 0) {
    for (const name of DEFAULTS) {
      await sql`INSERT INTO operators (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`
    }
    return NextResponse.json(DEFAULTS)
  }
  return NextResponse.json(rows.map(r => r.name))
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '名稱不能為空' }, { status: 400 })
  await sql`INSERT INTO operators (name) VALUES (${name.trim()}) ON CONFLICT (name) DO NOTHING`
  const { rows } = await sql`SELECT name FROM operators ORDER BY created_at ASC`
  return NextResponse.json(rows.map(r => r.name))
}
