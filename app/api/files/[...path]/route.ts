import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const filePath = path.resolve(path.join(UPLOAD_DIR, ...segments))

  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const data = await readFile(filePath)
    const ext = segments[segments.length - 1].split('.').pop()?.toLowerCase() || ''
    return new NextResponse(data, {
      headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' },
    })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
