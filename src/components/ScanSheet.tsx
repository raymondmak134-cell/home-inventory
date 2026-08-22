import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import {
  fetchProductByBarcode,
  isProductNotFound,
  ProductApiError,
} from '../api/products'
import { STORAGE_LOCATIONS } from '../constants/storageLocations'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import type { ScanIntakeInput } from '../types/inventory'
import type { Product } from '../types/product'
import { DatePickerField } from './DatePickerField'
import { QuantityStepper } from './QuantityStepper'
import { SelectField } from './SelectField'
import { SubmitButton } from './SubmitButton'
import { TextField } from './TextField'

type ScanSheetProps = {
  open: boolean
  saving?: boolean
  saveError?: string | null
  onClose: () => void
  onManualAdd?: (options?: { barcode?: string; hint?: string }) => void
  onSaveIntake?: (input: ScanIntakeInput) => void
}

type SheetPhase = 'closed' | 'entering' | 'open' | 'closing'
type ScanMode = 'scanning' | 'loading' | 'preview' | 'intake' | 'error'
type SlideDirection = 'forward' | 'back'

type IntakeFieldErrors = {
  quantity?: string
  storageLocation?: string
}

/** 与 App.css 中 .scan-sheet 的过渡时长保持一致（含少量余量） */
const EXIT_DURATION_MS = 360

const STORAGE_OPTIONS = STORAGE_LOCATIONS.map((location) => ({
  value: location,
  label: location,
}))

