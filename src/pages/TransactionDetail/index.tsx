import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { appConfig } from '@/app/config'
import { ErrorPanel, NotFoundView, PageContainer, PageHeading, SectionLoader } from '@/components/common'
import { Badge, Button, Card, Icon, Switch } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { callbackServicesApi } from '@/features/callback-services'
import { CallbackDetailPanel, callbacksApi, type TimestampServiceInfo } from '@/features/callbacks'
import { parseRecordId } from '@/features/callbacks/utils/callback-dto'
import {
  TransactionDetailView,
  findNewCallbackIds,
  readBackTo,
  transactionsApi,
  type TransactionDetail,
} from '@/features/transactions'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ApiError } from '@/services/http/error-handler'
import { DISPLAY_TZ_LABEL, formatTime } from '@/utils/format'

/**
 * Chi tiết là trang riêng (quyết định đã duyệt ở U3, lệch có chủ đích AC3.4.1 và AC3.4.4): không có ngăn trượt, Esc hay
 * tiêu điểm trả về dòng. Thay vào đó "Quay lại danh sách theo dõi" mở lại đúng địa chỉ danh sách (tab, bộ lọc, trang) đã
 * mang theo khi bấm "Xem"; không có địa chỉ đó thì về `/transactions`.
 */
function useBackNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = readBackTo(location.state)
  return { backTo, goBack: () => navigate(backTo ?? ROUTES.monitoring) }
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-primary hover:underline">
      <Icon name="arrow_back" size={15} />
      Quay lại danh sách theo dõi
    </button>
  )
}

interface RefreshBarProps {
  autoRefresh?: boolean
  onAutoRefreshChange?: (value: boolean) => void
  updatedAt: Date | undefined
  onReload: () => void
}

function RefreshBar({ autoRefresh, onAutoRefreshChange, updatedAt, onReload }: RefreshBarProps) {
  const seconds = appConfig.pollIntervalMs / 1000
  return (
    <div className="flex flex-wrap items-center gap-3">
      {autoRefresh !== undefined && onAutoRefreshChange && (
        <span className="flex items-center gap-2 text-body-sm">
          <Switch checked={autoRefresh} onChange={onAutoRefreshChange} label={`Tự cập nhật mỗi ${seconds} giây`} />
          <span className="font-mono text-label-md">
            {autoRefresh ? `Tự cập nhật mỗi ${seconds} giây` : 'Tự cập nhật đang tắt'}
          </span>
        </span>
      )}
      <span className="font-mono text-label-md text-on-surface-variant">
        Cập nhật lúc {updatedAt ? `${formatTime(updatedAt.toISOString())} (${DISPLAY_TZ_LABEL})` : '—'}
      </span>
      <Button size="sm" variant="tonal" icon="refresh" onClick={onReload}>
        Tải lại
      </Button>
    </div>
  )
}

function StaleBanner({
  error,
  updatedAt,
  onRetry,
}: {
  error: Error
  updatedAt: Date | undefined
  onRetry: () => void
}) {
  return (
    <div
      data-testid="stale-banner"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
    >
      <Icon name="warning" size={18} filled className="text-amber-600" />
      <div className="flex-1">
        <p className="text-body-md font-medium">
          Không cập nhật được.{' '}
          {updatedAt
            ? `Đang hiển thị dữ liệu lúc ${formatTime(updatedAt.toISOString())} (${DISPLAY_TZ_LABEL}).`
            : 'Đang hiển thị dữ liệu cũ.'}
        </p>
        <p className="text-body-sm">{error.message}</p>
      </div>
      <Button size="sm" variant="secondary" icon="refresh" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  )
}

/**
 * Đường dẫn timestamp và số phiên bản hiện hành của dịch vụ để hiện giá trị gốc cạnh lỗi timestamp (AC3.7.3). Chỉ tải
 * khi thật sự cần; dịch vụ đã xóa hoặc không đọc được thì `null` (giao diện chỉ chỉ xuống payload).
 */
function useTimestampService(serviceCode: string, needed: boolean): TimestampServiceInfo | null {
  const service = useAsyncData(
    async (signal) => (needed ? await callbackServicesApi.get(serviceCode, signal).catch(() => null) : null),
    [serviceCode, needed],
  )
  const loaded = service.data
  return loaded && loaded.mapping.timestamp
    ? { timestampPath: loaded.mapping.timestamp, version: loaded.version }
    : null
}

function hasTimestampError(detail: { callbacks: TransactionDetail['callbacks'] } | undefined): boolean {
  return (
    detail?.callbacks.some((callback) => {
      const field = callback.mapping.timestamp
      return field !== undefined && (field.errorCode !== null || field.error !== null)
    }) ?? false
  )
}

interface SelectionState {
  selected: number | null
  /** Các lần nhận người dùng đã biết; `null` cho tới khi dữ liệu đầu tiên về. */
  known: number[] | null
}

