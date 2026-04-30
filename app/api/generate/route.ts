import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { sql, ensureSchema, logAudit } from '@/lib/db'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require('pizzip')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require('docxtemplater')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DocUtils = require('docxtemplater').DocUtils
// patch: convertPixelsToEmus was removed in docxtemplater v3.x but image module still needs it
if (!DocUtils.convertPixelsToEmus) {
  DocUtils.convertPixelsToEmus = (px: number) => Math.round(px * 9525)
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageModuleRaw = require('docxtemplater-image-module-free')
const ImageModule = ImageModuleRaw.default ?? ImageModuleRaw
import { BASE_DOCX_B64 } from '@/lib/template'

type PhotoRecord = { category: string; path: string }
type CD = Record<string, string | string[]>

function cdVal(cd: CD, key: string): string {
  const v = cd[key]
  if (Array.isArray(v)) return v.join('、')
  return typeof v === 'string' ? v : ''
}

function pickPhotos(photosJson: string) {
  const photos: PhotoRecord[] = JSON.parse(photosJson || '[]')
  const byCategory = (cat: string) => photos.filter(p => p.category === cat).map(p => p.path)
  const body = byCategory('主體照')
  const micro = byCategory('顯微照')
  return { front: body[0] ?? null, micro1: micro[0] ?? null, micro2: micro[1] ?? null }
}

function fmtDate(s?: string): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d}/${mn[parseInt(m)-1]}/${y}`
}

function groupZhEn(texts: string[]): string {
  const zh: string[] = []; const en: string[] = []
  for (const t of texts) {
    const cleaned = t.replace(/\s*\[.*?\]/g, '').replace(/_/g, ' ').trim()
    for (const token of cleaned.split(/\s+/)) {
      if (!token) continue
      if (/[一-鿿]/.test(token)) zh.push(token)
      else en.push(token)
    }
  }
  return [zh.join(''), en.join(' ')].filter(Boolean).join(' ')
}

function buildCategory(cd: CD): string {
  const final = cdVal(cd, '形制_final')
  if (final) return final
  const keys = ['師父出處','師傅出處','形制','形制_器形','形制_年代','形制_朝代','形制_紋飾','形制_材質','期數','期數紀年']
  return groupZhEn(keys.map(k => cdVal(cd, k)).filter(Boolean))
}

function buildMaterial(cd: CD): string {
  const final = cdVal(cd, '材質_final')
  if (final) return final
  const v = cd['材質']
  const items = Array.isArray(v) ? v as string[] : (v ? [v] : [])
  return groupZhEn(items)
}

function buildDescription(cd: CD): string {
  const final = cdVal(cd, '鑑定說明_final')
  if (final) return final
  const parts: string[] = []
  ;['說明A','說明B','說明C'].forEach(k => {
    const v = cd[k]
    if (Array.isArray(v)) parts.push(...v)
    else if (typeof v === 'string' && v) parts.push(v)
  })
  return parts.join('，')
}

async function fetchImageBuffer(url: string | null): Promise<Buffer> {
  if (!url) return BLANK_PNG
  try {
    if (url.startsWith('/api/files/')) {
      const relativePath = url.slice('/api/files/'.length)
      return await readFile(path.join(UPLOAD_DIR, relativePath))
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return BLANK_PNG
    return Buffer.from(await res.arrayBuffer())
  } catch { return BLANK_PNG }
}

async function saveDocx(buffer: Buffer, filename: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const relativePath = `reports/${date}/${filename}`
  const fullPath = path.join(UPLOAD_DIR, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buffer)
  return `/api/files/${relativePath}`
}

// 尺寸對應 DraftPreview HTML：col1=44%=7.00cm=265px，col2+3=56%=8.92cm=337px
// row1 高 7.28cm=275px，row2 高 6.75cm=255px（@96dpi）
const IMAGE_SIZES: Record<string, [number, number]> = {
  photo_front:  [265, 275],
  photo_xrf:    [337, 275],
  photo_micro1: [265, 255],
  photo_micro2: [337, 255],
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const { intakeId, operator } = await req.json()

  const { rows } = await sql`SELECT * FROM intakes WHERE id = ${intakeId}`
  const intake = rows[0]
  if (!intake) return NextResponse.json({ error: '找不到建單' }, { status: 404 })

  const cd: CD = JSON.parse(intake.category_data || '{}')
  const { front, micro1, micro2 } = pickPhotos(intake.photos)
  const xrfUrl: string | null = intake.xrf_chart_url || null

  const [frontBuf, xrfBuf, micro1Buf, micro2Buf] = await Promise.all([
    fetchImageBuffer(front),
    fetchImageBuffer(xrfUrl),
    fetchImageBuffer(micro1),
    fetchImageBuffer(micro2),
  ])

  try {
    const templateBuf = Buffer.from(BASE_DOCX_B64, 'base64')
    const zip = new PizZip(templateBuf)

    // tagValue is a string key; we look up the pre-fetched buffer from this map.
    // Passing Buffer directly would fail because the module treats any object as
    // a pre-resolved { rId, sizePixel } and skips the normal rendering path.
    const imageBuffers: Record<string, Buffer> = {
      photo_front: frontBuf, photo_xrf: xrfBuf,
      photo_micro1: micro1Buf, photo_micro2: micro2Buf,
    }
    const imageModule = new ImageModule({
      centered: false,
      getImage: (key: string) => imageBuffers[key] ?? BLANK_PNG,
      getSize: (_img: Buffer, _val: unknown, tagName: string) =>
        IMAGE_SIZES[tagName] ?? [300, 250],
    })

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    })

    const category = buildCategory(cd)
    const sizeUnit = ['古銅器', '瓷器'].includes(intake.building_type || '') ? 'cm' : 'mm'

    doc.render({
      item_code:       intake.item_code || '',
      submission_date: fmtDate(intake.submission_date),
      report_date:     fmtDate(intake.report_date),
      presumed:        category || intake.genuine_preset || '',
      category,
      material:        buildMaterial(cd),
      size:            intake.size ? `${intake.size} ${sizeUnit}` : '—',
      weight:          intake.weight || '—',
      description:     buildDescription(cd),
      result:          intake.appraisal_result || '—',
      note:            intake.note || '',
      photo_front:  'photo_front',
      photo_xrf:    'photo_xrf',
      photo_micro1: 'photo_micro1',
      photo_micro2: 'photo_micro2',
    })

    const outputBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    const filename = `${intake.item_code || `intake_${intakeId}`}_${Date.now()}.docx`
    const reportUrl = await saveDocx(outputBuf, filename)

    await sql`UPDATE intakes SET report_path = ${reportUrl}, status = 'completed', updated_at = NOW() WHERE id = ${intakeId}`
    await logAudit(intakeId, operator ?? '', '生成報告', reportUrl)

    return NextResponse.json({ success: true, report_url: reportUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// 1×1 透明 PNG（圖片缺失時的佔位）
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)
