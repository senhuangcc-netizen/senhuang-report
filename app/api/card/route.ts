import { NextRequest, NextResponse } from 'next/server'
import { lookupCard } from '@/lib/sheets'

export async function GET(req: NextRequest) {
  const cardNumber = req.nextUrl.searchParams.get('number')
  if (!cardNumber) return NextResponse.json({ error: '請輸入卡號' }, { status: 400 })

  const record = await lookupCard(cardNumber)
  if (!record) return NextResponse.json({ error: '查無此卡號' }, { status: 404 })

  return NextResponse.json(record)
}
