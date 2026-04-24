import crypto from 'crypto'

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
const CARD_SHEET_ID = '1gfrwOfTNGh27LlN4Qh032eVN84rtGJGdcXKXEV3DYO0'

// ── 報告總表同步 ──────────────────────────────────────────────

const REPORT_HEADERS = [
  '編號', '客戶名稱', '資料夾名稱', '品項代碼', '標籤碼',
  '鑑定卡號', '卡狀態', '建築類型', '鑑定結果', '尺寸', '重量',
  '送驗日期', '報告日期', '備註', '形制資料', '真品預設',
  'XRF PDF', 'XRF圖', 'PDF路徑', '報告路徑', '操作員', '狀態',
  '建立時間', '更新時間',
]

let cachedToken: { token: string; expires: number } | null = null

async function getServiceAccountToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
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
async function reportSheetReq(method: string, path: string, body?: unknown) {
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
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
export async function syncIntake(intake: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) return
  try {
    const data = await reportSheetReq('GET', '/values/Sheet1!A:A')
    const values: string[][] = data.values ?? []

    if (values.length === 0 || values[0]?.[0] !== '編號') {
      await reportSheetReq('PUT', '/values/Sheet1!A1?valueInputOption=RAW', { values: [REPORT_HEADERS] })
      await reportSheetReq('POST', '/values/Sheet1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
        values: [intakeToRow(intake)],
      })
      return
    }

    const intakeId = String(intake.id)
    const rowIndex = values.findIndex((r) => r[0] === intakeId)

    if (rowIndex === -1) {
      await reportSheetReq('POST', '/values/Sheet1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
        values: [intakeToRow(intake)],
      })
    } else {
      await reportSheetReq('PUT', `/values/Sheet1!A${rowIndex + 1}?valueInputOption=RAW`, {
        values: [intakeToRow(intake)],
      })
    }
  } catch (e) {
    console.error('[sheets] sync error:', e)
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