export function ScanSheet({
  open,
  saving = false,
  saveError = null,
  onClose,
  onManualAdd,
  onSaveIntake,
}: ScanSheetProps) {
  const titleId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lookupGeneration = useRef(0)

  const [phase, setPhase] = useState<SheetPhase>(open ? 'open' : 'closed')
  const [prevOpen, setPrevOpen] = useState(open)
  const [cameraError, setCameraError] = useState('')
  const [mode, setMode] = useState<ScanMode>('scanning')
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('forward')
  const [product, setProduct] = useState<Product | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  const [intakeQuantity, setIntakeQuantity] = useState(1)
  const [intakeExpiry, setIntakeExpiry] = useState('')
  const [intakeLocation, setIntakeLocation] = useState('')
  const [intakeErrors, setIntakeErrors] = useState<IntakeFieldErrors>({})

  if (prevOpen !== open) {
    setPrevOpen(open)
    setPhase(open ? 'entering' : 'closing')
    if (open) {
      setCameraError('')
      setMode('scanning')
      setSlideDirection('forward')
      setProduct(null)
      setLookupError(null)
      resetIntakeForm()
      lookupGeneration.current += 1
    }
  }

  function resetIntakeForm() {
    setIntakeQuantity(1)
    setIntakeExpiry('')
    setIntakeLocation('')
    setIntakeErrors({})
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

  useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return

    const measure = () => {
      setContentHeight(node.offsetHeight)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [
    mode,
    product,
    lookupError,
    cameraError,
    phase,
    intakeQuantity,
    intakeExpiry,
    intakeLocation,
    intakeErrors,
    saveError,
    saving,
    slideDirection,
  ])

  const cameraActive = (phase === 'entering' || phase === 'open') && mode === 'scanning'

  useBarcodeScanner(videoRef, cameraActive, (detected) => {
    void handleBarcodeDetected(detected)
  })

  async function handleBarcodeDetected(detected: string) {
    const generation = lookupGeneration.current + 1
    lookupGeneration.current = generation
    setProduct(null)
    setLookupError(null)
    resetIntakeForm()
    setMode('loading')

    try {
      const result = await fetchProductByBarcode(detected)
      if (lookupGeneration.current !== generation) return

      if (result.product.image) {
        await preloadImage(result.product.image)
        if (lookupGeneration.current !== generation) return
      }

      setProduct(result.product)
      setSlideDirection('forward')
      setMode('preview')
    } catch (caught) {
      if (lookupGeneration.current !== generation) return

      if (isProductNotFound(caught)) {
        onManualAdd?.({
          barcode: detected,
          hint: '未找到该条形码对应的商品，请手动填写信息',
        })
        onClose()
        return
      }

      setLookupError(
        caught instanceof ProductApiError ? caught.message : '查询失败，请稍后重试',
      )
      setMode('error')
    }
  }

  function handleRescan() {
    lookupGeneration.current += 1
    setProduct(null)
    setLookupError(null)
    resetIntakeForm()
    setSlideDirection('forward')
    setMode('scanning')
  }

  function handleContinueToIntake() {
    if (!product) return
    setIntakeErrors({})
    setSlideDirection('forward')
    setMode('intake')
  }

  function handleBackToPreview() {
    setSlideDirection('back')
    setMode('preview')
  }

  function handleAbandonIntake() {
    onClose()
  }

  function handleSaveIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!product || saving) return

    const nextErrors: IntakeFieldErrors = {}

    if (!Number.isFinite(intakeQuantity) || intakeQuantity < 1) {
      nextErrors.quantity = '请输入数量'
    }
    if (!intakeLocation) {
      nextErrors.storageLocation = '请选择存放位置'
    }

    if (Object.keys(nextErrors).length > 0) {
      setIntakeErrors(nextErrors)
      return
    }

    setIntakeErrors({})
    onSaveIntake?.({
      productId: product.id,
      spec: product.spec.trim(),
      quantity: intakeQuantity,
      expiryDate: intakeExpiry,
      storageLocation: intakeLocation,
    })
  }

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
        stream = await openScanCameraStream(() => cancelled)
        if (!stream) return
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

  const showManualAdd = mode === 'scanning' || mode === 'error'
  const showProductFlow = (mode === 'preview' || mode === 'intake') && product
  const captionText =
    mode === 'preview' && product
      ? product.goodsName
      : mode === 'error' && lookupError
        ? lookupError
        : '请扫描商品包装上的条形码快速入库'

  return (
    <div
      className={phase === 'open' ? 'scan-sheet is-open' : 'scan-sheet'}
      role="presentation"
    >
      <button
        type="button"
        className="scan-sheet__backdrop"
        aria-label="关闭弹窗"
        onClick={saving ? undefined : onClose}
        disabled={saving}
      />
      <div
        className="scan-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          contentHeight !== null
            ? { height: `${contentHeight}px` }
            : undefined
        }
      >
        <div ref={contentRef} className="scan-sheet__content">
          <header
            className={
              mode === 'intake'
                ? 'scan-sheet__header scan-sheet__header--with-back'
                : 'scan-sheet__header'
            }
          >
            {mode === 'intake' ? (
              <button
                type="button"
                className="scan-sheet__back"
                aria-label="返回"
                onClick={handleBackToPreview}
                disabled={saving}
              >
                <BackIcon />
              </button>
            ) : null}
            <h2 id={titleId} className="scan-sheet__title">
              扫码入库
            </h2>
            <button
              type="button"
              className="scan-sheet__close"
              aria-label="关闭"
              onClick={onClose}
              disabled={saving}
            >
              <CloseIcon />
            </button>
          </header>

          {showProductFlow ? (
            <div
              className="scan-sheet__view-port"
              data-direction={slideDirection}
            >
              <div
                className={
                  mode === 'preview'
                    ? 'scan-sheet__view-pane scan-sheet__view-pane--preview is-current'
                    : 'scan-sheet__view-pane scan-sheet__view-pane--preview is-hidden'
                }
                aria-hidden={mode !== 'preview'}
              >
                <div className="scan-sheet__frame scan-sheet__frame--preview">
                  {product.image ? (
                    <img
                      className="scan-sheet__product-image"
                      src={product.image}
                      alt={product.goodsName}
                    />
                  ) : (
                    <div className="scan-sheet__product-fallback" aria-hidden="true">
                      <span>{product.goodsName.slice(0, 1) || '?'}</span>
                    </div>
                  )}
                </div>

                <p className="scan-sheet__caption scan-sheet__caption--title">
                  {product.goodsName}
                </p>

                <div className="scan-sheet__preview-actions">
                  <SubmitButton type="button" onClick={handleContinueToIntake}>
                    是这个，继续入库
                  </SubmitButton>
                  <button
                    type="button"
                    className="scan-sheet__manual"
                    onClick={handleRescan}
                  >
                    扫错了，重新扫码
                  </button>
                </div>
              </div>

              <div
                className={
                  mode === 'intake'
                    ? 'scan-sheet__view-pane scan-sheet__view-pane--intake is-current'
                    : 'scan-sheet__view-pane scan-sheet__view-pane--intake is-hidden'
                }
                aria-hidden={mode !== 'intake'}
              >
                <form className="scan-sheet__intake-form" onSubmit={handleSaveIntake}>
                  <TextField
                    id="scan-intake-spec"
                    label="规格"
                    showLabel
                    readOnly
                    value={product.spec.trim() || '暂无规格信息'}
                    onValueChange={() => {}}
                  />
                  <QuantityStepper
                    label="数量"
                    showLabel
                    value={intakeQuantity}
                    onChange={(value) => {
                      setIntakeQuantity(value)
                      if (intakeErrors.quantity) {
                        setIntakeErrors((current) => ({ ...current, quantity: undefined }))
                      }
                    }}
                    error={intakeErrors.quantity}
                  />
                  <DatePickerField
                    label="有效期"
                    showLabel
                    value={intakeExpiry}
                    onChange={setIntakeExpiry}
                    placeholder="请选择有效期"
                  />
                  <SelectField
                    label="存放位置"
                    showLabel
                    value={intakeLocation}
                    onValueChange={(value) => {
                      setIntakeLocation(value)
                      if (intakeErrors.storageLocation) {
                        setIntakeErrors((current) => ({
                          ...current,
                          storageLocation: undefined,
                        }))
                      }
                    }}
                    options={STORAGE_OPTIONS}
                    placeholder="请选择存放位置"
                    error={intakeErrors.storageLocation}
                  />

                  {saveError ? (
                    <p className="scan-sheet__intake-error" role="alert">
                      {saveError}
                    </p>
                  ) : null}

                  <div className="scan-sheet__intake-actions">
                    <SubmitButton type="submit" disabled={saving}>
                      {saving ? '保存中…' : '保存入库'}
                    </SubmitButton>
                    <button
                      type="button"
                      className="scan-sheet__manual"
                      onClick={handleAbandonIntake}
                      disabled={saving}
                    >
                      放弃入库
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div
                className="scan-sheet__frame"
                aria-busy={mode === 'loading'}
              >
                {mode === 'scanning' ? (
                  <>
                    <video
                      ref={videoRef}
                      className="scan-sheet__video"
                      playsInline
                      muted
                      autoPlay
                    />
                    {cameraError ? (
                      <p className="scan-sheet__camera-hint">{cameraError}</p>
                    ) : (
                      <BarcodeHintIcon />
                    )}
                  </>
                ) : null}

                {mode === 'loading' ? (
                  <div className="scan-sheet__loading" role="status">
                    <LoadingSpinner />
                    <span className="scan-sheet__loading-text">正在识别商品…</span>
                  </div>
                ) : null}

                {mode === 'error' ? (
                  <div className="scan-sheet__error-state" role="alert">
                    <span className="scan-sheet__error-icon" aria-hidden="true">
                      !
                    </span>
                  </div>
                ) : null}
              </div>

              <p
                className={
                  mode === 'error'
                    ? 'scan-sheet__caption scan-sheet__caption--error'
                    : 'scan-sheet__caption'
                }
              >
                {captionText}
              </p>
            </>
          )}

          {showManualAdd ? (
            <button
              type="button"
              className="scan-sheet__manual"
              onClick={() => onManualAdd?.()}
            >
              无条形码？手动添加
            </button>
          ) : null}

          {mode === 'error' ? (
            <button type="button" className="scan-sheet__manual" onClick={handleRescan}>
              扫错了，重新扫码
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = src
  })
}

