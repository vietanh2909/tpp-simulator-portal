import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { appConfig } from '@/app/config'
import { EmptyState, ErrorPanel, PageContainer, PageHeading, SectionLoader } from '@/components/common'
import { Button, Card, Icon, Pagination, TabPanel, Tabs } from '@/components/ui'
import { callbackServicesApi } from '@/features/callback-services'
import { CallbackTable, callbacksApi, type CallbackPage } from '@/features/callbacks'
import {
  MonitoringFilters,
  TransactionTable,
  describeFilters,
  hasActiveFilters,
  resolveRange,
  transactionsApi,
  useMonitoringAnnouncements,
  useMonitoringQuery,
  type ServiceOption,
  type TransactionPage,
} from '@/features/transactions'
import { EMPTY_FILTERS, queryKey } from '@/features/transactions/utils/monitoring-query'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'
import { DISPLAY_TZ_LABEL, formatTime } from '@/utils/format'

/** Dữ liệu của tab đang xem, gắn nhãn tab để không lẫn với dữ liệu cũ của tab khác trong lúc tải. */
type MonitoringData =
  { tab: 'transactions'; key: string; page: TransactionPage } | { tab: 'callbacks'; key: string; page: CallbackPage }

const EMPTY_COPY = {
  transactions: {
    title: 'Chưa có giao dịch nào',
    description: 'Gửi callback bằng cURL hoặc từ trang Gửi thử của một dịch vụ.',
  },
  callbacks: {
    title: 'Chưa nhận callback nào',
    description: 'Gửi callback bằng cURL hoặc từ trang Gửi thử của một dịch vụ.',
  },
} as const

