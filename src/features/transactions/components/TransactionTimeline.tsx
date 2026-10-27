import { BusinessStatusBadge, HttpStatusBadge, OutcomeBadge, type CallbackDetail } from '@/features/callbacks'
import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatTime } from '@/utils/format'

interface TransactionTimelineProps {
  /** Theo thứ tự nhận (cũ -> mới). */
  callbacks: CallbackDetail[]
  selectedId: number | null
  onSelect: (recordId: number) => void
}

export function TransactionTimeline({ callbacks, selectedId, onSelect }: TransactionTimelineProps) {
  return (
    <ol className="flex gap-3 overflow-x-auto pb-1" aria-label="Lịch sử nhận callback theo thứ tự nhận">
      {callbacks.map((callback, index) => {
        const selected = callback.recordId === selectedId
        const latest = index === callbacks.length - 1
        return (
          <li key={callback.recordId} className="min-w-52 flex-1">
            <button
              type="button"
              data-testid="timeline-item"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(callback.recordId)}
              className={cn(
                'flex h-full w-full flex-col gap-1.5 rounded-lg border bg-surface-container-lowest p-3 text-left transition-colors',
                selected
                  ? 'border-primary-container ring-2 ring-primary-container/30'
                  : 'border-slate-200 hover:border-primary-container/60',
              )}
            >
              <span className="flex items-center justify-between font-mono text-label-md">
                <span className="font-semibold">Lần nhận #{index + 1}</span>
                {latest && (
                  <Badge tone="warning" mono={false}>
                    Gần nhất
                  </Badge>
                )}
              </span>
              <span className="font-mono text-label-lg">{formatTime(callback.receivedAt)}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                {callback.outcome === 'REJECTED' ? null : <BusinessStatusBadge status={callback.status} />}
                <HttpStatusBadge status={callback.httpStatusReturned} />
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <OutcomeBadge outcome={callback.outcome} />
              </span>
              <span className="font-mono text-label-sm text-on-surface-variant">Mã #{callback.recordId}</span>
              {selected && <span className="font-mono text-label-sm font-semibold text-primary">● Đang xem</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
