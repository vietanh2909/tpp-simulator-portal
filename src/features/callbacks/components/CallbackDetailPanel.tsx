import type { ReactNode } from 'react'
import { buildCallbackUrl } from '@/features/callback-services/utils/callback-url'
import { CopyButton } from '@/components/common'
import { Badge, Icon, JsonViewer } from '@/components/ui'
import { byteLength, formatBytes, formatDateTime } from '@/utils/format'
import { OUTCOME_LABEL, REJECTION_REASON_LABEL } from '../constants/callbacks.constants'
import type { CallbackDetail } from '../types/callbacks.types'
import { hasMappingResults } from '../utils/callback-dto'
import { resolveTimestampSource, type TimestampSource } from '../utils/payload-path'
import { HeadersTable } from './HeadersTable'
import { MappingResultTable } from './MappingResultTable'
import { BusinessStatusBadge, HttpStatusBadge, OutcomeBadge, RejectionReasonBadge } from './StatusBadges'

/** Phần của dịch vụ cần để hiện giá trị gốc của timestamp (AC3.7.3). `null`: dịch vụ đã xóa hoặc không đọc được. */
export interface TimestampServiceInfo {
  timestampPath: string
  version: number
}

function SectionTitle({
  icon,
  children,
  aside,
  level,
}: {
  icon: string
  children: string
  aside?: ReactNode
  level: 2 | 3
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <Heading className="flex items-center gap-1.5 font-mono text-label-md tracking-wide text-on-surface uppercase">
        <Icon name={icon} size={16} className="text-primary" />
        {children}
      </Heading>
      {aside}
    </div>
  )
}

function RawTimestampHint({ source }: { source: TimestampSource }) {
  if (source.kind === 'path') {
    return source.found ? (
      <p className="mt-1 text-body-sm text-on-surface-variant" data-testid="timestamp-raw">
        Giá trị gốc: <span className="font-mono text-on-surface">{source.text}</span> (đọc theo đường dẫn hiện tại của
        dịch vụ <span className="font-mono">{source.path}</span>)
      </p>
    ) : (
      <p className="mt-1 text-body-sm text-on-surface-variant" data-testid="timestamp-raw">
        Không có giá trị ở đường dẫn hiện tại của dịch vụ <span className="font-mono">{source.path}</span>; xem giá trị
        trong payload bên dưới.
      </p>
    )
  }
  return (
    <p className="mt-1 text-body-sm text-on-surface-variant" data-testid="timestamp-raw">
      Giá trị gốc: xem giá trị trong payload bên dưới.
    </p>
  )
}

function BusinessTimestampCard({
  callback,
  service,
}: {
  callback: CallbackDetail
  service: TimestampServiceInfo | null
}) {
  const field = callback.mapping.timestamp
  const failed = field !== undefined && (field.errorCode !== null || field.error !== null)

  return (
    <div className="rounded-lg bg-surface-container-low p-3">
      <p className="font-mono text-label-sm text-on-surface-variant uppercase">
        Timestamp nghiệp vụ (trích từ payload)
      </p>
      {!hasMappingResults(callback) ? (
        <p className="mt-1 text-body-md text-on-surface-variant">Chưa chạy mapping vì request bị từ chối.</p>
      ) : failed ? (
        <>
          <p className="mt-1 font-mono text-label-lg text-rose-700">Không lấy được</p>
          <p className="mt-0.5 text-body-sm text-rose-700">{field?.error ?? 'Không đọc được timestamp.'}</p>
          <RawTimestampHint source={resolveTimestampSource(callback, service)} />
        </>
      ) : callback.businessTimestamp ? (
        <>
          <p className="mt-1 font-mono text-label-lg text-indigo-700">
            {formatDateTime(callback.businessTimestamp, true)} GMT+7
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">UTC {callback.businessTimestamp}</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-body-md text-on-surface-variant">Không có timestamp nghiệp vụ.</p>
          {field?.warning && <p className="mt-0.5 text-body-sm text-amber-700">{field.warning}</p>}
        </>
      )}
    </div>
  )
}

interface CallbackDetailPanelProps {
  callback: CallbackDetail
  /** Thông tin dịch vụ để đọc giá trị gốc của timestamp; bỏ trống hoặc `null` thì chỉ chỉ xuống payload. */
  service?: TimestampServiceInfo | null
  /** Cấp tiêu đề của các khối (h2 khi ngay dưới h1 của trang, h3 khi dưới một h2). Giữ thứ bậc tiêu đề liền mạch. */
  headingLevel?: 2 | 3
}

