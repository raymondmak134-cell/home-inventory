import { useCallback, useEffect, useState } from 'react'
import {
  createInventoryItem,
  createInventoryItemFromProduct,
  fetchInventoryItems,
  InventoryApiError,
} from '../api/inventory'
import {
  fetchProductByBarcode,
  isProductNotFound,
  ProductApiError,
} from '../api/products'
import { EmptyWarehouse } from '../components/EmptyWarehouse'
import { InventoryList } from '../components/InventoryList'
import { ItemConfirmSheet } from '../components/ItemConfirmSheet'
import { ManualAddSheet } from '../components/ManualAddSheet'
import { ScanSheet } from '../components/ScanSheet'
import { TopNav } from '../components/TopNav'
import type { InventoryItem } from '../types/inventory'
import type { Product } from '../types/product'

type HomePageProps = {
  onOpenAccount?: () => void
}

export function HomePage({ onOpenAccount }: HomePageProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const [scanOpen, setScanOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [manualHint, setManualHint] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmBarcode, setConfirmBarcode] = useState('')
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setItemsLoading(true)
    setItemsError(null)
    try {
      setItems(await fetchInventoryItems())
    } catch (caught) {
      setItemsError(
        caught instanceof InventoryApiError ? caught.message : '加载物品失败',
      )
    } finally {
      setItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  function openScan() {
    setScanOpen(true)
  }

  function openManual(options?: { barcode?: string; hint?: string }) {
    setScanOpen(false)
    setConfirmOpen(false)
    setManualError(null)
    setManualBarcode(options?.barcode ?? '')
    setManualHint(options?.hint ?? null)
    setManualOpen(true)
  }

  async function handleBarcodeDetected(barcode: string) {
    setScanOpen(false)
    setConfirmBarcode(barcode)
    setConfirmProduct(null)
    setConfirmError(null)
    setConfirmLoading(true)
    setConfirmOpen(true)

    try {
      const result = await fetchProductByBarcode(barcode)
      setConfirmProduct(result.product)
    } catch (caught) {
      if (isProductNotFound(caught)) {
        setConfirmOpen(false)
        openManual({
          barcode,
          hint: '未找到该条形码对应的商品，请手动填写信息',
        })
        return
      }
      setConfirmError(
        caught instanceof ProductApiError ? caught.message : '查询失败，请稍后重试',
      )
    } finally {
      setConfirmLoading(false)
    }
  }

  async function handleConfirmSave() {
    if (!confirmProduct) return
    setSaving(true)
    setConfirmError(null)
    try {
      const item = await createInventoryItemFromProduct(confirmProduct.id)
      setItems((current) => [item, ...current])
      setConfirmOpen(false)
    } catch (caught) {
      setConfirmError(
        caught instanceof InventoryApiError ? caught.message : '入库失败，请稍后重试',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleManualSave(input: {
    goodsName: string
    brand: string
    spec: string
  }) {
    setSaving(true)
    setManualError(null)
    try {
      const item = await createInventoryItem({
        ...input,
        barcode: manualBarcode.trim() || null,
      })
      setItems((current) => [item, ...current])
      setManualOpen(false)
      setManualBarcode('')
      setManualHint(null)
    } catch (caught) {
      setManualError(
        caught instanceof InventoryApiError ? caught.message : '入库失败，请稍后重试',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page app-page">
      <TopNav familyName="我的家" onAvatarClick={onOpenAccount} />
      <main className="login-shell app-page__main">
        {itemsLoading ? (
          <p className="home-status" role="status">
            正在加载物品…
          </p>
        ) : itemsError ? (
          <p className="home-status home-status--error" role="alert">
            {itemsError}
          </p>
        ) : items.length === 0 ? (
          <EmptyWarehouse onAddFirstItem={openScan} />
        ) : (
          <InventoryList items={items} onAddItem={openScan} />
        )}
      </main>

      <ScanSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onManualAdd={() => openManual()}
        onBarcodeDetected={(barcode) => void handleBarcodeDetected(barcode)}
      />

      <ItemConfirmSheet
        open={confirmOpen}
        barcode={confirmBarcode}
        product={confirmProduct}
        loading={confirmLoading}
        error={confirmError}
        saving={saving}
        onClose={() => {
          if (!saving) setConfirmOpen(false)
        }}
        onConfirm={() => void handleConfirmSave()}
      />

      <ManualAddSheet
        open={manualOpen}
        saving={saving}
        error={manualError}
        hint={manualHint}
        initialBarcode={manualBarcode}
        onClose={() => {
          if (!saving) {
            setManualOpen(false)
            setManualBarcode('')
            setManualHint(null)
          }
        }}
        onSubmit={(input) => void handleManualSave(input)}
      />
    </div>
  )
}