function TransactionDetailContent({ serviceCode, transactionId }: { serviceCode: string; transactionId: string }) {
  usePageTitle(`Giao dịch ${transactionId}`)
  const { goBack } = useBackNavigation()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const detail = useAsyncData(
    (signal) => transactionsApi.get(serviceCode, transactionId, signal),
    [serviceCode, transactionId],
    { pollMs: autoRefresh ? appConfig.pollIntervalMs : null },
  )
  const service = useTimestampService(serviceCode, hasTimestampError(detail.data))

  const [selection, setSelection] = useState<SelectionState>({
    selected: parseRecordId(searchParams.get('callback')),
    known: null,
  })
  const callbacks = detail.data?.callbacks
  // Lần đầu có dữ liệu: chọn sẵn lần được nêu trong địa chỉ hoặc lần nhận mới nhất, và coi mọi lần hiện có là đã biết.
  // Sau đó lần đang chọn KHÔNG tự nhảy khi tự cập nhật thêm lần nhận mới (D11).
  if (callbacks && selection.known === null) {
    setSelection({
      selected: selection.selected ?? callbacks[callbacks.length - 1]?.recordId ?? null,
      known: callbacks.map((callback) => callback.recordId),
    })
  }
  const newIds = callbacks && selection.known ? findNewCallbackIds(selection.known, callbacks) : []

  function select(recordId: number, acknowledge: number[]) {
    setSelection((current) => ({
      selected: recordId,
      known: [...new Set([...(current.known ?? []), ...acknowledge])],
    }))
    // Giữ `backTo` trong state điều hướng để "Quay lại danh sách theo dõi" vẫn đúng sau khi đổi lần nhận.
    setSearchParams({ callback: String(recordId) }, { replace: true, state: location.state })
  }

  function selectLatest() {
    const all = callbacks ?? []
    const latest = all[all.length - 1]
    if (latest)
      select(
        latest.recordId,
        all.map((callback) => callback.recordId),
      )
  }

  const notFound = detail.error instanceof ApiError && detail.error.status === 404 && !detail.data

  return (
    <PageContainer>
      <PageHeading
        eyebrow={<BackButton onClick={goBack} />}
        title="Chi tiết giao dịch"
        actions={
          <RefreshBar
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
            updatedAt={detail.updatedAt}
            onReload={detail.reload}
          />
        }
      />
      {notFound ? (
        <NotFoundView
          title="Không tìm thấy giao dịch"
          description={`Không có callback nào của ${serviceCode} chứa transactionId ${transactionId}.`}
        />
      ) : detail.data ? (
        <>
          {detail.error && <StaleBanner error={detail.error} updatedAt={detail.updatedAt} onRetry={detail.reload} />}
          <TransactionDetailView
            detail={detail.data}
            selectedId={selection.selected}
            onSelect={(recordId) => select(recordId, [recordId])}
            newCount={newIds.length}
            onSelectLatest={selectLatest}
            service={service}
          />
        </>
      ) : detail.error ? (
        <ErrorPanel message={detail.error.message} onRetry={detail.reload} />
      ) : (
        <SectionLoader label="Đang tải chi tiết giao dịch..." />
      )}
    </PageContainer>
  )
}

function CallbackDetailContent({ recordId }: { recordId: number }) {
  usePageTitle(`Callback #${recordId}`)
  const { backTo, goBack } = useBackNavigation()
  const callback = useAsyncData((signal) => callbacksApi.get(recordId, signal), [recordId])
  const record = callback.data
  const service = useTimestampService(
    record?.serviceCode ?? '',
    hasTimestampError(record ? { callbacks: [record] } : undefined),
  )
  const notFound = callback.error instanceof ApiError && callback.error.status === 404 && !record

  return (
    <PageContainer>
      <PageHeading
        eyebrow={<BackButton onClick={goBack} />}
        title={
          <>
            Chi tiết callback
            <Badge tone="neutral">#{recordId}</Badge>
          </>
        }
        actions={<RefreshBar updatedAt={callback.updatedAt} onReload={callback.reload} />}
      />
      {notFound ? (
        <NotFoundView title="Không tìm thấy callback" description={`Callback #${recordId} không tồn tại.`} />
      ) : record ? (
        <Card className="p-4">
          {callback.error && (
            <div className="mb-4">
              <StaleBanner error={callback.error} updatedAt={callback.updatedAt} onRetry={callback.reload} />
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-body-md">
            <Badge tone="primary">{record.serviceCode}</Badge>
            {record.transactionId ? (
              <Link
                to={ROUTES.transactionDetail(record.serviceCode, record.transactionId, record.recordId)}
                state={backTo ? { backTo } : undefined}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Xem giao dịch {record.transactionId}
                <Icon name="arrow_forward" size={15} />
              </Link>
            ) : (
              <span className="text-on-surface-variant">
                {record.outcome === 'REJECTED'
                  ? 'Callback bị từ chối nên không thuộc giao dịch nào.'
                  : 'Callback này không thuộc giao dịch nào (không lấy được transactionId).'}
              </span>
            )}
          </div>
          <CallbackDetailPanel callback={record} service={service} headingLevel={2} />
        </Card>
      ) : callback.error ? (
        <ErrorPanel message={callback.error.message} onRetry={callback.reload} />
      ) : (
        <SectionLoader label="Đang tải chi tiết callback..." />
      )}
    </PageContainer>
  )
}

export default function TransactionDetailPage() {
  const { serviceCode, transactionId, callbackId } = useParams()
  if (callbackId !== undefined) {
    const recordId = parseRecordId(callbackId)
    // Tham số không phải số nguyên thì không gọi API.
    if (recordId === null) {
      return <NotFoundView title="Không tìm thấy callback" description="Mã callback trên đường dẫn không hợp lệ." />
    }
    return <CallbackDetailContent key={recordId} recordId={recordId} />
  }
  if (serviceCode && transactionId) {
    return (
      <TransactionDetailContent
        key={`${serviceCode}/${transactionId}`}
        serviceCode={serviceCode}
        transactionId={transactionId}
      />
    )
  }
  return <NotFoundView />
}
