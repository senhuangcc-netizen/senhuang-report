import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { sql, ensureSchema } from '@/lib/db'
import { XRAY_DOCX_B64 } from '@/lib/xray_template'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp')

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require('pizzip')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require('docxtemplater')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DocUtils = require('docxtemplater').DocUtils
if (!DocUtils.convertPixelsToEmus) {
  DocUtils.convertPixelsToEmus = (px: number) => Math.round(px * 9525)
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageModuleRaw = require('docxtemplater-image-module-free')
const ImageModule = ImageModuleRaw.default ?? ImageModuleRaw

const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

const ITEM_OPTIONS = [
  { key: '金屬',    en: 'Metal' },
  { key: '木質',    en: 'Wood' },
  { key: '陶瓷',    en: 'Ceramic' },
  { key: '泥質',    en: 'Clay' },
  { key: '礦物玉石', en: 'Mineral Stone' },
  { key: '塑料',    en: 'Plastic' },
  { key: '其他',    en: 'Other' },
]

const ANGLE_OPTIONS = [
  { key: '正面',   en: 'Front' },
  { key: '頂部',   en: 'Top' },
  { key: '底部',   en: 'Bottom' },
  { key: '側面',   en: 'Side' },
  { key: '俯/仰角', en: 'High/Low Angle' },
  { key: '其他',   en: 'Other' },
]

function buildCheckboxLine(
  options: { key: string; en: string }[],
  selected: string,
  custom?: string | null
): string {
  return options
    .map(o => {
      const checked = o.key === selected || (o.key === '其他' && selected === '其他')
      const mark = checked ? '☑' : '□'
      const label = o.key === '其他' && checked && custom
        ? `其他 Other: ${custom}`
        : `${o.key} ${o.en}`
      return `${mark}${label}`
    })
    .join('  ')
}

function fmtDate(d: Date): string {
  const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2,'0')}/${mn[d.getMonth()]}/${d.getFullYear()}`
}

async function fetchBuf(url: string | null): Promise<Buffer> {
  if (!url) return BLANK_PNG
  try {
    if (url.startsWith('/api/files/')) {
      return await readFile(path.join(UPLOAD_DIR, url.slice('/api/files/'.length)))
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return BLANK_PNG
    return Buffer.from(await res.arrayBuffer())
  } catch { return BLANK_PNG }
}

// 將圖片轉為 sRGB JPEG 並裁切為格子尺寸（554×642），解決色彩空間反綠問題
async function normalizeForWord(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf)
      .resize(554, 642, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toBuffer()
  } catch {
    return buf
  }
}

async function saveDocx(buf: Buffer, filename: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rel  = `reports/${date}/${filename}`
  const full = path.join(UPLOAD_DIR, rel)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, buf)
  return `/api/files/${rel}`
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema()
  const { id } = await params
  const { rows } = await sql`SELECT * FROM xray_records WHERE id = ${parseInt(id)}`
  const rec = rows[0]
  if (!rec) return NextResponse.json({ error: '找不到紀錄' }, { status: 404 })

  const xrayPhotos: string[] = JSON.parse(rec.xray_photos || '[]')
  const xrayUrl = xrayPhotos[0] ?? null
  const xrayBuf = await normalizeForWord(await fetchBuf(xrayUrl))

  const item_line  = buildCheckboxLine(ITEM_OPTIONS,  rec.item_type  || '', rec.item_type_custom)
  const angle_line = buildCheckboxLine(ANGLE_OPTIONS, rec.angle      || '', rec.angle_custom)

  try {
    const templateBuf = Buffer.from(XRAY_DOCX_B64, 'base64')
    const zip = new PizZip(templateBuf)

    const imgBufs: Record<string, Buffer> = { photo_xray: xrayBuf }
    const imageModule = new ImageModule({
      centered: false,
      getImage: (key: string) => imgBufs[key] ?? BLANK_PNG,
      getSize: () => [554, 642],
    })

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render({
      xray_code:  rec.xray_code || '',
      date:       fmtDate(new Date(rec.created_at)),
      item_line,
      angle_line,
      note:       rec.note || '',
      photo_xray: 'photo_xray',
    })

    const outBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    const filename = `X光照_${rec.xray_code || `xray_${id}`}.docx`
    const docUrl = await saveDocx(outBuf, filename)

    await sql`UPDATE xray_records SET doc_url = ${docUrl}, updated_at = NOW() WHERE id = ${parseInt(id)}`

    return NextResponse.json({ success: true, doc_url: docUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[xray/generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
