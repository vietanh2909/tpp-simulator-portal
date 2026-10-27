import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  /** Số lượng hiển thị cạnh nhãn. */
  count?: number | undefined
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  /**
   * Tiền tố id (thường lấy từ `useId`) để nối mỗi tab với vùng `TabPanel` cùng tiền tố qua `aria-controls`.
   * Bỏ trống thì tab không có `aria-controls` (không trỏ tới id không tồn tại).
   */
  idBase?: string
}

export function tabId(idBase: string, value: string): string {
  return `${idBase}-tab-${value}`
}

export function tabPanelId(idBase: string, value: string): string {
  return `${idBase}-panel-${value}`
}

/**
 * Tabs theo mẫu ARIA: tab đang chọn có `tabIndex=0`, các tab còn lại `-1` (roving tabindex);
 * mũi tên trái/phải xoay vòng, Home/End về đầu/cuối, và chọn tab ngay khi tiêu điểm đổi (kích hoạt tự động).
 */
export function Tabs<T extends string>({ items, value, onChange, ariaLabel, idBase }: TabsProps<T>) {
  const tabRefs = useRef(new Map<T, HTMLButtonElement>())

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((item) => item.value === value)
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % items.length
        break
      case 'ArrowLeft':
        next = (current - 1 + items.length) % items.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const target = items[next]
    if (!target) return
    onChange(target.value)
    tabRefs.current.get(target.value)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="inline-flex gap-1 rounded-xl bg-surface-container-low p-1"
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            ref={(node) => {
              if (node) tabRefs.current.set(item.value, node)
              else tabRefs.current.delete(item.value)
            }}
            id={idBase ? tabId(idBase, item.value) : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={idBase ? tabPanelId(idBase, item.value) : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-body-lg font-medium transition-colors',
              active
                ? 'bg-surface-container-lowest text-primary shadow-card'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-label-sm',
                  active
                    ? 'bg-primary-fixed text-on-primary-fixed-variant'
                    : 'bg-surface-container text-on-surface-variant',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  idBase: string
  /** Giá trị của tab đang chọn; vùng này được `aria-labelledby` trỏ về tab đó. */
  value: string
  children: ReactNode
  className?: string
}

/** Vùng nội dung của tab đang chọn, nối với `Tabs` cùng `idBase`. */
export function TabPanel({ idBase, value, children, className }: TabPanelProps) {
  return (
    <div role="tabpanel" id={tabPanelId(idBase, value)} aria-labelledby={tabId(idBase, value)} className={className}>
      {children}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  items: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** Nhóm nút lọc dạng phân đoạn (Tất cả / Đang bật / Đã tắt). */
export function Segmented<T extends string>({ items, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1"
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-md px-3 py-1 text-body-sm font-medium transition-colors',
            item.value === value
              ? 'bg-surface-container-lowest text-primary shadow-card'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
