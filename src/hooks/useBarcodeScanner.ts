import { useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

const SCAN_COOLDOWN_MS = 2500

/**
 * 从已有 video 元素持续识别条形码；同一码在冷却期内不重复触发。
 */
export function useBarcodeScanner(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onDetected: (barcode: string) => void,
) {
  const onDetectedRef = useRef(onDetected)
  const lastDetectedRef = useRef<{ barcode: string; at: number } | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    if (!active) {
      lastDetectedRef.current = null
      return
    }

    const video = videoRef.current
    if (!video) return

    const reader = new BrowserMultiFormatReader()
    let controls: { stop: () => void } | null = null
    let stopped = false

    void reader
      .decodeFromVideoElement(video, (result) => {
        if (stopped || !result) return
        const barcode = result.getText().trim()
        if (!barcode) return

        const now = Date.now()
        const last = lastDetectedRef.current
        if (
          last &&
          last.barcode === barcode &&
          now - last.at < SCAN_COOLDOWN_MS
        ) {
          return
        }

        lastDetectedRef.current = { barcode, at: now }
        onDetectedRef.current(barcode)
      })
      .then((scannerControls) => {
        controls = scannerControls
      })
      .catch(() => {
        // 摄像头尚未就绪时忽略，video 就绪后会由 effect 重跑
      })

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [active, videoRef])
}