export function CallbackDetailPanel({ callback, service = null, headingLevel = 3 }: CallbackDetailPanelProps) {
  const rejected = callback.outcome === 'REJECTED'
  const payloadBytes = formatBytes(byteLength(callback.payload.text))

  return (
    <div className="flex flex-col gap-5" data-testid="callback-detail">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-label-lg font-semibold text-on-surface">Callback #{callback.recordId}</span>
        {!rejected && <BusinessStatusBadge status={callback.status} />}
        <OutcomeBadge outcome={callback.outcome} />
        {callback.rejectionReason && <RejectionReasonBadge reason={callback.rejectionReason} />}
        <HttpStatusBadge status={callback.httpStatusReturned} />
        {callback.serviceDeleted && (
          <Badge tone="neutral" mono={false}>
            Dịch vụ đã xóa
          </Badge>
        )}
      </div>

      {rejected && (
        <div
          role="note"
          data-testid="rejected-note"
          className="flex gap-2 rounded-lg border-l-4 border-rose-600 bg-rose-50 p-3 text-body-md text-rose-900"
        >
          <Icon name="block" size={20} filled className="shrink-0 text-rose-600" />
          <div>
            <p className="font-mono text-label-md font-semibold uppercase">
              Request bị từ chối
              {callback.rejectionReason ? `: ${REJECTION_REASON_LABEL[callback.rejectionReason]}` : ''}
            </p>
            <p className="mt-0.5">
              Simulator đã trả HTTP {callback.httpStatusReturned}. Chưa chạy mapping vì request bị từ chối, nên không có
              kết quả mapping.
            </p>
          </div>
        </div>
      )}

      {!rejected && callback.transactionId === null && (
        <div
          role="note"
          className="flex gap-2 rounded-lg border-l-4 border-amber-600 bg-amber-50 p-3 text-body-md text-amber-900"
        >
          <Icon name="warning" size={20} filled className="shrink-0 text-amber-600" />
          <div>
            <p className="font-mono text-label-md font-semibold uppercase">Callback không lấy được transactionId</p>
            <p className="mt-0.5">
              Hệ thống vẫn lưu đầy đủ payload và header để tra cứu, gắn nhãn lỗi mapping và không gom vào giao dịch nào.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg bg-surface-container-low p-3">
          <p className="font-mono text-label-sm text-on-surface-variant uppercase">
            Thời điểm nhận thực tế (receivedAt)
          </p>
          <p className="mt-1 font-mono text-label-lg">{formatDateTime(callback.receivedAt, true)} GMT+7</p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {callback.configVersionNumber !== null
              ? `Cấu hình áp dụng: phiên bản ${callback.configVersionNumber}`
              : 'Chưa áp dụng cấu hình nào (request bị từ chối trước khi xử lý).'}
          </p>
        </div>
        <BusinessTimestampCard callback={callback} service={service} />
      </div>

      <section aria-label="Kết quả mapping từng trường">
        <SectionTitle
          icon="account_tree"
          level={headingLevel}
          aside={<span className="text-body-sm text-on-surface-variant">{OUTCOME_LABEL[callback.outcome]}</span>}
        >
          Kết quả mapping từng trường
        </SectionTitle>
        {hasMappingResults(callback) ? (
          <MappingResultTable fields={callback.mapping} />
        ) : (
          <p
            className="rounded-lg border border-slate-200 px-3 py-2 text-body-md text-on-surface-variant"
            data-testid="mapping-not-run"
          >
            {rejected ? 'Chưa chạy mapping vì request bị từ chối.' : 'Không có kết quả mapping cho lần nhận này.'}
          </p>
        )}
      </section>

      <section aria-label="Header của request">
        <SectionTitle
          icon="http"
          level={headingLevel}
          aside={
            <span className="text-body-sm text-on-surface-variant">{callback.headers.length} headers nhận được</span>
          }
        >
          HTTP request headers (đã che thông tin nhạy cảm)
        </SectionTitle>
        <HeadersTable headers={callback.headers} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0" aria-label="Payload nhận được">
          <SectionTitle
            icon="data_object"
            level={headingLevel}
            aside={
              <span className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                {payloadBytes}
                <CopyButton
                  text={callback.payload.text}
                  label={callback.payload.kind === 'json' ? 'Sao chép JSON' : 'Sao chép body'}
                  withLabel
                />
              </span>
            }
          >
            {callback.payload.kind === 'json' ? 'Payload JSON gốc' : 'Body văn bản gốc (không phải JSON)'}
          </SectionTitle>
          <JsonViewer
            value={callback.payload.text}
            tone="dark"
            ariaLabel={callback.payload.kind === 'json' ? 'Payload gốc' : 'Body văn bản gốc'}
            minLines={6}
            plain={callback.payload.kind === 'text'}
          />
        </section>
        <section className="min-w-0" aria-label="Response đã trả về">
          <SectionTitle
            icon="output"
            level={headingLevel}
            aside={
              <span className="flex items-center gap-2">
                <HttpStatusBadge status={callback.responseStatus} />
                {callback.responseBodyText !== null && (
                  <CopyButton text={callback.responseBodyText} label="Sao chép response" withLabel />
                )}
              </span>
            }
          >
            Response đã trả về
          </SectionTitle>
          {callback.responseBodyText !== null ? (
            <JsonViewer value={callback.responseBodyText} tone="dark" ariaLabel="Nội dung response" minLines={6} />
          ) : (
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-body-md text-on-surface-variant">
              Không có nội dung response được ghi lại cho lần nhận này.
            </p>
          )}
        </section>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm">
        <Icon name="settings_input_antenna" size={16} className="mt-0.5 text-primary" />
        <div className="min-w-0">
          <p className="text-on-surface-variant">Endpoint</p>
          <p className="font-mono text-code-body break-all">POST {buildCallbackUrl(callback.serviceCode)}</p>
        </div>
      </div>
    </div>
  )
}
