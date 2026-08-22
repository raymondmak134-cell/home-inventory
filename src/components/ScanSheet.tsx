import { useEffect, useId, useRef, useState } from 'react'

type ScanSheetProps = {
  open: boolean
  onClose: () => void
  /** 「无条形码？手动添加」入口，交互后补 */
  onManualAdd?: () => void
}

type Phase = 'closed' | 'entering' | 'open' | 'closing'

/** 与 App.css 中 .scan-sheet 的过渡时长保持一致（含少量余量） */
const EXIT_DURATION_MS = 360

/**
 * 扫码入库底部弹窗：从页面底部向上滑出，顶部 24px 圆角，高度随内容自适应。
 * 打开时调取摄像头（后置优先）在扫码框内预览；条码识别等交互后补。
 */
export function ScanSheet({ open, onClose, onManualAdd }: ScanSheetProps) {
  const titleId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const [prevOpen, setPrevOpen] = useState(open)
  const [cameraError, setCameraError] = useState('')

  if (prevOpen !== open) {
    setPrevOpen(open)
    setPhase(open ? 'entering' : 'closing')
    if (open) setCameraError('')
  }

  useEffect(() => {
    if (phase !== 'entering') return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('open'))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'closing') return
    const timer = window.setTimeout(() => setPhase('closed'), EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  const cameraActive = phase === 'entering' || phase === 'open'

  useEffect(() => {
    if (!cameraActive) return
    const video = videoRef.current
    let cancelled = false
    let stream: MediaStream | null = null

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('camera-unsupported')
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        await tuneCameraTrack(stream.getVideoTracks()[0])
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
      } catch {
        if (!cancelled) setCameraError('无法访问摄像头，请检查相机权限后重试')
      }
    })()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [cameraActive])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (phase === 'closed') return null

  return (
    <div
      className={phase === 'open' ? 'scan-sheet is-open' : 'scan-sheet'}
      role="presentation"
    >
      <button
        type="button"
        className="scan-sheet__backdrop"
        aria-label="关闭弹窗"
        onClick={onClose}
      />
      <div
        className="scan-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="scan-sheet__header">
          <h2 id={titleId} className="scan-sheet__title">
            扫码入库
          </h2>
          <button
            type="button"
            className="scan-sheet__close"
            aria-label="关闭"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="scan-sheet__frame">
          <video
            ref={videoRef}
            className="scan-sheet__video"
            playsInline
            muted
            autoPlay
          />
          {cameraError ? (
            <p className="scan-sheet__camera-hint">{cameraError}</p>
          ) : null}
        </div>

        <p className="scan-sheet__caption">请扫描商品包装上的条形码快速入库</p>

        <button type="button" className="scan-sheet__manual" onClick={onManualAdd}>
          无条形码？手动添加
        </button>
      </div>
    </div>
  )
}

/** 部分安卓机型默认倍率偏大且不自动对焦：能力允许时倍率归 1、开启连续对焦。 */
type ExtendedCapabilities = MediaTrackCapabilities & {
  zoom?: { min?: number; max?: number }
  focusMode?: string[]
}

async function tuneCameraTrack(track: MediaStreamTrack | undefined) {
  if (!track || typeof track.getCapabilities !== 'function') return
  try {
    const capabilities = track.getCapabilities() as ExtendedCapabilities
    const advanced: Record<string, unknown>[] = []

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' })
    }

    if (capabilities.zoom && typeof capabilities.zoom.min === 'number') {
      const min = capabilities.zoom.min
      const max = typeof capabilities.zoom.max === 'number' ? capabilities.zoom.max : min
      advanced.push({ zoom: Math.min(Math.max(1, min), max) })
    }

    if (advanced.length > 0) {
      await track.applyConstraints({ advanced } as MediaTrackConstraints)
    }
  } catch {
    // 能力协商失败时保留默认画面，不影响预览
  }
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
