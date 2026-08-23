import { useEffect, type RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const node = ref.current
      if (!node || !(event.target instanceof Node) || node.contains(event.target)) {
        return
      }
      onOutside()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [enabled, onOutside, ref])
}