function LoadingSpinner() {
  return (
    <svg
      className="scan-sheet__spinner"
      viewBox="0 0 24 24"
      width="40"
      height="40"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42"
        strokeDashoffset="12"
      />
    </svg>
  )
}

/** 部分安卓机型默认倍率偏大且不自动对焦：能力允许时倍率归 1、开启连续对焦。 */
type ExtendedCapabilities = MediaTrackCapabilities & {
  zoom?: { min?: number; max?: number }
  focusMode?: string[]
}

let cachedScanCameraId: string | null | undefined

function scanVideoConstraints(deviceId?: string | null): MediaStreamConstraints {
  return {
    video: deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      : {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
    audio: false,
  }
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function openScanCameraStream(
  isCancelled: () => boolean,
): Promise<MediaStream | null> {
  if (cachedScanCameraId !== undefined) {
    try {
      return await navigator.mediaDevices.getUserMedia(
        scanVideoConstraints(cachedScanCameraId),
      )
    } catch {
      cachedScanCameraId = undefined
    }
  }

  const probe = await navigator.mediaDevices.getUserMedia(scanVideoConstraints(null))
  if (isCancelled()) {
    probe.getTracks().forEach((track) => track.stop())
    return null
  }

  const preferredId = await pickMainRearCameraId(
    probe.getVideoTracks()[0]?.getSettings().deviceId,
  )
  if (!preferredId) {
    cachedScanCameraId = null
    return probe
  }

  probe.getTracks().forEach((track) => track.stop())
  await waitMs(200)
  if (isCancelled()) return null

  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      scanVideoConstraints(preferredId),
    )
    cachedScanCameraId = preferredId
    return stream
  } catch {
    cachedScanCameraId = null
    return navigator.mediaDevices.getUserMedia(scanVideoConstraints(null))
  }
}

