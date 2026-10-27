import { cn } from '@/utils/cn'

interface IconProps {
  /** Tên Material Symbols (outlined), ví dụ `content_copy`. */
  name: string
  size?: number
  filled?: boolean
  className?: string
}

export function Icon({ name, size = 18, filled = false, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('material-symbols-outlined shrink-0', filled && 'fill', className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}
