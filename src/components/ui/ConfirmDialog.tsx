import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** `danger` cho thao tác khó hoàn tác (xóa). */
  tone?: 'primary' | 'danger'
  /** Đang xử lý: khóa nút và không đóng bằng Esc hay lớp phủ. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Nơi nhận tiêu điểm khi nút đã mở hộp thoại không còn trên trang (ví dụ dòng vừa bị xóa). */
  fallbackFocus?: () => HTMLElement | null
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Hộp thoại xác nhận truy cập được: `role="alertdialog"`, bẫy tiêu điểm, Esc đóng, trả tiêu điểm về nút đã mở.
 * Tiêu điểm ban đầu ở nút Hủy để Enter vô ý không thực hiện thao tác phá hủy.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
  fallbackFocus,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const fallbackRef = useRef(fallbackFocus)

  useEffect(() => {
    fallbackRef.current = fallbackFocus
  })

  useEffect(() => {
    if (!open) return undefined
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => {
      const target = opener?.isConnected ? opener : (fallbackRef.current?.() ?? null)
      target?.focus()
    }
  }, [open])

  if (!open) return null

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!busy) onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={busy ? undefined : onCancel} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-xl bg-surface-container-lowest p-5 shadow-overlay"
      >
        <h2 id={titleId} className="text-headline-md text-on-surface">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 text-body-md text-on-surface-variant">
          {description}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
