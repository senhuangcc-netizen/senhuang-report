import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    version: process.env.VERCEL_DEPLOYMENT_ID ?? 'dev',
  })
}
