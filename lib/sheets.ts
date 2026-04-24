const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
const CARD_SHEET_ID = '1gfrwOfTNGh27LlN4Qh032eVN84rtGJGdcXKXEV3DYO0'

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
