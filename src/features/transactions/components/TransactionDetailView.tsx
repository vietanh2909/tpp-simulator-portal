import { BusinessStatusBadge, CallbackDetailPanel, MappingErrorBadge } from '@/features/callbacks'
import type { TimestampServiceInfo } from '@/features/callbacks'
import { CopyButton } from '@/components/common'
import { Badge, Button, Card, Icon } from '@/components/ui'
import { formatDateTime } from '@/utils/format'
import type { TransactionDetail } from '../types/transactions.types'
import { hasOutOfOrderBusinessTimestamps } from '../utils/history'
import { TransactionTimeline } from './TransactionTimeline'

interface TransactionDetailViewProps {
  detail: TransactionDetail
  /** Lần nhận đang xem; không tự nhảy khi có callback mới. */
  selectedId: number | null
  onSelect: (recordId: number) => void
  /** Số lần nhận mới xuất hiện kể từ lúc người dùng xem lần cuối (D11). */
  newCount: number
  /** Chọn lần nhận mới nhất và coi các lần nhận mới là đã biết. */
  onSelectLatest: () => void
  service: TimestampServiceInfo | null
}

export function TransactionDetailView({
  detail,
  selectedId,
  onSelect,
  newCount,
  onSelectLatest,
  service,
}: TransactionDetailViewProps) {
  const { transaction, callbacks } = detail
  const selected = callbacks.find((callback) => callback.recordId === selectedId) ?? callbacks[callbacks.length - 1]
  const outOfOrder = hasOutOfOrderBusinessTimestamps(callbacks)

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{transaction.serviceCode}</Badge>
          {transaction.serviceDeleted && (
            <Badge tone="neutral" mono={false}>
              Dịch vụ đã xóa
            </Badge>
          )}
          <span className="text-body-md text-on-surface-variant">Giao dịch (serviceCode + transactionId)</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-headline-lg break-all">{transaction.transactionId}</h2>
          <CopyButton text={transaction.transactionId} label="Sao chép transactionId" />
          <BusinessStatusBadge status={transaction.latestStatus} />
          {transaction.latestHasMappingError && <MappingErrorBadge />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-surface-container-low px-3 py-2 text-body-md">
          <span className="flex items-center gap-1.5 text-on-surface-variant">
            <Icon name="info" size={16} className="text-primary" />
            Trạng thái tổng hợp lấy từ callback nhận gần nhất; callback có thể đến không đúng thứ tự nghiệp vụ.
          </span>
          <span className="flex items-center gap-1.5 font-mono text-label-md">
            <Icon name="layers" size={16} className="text-primary" />
            {transaction.callbackCount} callback
          </span>
          <span className="flex items-center gap-1.5 font-mono text-label-md">
            <Icon name="schedule" size={16} className="text-primary" />
            {formatDateTime(transaction.latestReceivedAt)} (GMT+7)
          </span>
        </div>
        {outOfOrder && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">
            <Icon name="swap_vert" size={16} className="text-amber-600" />
            Giao dịch này có callback đến sai thứ tự theo timestamp nghiệp vụ. Trạng thái tổng hợp vẫn theo thứ tự nhận.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-label-md tracking-wide uppercase">Lịch sử nhận callback (theo thứ tự nhận)</h3>
          <span className="text-body-sm text-on-surface-variant">Chọn một lần nhận để xem payload và header</span>
        </div>
        {newCount > 0 && (
          <div
            role="status"
            data-testid="new-callbacks"
            className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-body-md text-sky-900"
          >
            <span>Có {newCount} callback mới</span>
            <Button size="sm" variant="tonal" icon="arrow_downward" onClick={onSelectLatest}>
              Xem lần nhận mới nhất
            </Button>
          </div>
        )}
        <TransactionTimeline callbacks={callbacks} selectedId={selected?.recordId ?? null} onSelect={onSelect} />
      </Card>

      {selected && (
        <Card className="p-4">
          <CallbackDetailPanel callback={selected} service={service} />
        </Card>
      )}
    </div>
  )
}