const AUX_CAMERA_PATTERN =
  /tele|zoom|长焦|potrait|portrait|macro|微距|ultra|超广|wide[- ]?angle|depth|景深|bokeh|mono|黑白|ir\b/i

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
    if (rear.length <= 1) return null

    let pool = rear.filter((candidate) => !AUX_CAMERA_PATTERN.test(candidate.label))
    if (pool.length === 0) pool = rear

    const focusable = pool.filter((candidate) =>
      candidate.caps?.focusMode?.includes('continuous'),
    )
    if (focusable.length > 0) pool = focusable

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
    // ignore
  }
}

function BarcodeHintIcon() {
  return (
    <svg
      className="scan-sheet__barcode-hint"
      viewBox="0 0 120 64"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <rect x="0" y="0" width="2" height="64" />
        <rect x="4" y="0" width="2" height="64" />
        <rect x="8" y="0" width="3" height="56" />
        <rect x="13" y="0" width="1.5" height="56" />
        <rect x="17" y="0" width="4.5" height="56" />
        <rect x="24" y="0" width="2" height="56" />
        <rect x="28" y="0" width="1.5" height="56" />
        <rect x="32" y="0" width="5" height="56" />
        <rect x="39" y="0" width="2" height="56" />
        <rect x="43" y="0" width="3.5" height="56" />
        <rect x="49" y="0" width="1.5" height="56" />
        <rect x="52" y="0" width="2.5" height="56" />
        <rect x="57" y="0" width="2" height="64" />
        <rect x="61" y="0" width="2" height="64" />
        <rect x="65" y="0" width="3.5" height="56" />
        <rect x="70" y="0" width="1.5" height="56" />
        <rect x="74" y="0" width="5" height="56" />
        <rect x="81" y="0" width="2" height="56" />
        <rect x="85" y="0" width="3" height="56" />
        <rect x="90" y="0" width="1.5" height="56" />
        <rect x="94" y="0" width="4.5" height="56" />
        <rect x="101" y="0" width="2" height="56" />
        <rect x="105" y="0" width="1.5" height="56" />
        <rect x="108.5" y="0" width="3" height="56" />
        <rect x="114" y="0" width="2" height="64" />
        <rect x="118" y="0" width="2" height="64" />
      </g>
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M14.5 6 9 12l5.5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
