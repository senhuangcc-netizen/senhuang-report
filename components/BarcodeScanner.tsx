'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (result: string) => void
  onClose: () => void
  keepOpen?: boolean  // 批次掃描：掃完不自動關閉，繼續等下一件
}

export default function BarcodeScanner({ onScan, onClose, keepOpen }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')
  const [lastScanned, setLastScanned] = useState('')

  const startScanner = useCallback(() => {
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (!divRef.current) return
      const id = keepOpen ? 'qr-reader-batch' : 'qr-reader'
      const scanner = new Html5QrcodeScanner(
        id,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      )
      scannerRef.current = scanner
      scanner.render(
        (text: string) => {
          if (keepOpen) {
            onScan(text)
            setLastScanned(text)
            scanner.clear?.().then(() => {
              setLastScanned('')
              startScanner()
            }).catch(() => {})
          } else {
            scanner.clear?.()
            onScan(text)
            onClose()
          }
        },
        (err: unknown) => { if (String(err).includes('No MultiFormat')) return; setError(String(err)) }
      )
    }).catch(() => setError('無法載入掃描器'))
  }, [keepOpen, onScan, onClose])

  useEffect(() => {
    startScanner()
    return () => { try { scannerRef.current?.clear?.() } catch { /* ignore */ } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const id = keepOpen ? 'qr-reader-batch' : 'qr-reader'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={keepOpen ? undefined : onClose}>
      <div className="bg-white rounded-2xl p-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">{keepOpen ? '批次掃描條碼' : '掃描 QR Code'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        {lastScanned && (
          <div className="mb-2 text-center text-green-600 text-sm font-medium animate-pulse">
            ✓ {lastScanned}
          </div>
        )}
        <div id={id} ref={divRef} />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {keepOpen ? (
          <button
            onClick={onClose}
            className="mt-3 w-full bg-green-600 text-white py-2 rounded-xl font-medium text-sm"
          >
            完成掃描
          </button>
        ) : (
          <p className="text-gray-400 text-xs mt-3 text-center">將 QR Code 對準鏡頭</p>
        )}
      </div>
    </div>
  )
}
