import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const folder = formData.get('folder') as string
  const category = (formData.get('category') as string) || '主體照'

  if (!file || !folder) return NextResponse.json({ error: '缺少檔案或資料夾' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'bin'
  const relativePath = `intakes/${folder}/${category}/${Date.now()}.${ext}`
  const fullPath = path.join(UPLOAD_DIR, relativePath)

  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ path: `/api/files/${relativePath}`, filename: relativePath })
}
