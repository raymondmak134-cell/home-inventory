export const STORAGE_LOCATIONS = [
  '厨房',
  '冰箱',
  '杂物房',
  '次卧',
  '主卧',
  '客厅',
  '卫生间',
] as const

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]
