import { Badge } from '@/components/ui'
import { OUTCOME_ICON, OUTCOME_LABEL, REJECTION_REASON_LABEL } from '../constants/callbacks.constants'
import type { CallbackOutcome, RejectionReason } from '../types/callbacks.types'
import { httpStatusClass, httpStatusText } from '../utils/http-status'

/**
 * Status nghiệp vụ ngân hàng gửi: luôn hiển thị trung tính, giữ nguyên giá trị,
 * không diễn giải SUCCESS/FAILED hay mã 00/99 (AC3.1.2).
 */
export function BusinessStatusBadge({ status }: { status: string | null }) {
  if (status === null) {
    return (
      <Badge tone="warning" title="Callback này thiếu hoặc lỗi status; không dùng giá trị của callback trước đó.">
        Thiếu status
      </Badge>
    )
  }
  return <Badge tone="neutral">{status}</Badge>
}

export function HttpStatusBadge({ status }: { status: number }) {
  const kind = httpStatusClass(status)
  const tone = kind === 'success' ? 'success' : kind === 'client-error' || kind === 'server-error' ? 'danger' : 'info'
  return <Badge tone={tone}>{httpStatusText(status)}</Badge>
}

const OUTCOME_TONE: Record<CallbackOutcome, 'success' | 'warning' | 'danger'> = {
  SUCCESS: 'success',
  MAPPING_ERROR: 'warning',
  REJECTED: 'danger',
}

/** Kết quả xử lý: chữ cộng biểu tượng, không chỉ bằng màu (NFR4). */
export function OutcomeBadge({ outcome }: { outcome: CallbackOutcome }) {
  return (
    <Badge tone={OUTCOME_TONE[outcome]} mono={false} title="Kết quả xử lý lần nhận (tách biệt với status nghiệp vụ)">
      <span aria-hidden="true">{OUTCOME_ICON[outcome]}</span>
      {OUTCOME_LABEL[outcome]}
    </Badge>
  )
}

/** Lý do bị từ chối bằng chữ. */
export function RejectionReasonBadge({ reason }: { reason: RejectionReason }) {
  return (
    <Badge tone="danger" mono={false}>
      {REJECTION_REASON_LABEL[reason]}
    </Badge>
  )
}

/** Dấu lỗi mapping có chữ ở danh sách giao dịch (AC3.1.3). */
export function MappingErrorBadge() {
  return (
    <Badge tone="warning" mono={false} title="Callback nhận gần nhất có trường lỗi mapping">
      <span aria-hidden="true">✕</span>
      Lỗi mapping
    </Badge>
  )
}
