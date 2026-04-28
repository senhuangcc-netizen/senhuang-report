import { NextResponse } from 'next/server'
import { reorganizeAllSheets } from '@/lib/sheets'

export async function POST() {
  try {
    await reorganizeAllSheets()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sheets/reorganize]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