export default function MonitoringPage() {
  usePageTitle('Theo dõi giao dịch')
  const { query, update, switchTab } = useMonitoringQuery()
  const tabsId = useId()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [resetCount, setResetCount] = useState(0)
  const pollMs = autoRefresh ? appConfig.pollIntervalMs : null

  // Dịch vụ cho bộ lọc, kể cả dịch vụ đã xóa mềm (nhãn "(đã xóa)", AC3.2.3). Chỉ tải một lần.
  const services = useAsyncData((signal) => callbackServicesApi.list({ includeDeleted: true }, signal), [])

  // Chỉ tab đang xem được tải và polling. Khoảng thời gian tương đối được tính lại ở mỗi lần tải.
  const listing = useAsyncData<MonitoringData>(
    async (signal) => {
      const range = resolveRange(query.range, query.from, query.to)
      const common = {
        serviceCode: query.service || undefined,
        transactionId: query.txn || undefined,
        ...range,
      }
      const key = queryKey(query)
      if (query.tab === 'transactions') {
        const page = await transactionsApi.list(
          { ...common, status: query.status || undefined },
          query.page,
          query.size,
          signal,
        )
        return { tab: 'transactions', key, page }
      }
      const page = await callbacksApi.list(
        { ...common, outcome: query.outcome || undefined, rejectionReason: query.reason || undefined },
        query.page,
        query.size,
        signal,
      )
      return { tab: 'callbacks', key, page }
    },
    [
      query.tab,
      query.service,
      query.txn,
      query.status,
      query.outcome,
      query.reason,
      query.range,
      query.from,
      query.to,
      query.page,
      query.size,
    ],
    { pollMs },
  )

  const current = listing.data?.tab === query.tab ? listing.data : undefined
  const total = current?.page.totalItems
  const totalPages = current ? Math.max(1, current.page.totalPages) : undefined
  const itemCount = current?.page.items.length ?? 0

  const announcements = useMonitoringAnnouncements({
    updatedAt: listing.updatedAt,
    hasError: listing.error !== undefined,
    total,
    page: query.page,
    totalPages,
    dataKey: current?.key,
  })

  // Nếu trang hiện tại vượt quá số trang (do dữ liệu hoặc bộ lọc thay đổi), lùi về trang cuối.
  useEffect(() => {
    if (totalPages !== undefined && query.page > totalPages) update({ page: totalPages })
  }, [totalPages, query.page, update])

  const serviceOptions = useMemo<ServiceOption[]>(
    () =>
      (services.data?.items ?? []).map((service) => ({
        code: service.code,
        label: `${service.code} (${service.name})${service.deleted ? ' (đã xóa)' : ''}`,
      })),
    [services.data],
  )

  const filtersActive = hasActiveFilters(query)
  const serviceLabel = serviceOptions.find((option) => option.code === query.service)?.label
  const filtersKey = JSON.stringify([
    query.tab,
    query.service,
    query.txn,
    query.status,
    query.outcome,
    query.reason,
    query.range,
    query.from,
    query.to,
  ])

  function applyChange(patch: Parameters<typeof update>[0]) {
    const next = update(patch)
    announcements.notify('apply', queryKey(next ?? query))
    // Không có gì đổi trên địa chỉ: "Áp dụng" vẫn phải tải lại ngay.
    if (!next) listing.reload()
  }

  function resetFilters() {
    // Dựng lại thanh bộ lọc để bỏ cả bản nháp chưa áp dụng và lỗi thời gian đang hiện, kể cả khi bộ lọc đã áp dụng
    // vốn là mặc định (địa chỉ không đổi nên `filtersKey` cũng không đổi) (R-02).
    setResetCount((count) => count + 1)
    applyChange({ ...EMPTY_FILTERS })
  }

  function reload() {
    announcements.notify('reload', queryKey(query))
    listing.reload()
  }

  function changePaging(patch: { page: number } | { size: number }) {
    const next = update(patch)
    if (next) announcements.notify('page', queryKey(next))
  }

  const unit = query.tab === 'transactions' ? 'giao dịch' : 'callback'
  const emptyNode = filtersActive ? (
    <EmptyState
      icon="search_off"
      title="Không có dữ liệu khớp bộ lọc"
      description="Thử nới rộng khoảng thời gian hoặc xóa bớt điều kiện lọc."
      action={
        <Button variant="tonal" onClick={resetFilters}>
          Xóa bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState icon="inbox" title={EMPTY_COPY[query.tab].title} description={EMPTY_COPY[query.tab].description} />
  )

  let body: ReactNode
  if (listing.error && !current) {
    body = (
      <div className="p-4">
        <ErrorPanel title="Không tải được dữ liệu" message={listing.error.message} onRetry={reload} />
      </div>
    )
  } else if (!current) {
    body = <SectionLoader label="Đang tải dữ liệu..." />
  } else {
    body = (
      <>
        {listing.error && (
          <div
            data-testid="stale-banner"
            className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
          >
            <Icon name="warning" size={18} filled className="text-amber-600" />
            <div className="flex-1">
              <p className="text-body-md font-medium">
                Không cập nhật được.{' '}
                {listing.updatedAt
                  ? `Đang hiển thị dữ liệu lúc ${formatTime(listing.updatedAt.toISOString())} (${DISPLAY_TZ_LABEL}).`
                  : 'Đang hiển thị dữ liệu cũ.'}
              </p>
              <p className="text-body-sm">{listing.error.message}</p>
            </div>
            <Button size="sm" variant="secondary" icon="refresh" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}
        <div className={cn('transition-opacity', listing.loading && 'opacity-60')}>
          {itemCount === 0 ? (
            (total ?? 0) > 0 ? (
              <SectionLoader label="Đang chuyển trang..." />
            ) : (
              emptyNode
            )
          ) : current.tab === 'transactions' ? (
            <TransactionTable items={current.page.items} />
          ) : (
            <CallbackTable items={current.page.items} />
          )}
        </div>
        {(total ?? 0) > 0 && (
          <Pagination
            page={query.page}
            pageSize={query.size}
            total={total ?? 0}
            unit={unit}
            pageSizeOptions={appConfig.pageSizeOptions}
            onPageChange={(page) => changePaging({ page })}
            onPageSizeChange={(size) => changePaging({ size })}
          />
        )}
      </>
    )
  }

  return (
    <PageContainer>
      <PageHeading
        eyebrow={
          <span className="flex items-center gap-2 text-primary">
            <span className="h-2 w-2 rounded-full bg-secondary-container" aria-hidden="true" />
            THEO DÕI CALLBACK
          </span>
        }
        title="Theo dõi giao dịch & Callback"
        description="Giám sát các HTTP callback đã được TPP Simulator tiếp nhận từ hệ thống ngân hàng"
      />

      <MonitoringFilters
        key={`${filtersKey}#${resetCount}`}
        tab={query.tab}
        applied={query}
        serviceOptions={serviceOptions}
        summary={filtersActive ? describeFilters(query, serviceLabel) : ''}
        onApply={(filters) => applyChange({ ...filters })}
        onReset={resetFilters}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        pollSeconds={appConfig.pollIntervalMs / 1000}
        updatedAt={listing.updatedAt}
        onReload={reload}
      />

      {/* Vùng thông báo cho trình đọc màn hình (D12): chỉ đổi nội dung ở các sự kiện đã nêu, không đọc lại mỗi 5 giây. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live-region">
        <span key={announcements.sequence}>{announcements.message}</span>
      </p>

      <Tabs
        ariaLabel="Chế độ xem"
        idBase={tabsId}
        value={query.tab}
        onChange={switchTab}
        items={[
          {
            value: 'transactions',
            label: 'Giao dịch',
            icon: <Icon name="account_balance_wallet" size={18} />,
            count: query.tab === 'transactions' ? total : undefined,
          },
          {
            value: 'callbacks',
            label: 'Tất cả callback',
            icon: <Icon name="terminal" size={18} />,
            count: query.tab === 'callbacks' ? total : undefined,
          },
        ]}
      />

      <Card className="overflow-hidden" as="section">
        <TabPanel idBase={tabsId} value={query.tab}>
          <p className="flex items-center gap-1.5 px-4 py-3 text-body-sm text-on-surface-variant">
            <Icon name="info" size={14} />
            {query.tab === 'transactions'
              ? '1 dòng tương ứng 1 cặp (dịch vụ + transactionId). Trạng thái lấy từ callback nhận gần nhất, không dựa vào timestamp nghiệp vụ.'
              : 'Mỗi lần nhận là một dòng, kể cả callback lỗi mapping, bị từ chối hoặc thiếu transactionId.'}
          </p>
          <div aria-busy={listing.loading}>{body}</div>
        </TabPanel>
      </Card>
    </PageContainer>
  )
}
