'use client'
import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import Link from 'next/link'

function makeCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const prefix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `${prefix}${letter}${digits}`
}

export default function LabelsPage() {
  const [cols, setCols] = useState(4)
  const [rows, setRows] = useState(6)
  const [labelW, setLabelW] = useState(50)   // mm
  const [labelH, setLabelH] = useState(47)   // mm
  const count = cols * rows

  const [codes, setCodes] = useState<string[]>([])
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})

  const generate = useCallback(async () => {
    const next = Array.from({ length: count }, makeCode)
    setCodes(next)
    const urls: Record<string, string> = {}
    await Promise.all(next.map(async code => {
      urls[code] = await QRCode.toDataURL(code, { width: 180, margin: 1, errorCorrectionLevel: 'M' })
    }))
    setQrUrls(urls)
  }, [count])

  useEffect(() => { generate() }, [generate])

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .label-page { padding: 5mm; }
          .label-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 0;
            width: ${cols * labelW}mm;
          }
          .label-cell {
            width: ${labelW}mm;
            height: ${labelH}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 0.3mm solid #ccc;
            box-sizing: border-box;
            padding: 2mm;
          }
          .label-cell img { width: ${labelW - 14}mm; height: ${labelW - 14}mm; }
          .label-cell p { font-size: 7pt; font-family: monospace; margin: 1mm 0 0; letter-spacing: 0.5px; }
          @page { size: A4; margin: 5mm; }
        }
      `}</style>

      <div className="label-page">
        {/* 操作列 */}
        <div className="no-print flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
          <h1 className="font-bold text-gray-800">批量標籤產生（24 格 A4）</h1>
          {/* 尺寸控制 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>欄</span>
            <input type="number" min={1} max={8} value={cols} onChange={e => setCols(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center" />
            <span>列</span>
            <input type="number" min={1} max={12} value={rows} onChange={e => setRows(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center" />
            <span className="ml-2">寬</span>
            <input type="number" min={20} max={100} value={labelW} onChange={e => setLabelW(Number(e.target.value))}
              className="w-14 border border-gray-200 rounded px-1 py-0.5 text-center" />
            <span>mm</span>
            <span className="ml-1">高</span>
            <input type="number" min={20} max={100} value={labelH} onChange={e => setLabelH(Number(e.target.value))}
              className="w-14 border border-gray-200 rounded px-1 py-0.5 text-center" />
            <span>mm</span>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={generate}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              重新產生
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
            >
              列印
            </button>
          </div>
        </div>

        {/* 標籤格 */}
        <div className="no-print p-4 text-xs text-gray-400">
          列印後以裁紙機沿格線裁切。共 {count} 枚標籤。
        </div>

        <div
          className="label-grid mx-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            width: 'fit-content',
            border: '1px solid #e5e7eb',
          }}
        >
          {codes.map(code => (
            <div
              key={code}
              className="label-cell"
              style={{
                width: `${labelW}mm`,
                height: `${labelH}mm`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                boxSizing: 'border-box',
                padding: '2mm',
              }}
            >
              {qrUrls[code]
                ? <img src={qrUrls[code]} alt={code} style={{ width: `${labelW - 14}mm`, height: `${labelW - 14}mm` }} />
                : <div style={{ width: `${labelW - 14}mm`, height: `${labelW - 14}mm`, background: '#f3f4f6' }} />
              }
              <p style={{ fontSize: '7pt', fontFamily: 'monospace', margin: '1mm 0 0', letterSpacing: '0.5px' }}>
                {code}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
