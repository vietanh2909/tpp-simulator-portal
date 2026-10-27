import { useId } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from './Icon'
import { Select } from './Field'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  /** Đơn vị hiển thị, ví dụ "giao dịch". */
  unit: string
  onPageChange: (page: number) => void
  /** Các cỡ trang cho phép chọn. Có cả `onPageSizeChange` thì hiện ô "Dòng mỗi trang". */
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (size: number) => void
}

function buildPageList(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const pages = new Set([1, 2, last - 1, last, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((p, index) => {
    const prev = sorted[index - 1]
    if (prev !== undefined && p - prev > 1) result.push('gap')
    result.push(p)
  })
  return result
}

export function Pagination({
  page,
  pageSize,
  total,
  unit,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const selectId = useId()
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  const pageButton = 'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-body-md transition-colors'

  return (
    <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-body-md text-on-surface-variant sm:flex-row">
      <p>
        Hiển thị{' '}
        <strong className="font-semibold text-on-surface">
          {from} - {to}
        </strong>{' '}
        trong <strong className="font-semibold text-on-surface">{total}</strong> {unit}
      </p>
      {pageSizeOptions && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="text-body-sm">
            Dòng mỗi trang
          </label>
          <Select
            id={selectId}
            className="h-8 w-20"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      )}
      <nav aria-label="Phân trang" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(pageButton, 'hover:bg-surface-container disabled:opacity-40')}
        >
          <Icon name="chevron_left" size={18} />
        </button>
        {buildPageList(page, lastPage).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Trang ${item} trên ${lastPage}`}
              onClick={() => onPageChange(item)}
              className={cn(
                pageButton,
                item === page ? 'bg-primary-container font-semibold text-on-primary' : 'hover:bg-surface-container',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Trang sau"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className={cn(pageButton, 'hover:bg-surface-container disabled:opacity-40')}
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </nav>
    </div>
  )
}
