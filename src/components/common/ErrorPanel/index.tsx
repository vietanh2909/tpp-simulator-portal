import { Button, Icon } from '@/components/ui'
import { cn } from '@/utils/cn'

interface ErrorPanelProps {
  title?: string
  message: string
  onRetry?: () => void
  /** Hiển thị dạng thanh cảnh báo gọn (khi vẫn còn dữ liệu cũ bên dưới). */
  compact?: boolean
}

export function ErrorPanel({ title = 'Không tải được dữ liệu', message, onRetry, compact = false }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800',
        compact ? 'px-3 py-2' : 'flex-col px-6 py-10 text-center sm:flex-row sm:text-left',
      )}
    >
      <Icon name="error" size={compact ? 18 : 24} filled />
      <div className="flex-1">
        <p className="text-headline-sm">{title}</p>
        <p className="text-body-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}
