import crypto from 'crypto'

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
const CARD_SHEET_ID = '1gfrwOfTNGh27LlN4Qh032eVN84rtGJGdcXKXEV3DYO0'

// ── 報告總表同步 ──────────────────────────────────────────────

const REPORT_HEADERS = [
  '編號', '客戶名稱', '資料夾名稱', '品項代碼', '標籤碼',
  '鑑定卡號', '卡狀態', '建檔類型', '鑑定結果', '尺寸', '重量',
  '送驗日期', '報告日期', '備註', '形制資料', '真品預設',
  'XRF PDF', 'XRF圖', 'PDF路徑', '報告路徑', '操作員', '狀態',
  '建立時間', '更新時間',
]

const XRAY_HEADERS = [
  '編號', '客戶名稱', '條碼', '編碼', '拍攝品項', '品項備註',
  '主體照數量', 'X光照數量', '操作員', '備註', '建立時間',
]

const CUSTOMER_HEADERS = [
  '編號', '姓名', '性別', '電話', 'LINE', '生日', '居住地', '收藏品項', '備註', '建立時間',
]

let cachedToken: { token: string; expires: number } | null = null

async function getServiceAccountToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
  const key = JSON.parse(raw)
  // Railway may store \n as literal \\n — normalize back to real newlines
  if (key.private_key) key.private_key = key.private_key.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  const signing = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signing)
  const signature = sign.sign(key.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signing}.${signature}`,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  cachedToken = { token: data.access_token, expires: Date.now() + 3500 * 1000 }
  return data.access_token
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sheetReq(method: string, path: string, body?: unknown) {
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

// 取得試算表所有工作表名稱，找出第一個（報告清單用）
async function getSheetNames(): Promise<string[]> {
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.sheets ?? []).map((s: any) => s.properties.title as string)
}

// 確保指定工作表存在；不存在則新增
async function ensureSheet(title: string): Promise<void> {
  const names = await getSheetNames()
  if (names.includes(title)) return
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function intakeToRow(intake: Record<string, any>): string[] {
  return [
    String(intake.id ?? ''),
    String(intake.customer_name ?? ''),
    String(intake.folder_name ?? ''),
    String(intake.item_code ?? ''),
    String(intake.barcode ?? ''),
    String(intake.card_number ?? ''),
    String(intake.card_status ?? ''),
    String(intake.building_type ?? ''),
    String(intake.appraisal_result ?? ''),
    String(intake.size ?? ''),
    String(intake.weight ?? ''),
    String(intake.submission_date ?? ''),
    String(intake.report_date ?? ''),
    String(intake.note ?? ''),
    String(intake.category_data ?? ''),
    String(intake.genuine_preset ?? ''),
    String(intake.xrf_pdf_url ?? ''),
    String(intake.xrf_chart_url ?? ''),
    String(intake.pdf_path ?? ''),
    String(intake.report_path ?? ''),
    String(intake.operator ?? ''),
    String(intake.status ?? ''),
    String(intake.created_at ?? ''),
    String(intake.updated_at ?? ''),
  ]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function xrayToRow(r: Record<string, any>): string[] {
  let mainCount = 0, xrayCount = 0
  try { mainCount = JSON.parse(r.main_photos || '[]').length } catch { /* noop */ }
  try { xrayCount = JSON.parse(r.xray_photos || '[]').length } catch { /* noop */ }
  return [
    String(r.id ?? ''),
    String(r.customer_name ?? ''),
    String(r.barcode ?? ''),
    String(r.xray_code ?? ''),
    String(r.item_type ?? ''),
    String(r.item_type_custom ?? ''),
    String(mainCount),
    String(xrayCount),
    String(r.operator ?? ''),
    String(r.note ?? ''),
    String(r.created_at ?? ''),
  ]
}

async function syncToSheet(
  sheetTitle: string,
  headers: string[],
  rowId: string,
  rowData: string[],
) {
  await ensureSheet(sheetTitle)

  const data = await sheetReq('GET', `/values/${encodeURIComponent(sheetTitle)}!A:A`)
  const values: string[][] = data.values ?? []

  if (values.length === 0 || values[0]?.[0] !== headers[0]) {
    // 初始化表頭
    await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A1?valueInputOption=RAW`, { values: [headers] })
    await sheetReq('POST', `/values/${encodeURIComponent(sheetTitle)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: [rowData],
    })
    return
  }

  const idx = values.findIndex(r => r[0] === rowId)
  if (idx === -1) {
    await sheetReq('POST', `/values/${encodeURIComponent(sheetTitle)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: [rowData],
    })
  } else {
    await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A${idx + 1}?valueInputOption=RAW`, {
      values: [rowData],
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncIntake(intake: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.log('[sheets] skipped: env vars missing')
    return
  }
  console.log('[sheets] syncIntake start id=', intake.id)
  try {
    // 取得第一個工作表名稱作為「報告清單」的 tab
    const names = await getSheetNames()
    const reportTab = names[0] ?? 'Sheet1'
    console.log('[sheets] tabs=', names, 'using=', reportTab)

    await syncToSheet(reportTab, REPORT_HEADERS, String(intake.id), intakeToRow(intake))
    console.log('[sheets] syncIntake done id=', intake.id)
  } catch (e) {
    console.error('[sheets] syncIntake error:', e)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncXray(record: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.log('[sheets] skipped: env vars missing')
    return
  }
  console.log('[sheets] syncXray start id=', record.id)
  try {
    await syncToSheet('X光總表', XRAY_HEADERS, String(record.id), xrayToRow(record))
    console.log('[sheets] syncXray done id=', record.id)
  } catch (e) {
    console.error('[sheets] syncXray error:', e)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function customerToRow(r: Record<string, any>): string[] {
  let types: string[] = []
  try { types = JSON.parse(r.collection_types || '[]') } catch { /* noop */ }
  return [
    String(r.id ?? ''),
    String(r.name ?? ''),
    String(r.gender ?? ''),
    String(r.phone ?? ''),
    String(r.line_id ?? ''),
    String(r.birthday ?? ''),
    String(r.address ?? ''),
    types.join('、'),
    String(r.note ?? ''),
    String(r.created_at ?? ''),
  ]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncCustomer(record: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) return
  try {
    await syncToSheet('客戶名單', CUSTOMER_HEADERS, String(record.id), customerToRow(record))
  } catch (e) {
    console.error('[sheets] syncCustomer error:', e)
  }
}

export interface CardRecord {
  cardNumber: string
  status: string
  holder: string
  reportNumber: string
  category: string
  replacement: string
}

export async function lookupCard(cardNumber: string): Promise<CardRecord | null> {
  if (!SHEETS_API_KEY) return null

  const sheetNames = ['A800001~A800500', 'B201000~B201500', 'C503000~C503500']

  for (const sheet of sheetNames) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CARD_SHEET_ID}/values/${encodeURIComponent(sheet)}?key=${SHEETS_API_KEY}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      const rows: string[][] = data.values || []

      for (const row of rows.slice(1)) {
        if (row[0] === cardNumber) {
          return {
            cardNumber: row[0] || '',
            status: row[1] || '',
            holder: row[2] || '',
            reportNumber: row[3] || '',
            category: row[4] || '',
            replacement: row[5] || '',
          }
        }
      }
    } catch {
      continue
    }
  }
  return null
}
