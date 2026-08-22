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

        // 多后摄机型（如 OPPO Find X8 Ultra）environment 可能命中长焦/微距，
        // 授权后按能力挑选主摄并切换。
        const preferredId = await pickMainRearCameraId(
          stream.getVideoTracks()[0]?.getSettings().deviceId,
        )
        if (preferredId && !cancelled) {
          const next = await navigator.mediaDevices
            .getUserMedia({
              video: {
                deviceId: { exact: preferredId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            })
            .catch(() => null)
          if (next) {
            stream.getTracks().forEach((track) => track.stop())
            stream = next
          }
        }
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

/** 副摄关键词：长焦 / 微距 / 超广角 / 景深等，扫码应避开 */
const AUX_CAMERA_PATTERN =
  /tele|zoom|长焦|potrait|portrait|macro|微距|ultra|超广|wide[- ]?angle|depth|景深|bokeh|mono|黑白|ir\b/i

/**
 * 在多后摄机型上挑选适合扫码的主摄：
 * 过滤出后置摄像头，排除长焦/微距等副摄，优先支持连续对焦、
 * 变焦下限不超过 1 的设备，同编号越小越可能是主摄。
 * 返回 null 表示无需切换（无更优选择或与当前一致）。
 */
async function pickMainRearCameraId(
  currentDeviceId: string | undefined,
): Promise<string | null> {
  if (!navigator.mediaDevices?.enumerateDevices) return null
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const candidates = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device) => {
        let caps: ExtendedCapabilities | null = null
        if ('getCapabilities' in device && typeof device.getCapabilities === 'function') {
          try {
            caps = device.getCapabilities() as ExtendedCapabilities
          } catch {
            caps = null
          }
        }
        return { id: device.deviceId, label: device.label.toLowerCase(), caps }
      })

    const rear = candidates.filter(
      (candidate) =>
        candidate.caps?.facingMode?.includes('environment') ||
        /back|rear|environment|后置/.test(candidate.label),
    )
    // 只有一个后摄（或识别不出朝向）时不做切换
    if (rear.length <= 1) return null

    let pool = rear.filter((candidate) => !AUX_CAMERA_PATTERN.test(candidate.label))
    if (pool.length === 0) pool = rear

    const focusable = pool.filter((candidate) =>
      candidate.caps?.focusMode?.includes('continuous'),
    )
    if (focusable.length > 0) pool = focusable

    // 主摄一般支持 1x（甚至更低）起步的变焦；剔除起步倍率明显偏大的镜头
    const normalZoom = pool.filter((candidate) => {
      const min = candidate.caps?.zoom?.min
      return typeof min !== 'number' || min <= 1
    })
    if (normalZoom.length > 0) pool = normalZoom

    const scored = pool
      .map((candidate) => {
        const match = candidate.label.match(/camera2?\s*(\d+)/)
        return {
          candidate,
          index: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
        }
      })
      .sort((a, b) => a.index - b.index)

    const picked = scored[0]?.candidate ?? null
    if (!picked || !picked.id || picked.id === currentDeviceId) return null
    return picked.id
  } catch {
    return null
  }
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
