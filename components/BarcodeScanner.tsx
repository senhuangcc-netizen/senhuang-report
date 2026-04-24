'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (result: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (!divRef.current) return
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      )
      scannerRef.current = scanner
      scanner.render(
        (text: string) => { scanner.clear?.(); onScan(text); onClose() },
        (err: unknown) => { if (String(err).includes('No MultiFormat')) return; setError(String(err)) }
      )
    }).catch(() => setError('無法載入掃描器'))

    return () => { try { scannerRef.current?.clear?.() } catch { /* ignore */ } }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">掃描 QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div id="qr-reader" ref={divRef} />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <p className="text-gray-400 text-xs mt-3 text-center">將 QR Code 對準鏡頭</p>
      </div>
    </div>
  )
}
