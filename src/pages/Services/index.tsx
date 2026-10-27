import { Link } from 'react-router-dom'
import { EmptyState, ErrorPanel, PageContainer, PageHeading, SectionLoader } from '@/components/common'
import { Button, Card, ConfirmDialog, Icon, Input, Segmented } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { ServiceTable, useServiceList, type ServiceStatusFilter } from '@/features/callback-services'
import { usePageTitle } from '@/hooks/usePageTitle'
import { toErrorMessage } from '@/services/http/error-handler'

const STATUS_ITEMS: { value: ServiceStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'enabled', label: 'Đang bật' },
  { value: 'disabled', label: 'Đã tắt' },
]

const CREATE_LINK_ID = 'create-service-link'

/** Sau khi xóa dịch vụ, nút đã mở hộp thoại không còn: đưa tiêu điểm về nút "Tạo dịch vụ" ở đầu trang. */
function focusCreateLink() {
  document.getElementById(CREATE_LINK_ID)?.focus()
}

export default function ServicesPage() {
  usePageTitle('Dịch vụ callback')
  const {
    list,
    items,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    pendingCode,
    toggleEnabled,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleting,
    clearFilters,
  } = useServiceList({ onDeleted: focusCreateLink })

  const filtered = searchInput.trim() !== '' || status !== 'all'
  const total = list.data?.total ?? 0

  return (
    <PageContainer>
      <PageHeading
        title="Dịch vụ callback"
        description="Quản lý các webhook endpoint giả lập nhận HTTP callback từ ngân hàng"
        actions={
          <Link
            id={CREATE_LINK_ID}
            to={ROUTES.serviceCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-4 text-body-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary"
          >
            <Icon name="add" size={18} />
            Tạo dịch vụ
          </Link>
        }
      />

      <div className="flex items-start gap-2 rounded-xl bg-surface-container-low px-4 py-2 text-body-sm text-on-surface-variant">
        <Icon name="info" size={16} className="mt-0.5 text-primary" />
        <p>
          <strong className="font-semibold text-on-surface">Cách dùng:</strong> tạo dịch vụ để lấy URL callback, rồi tự
          cấu hình URL đó phía ngân hàng. Endpoint nhận{' '}
          <code className="rounded bg-surface-container px-1 font-mono text-primary">POST application/json</code>. Thời
          gian hiển thị theo GMT+7 (Asia/Ho_Chi_Minh).
        </p>
      </div>

      <Card className="flex flex-col items-stretch justify-between gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative max-w-xl flex-1">
          <label htmlFor="service-search" className="sr-only">
            Tìm theo mã hoặc tên dịch vụ
          </label>
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
          />
          <Input
            id="service-search"
            className="h-10 border-transparent bg-surface-container-low pl-10"
            placeholder="Tìm theo mã dịch vụ hoặc tên dịch vụ... (ví dụ: THU_HO, Chi hộ)"
            value={searchInput}
            autoComplete="off"
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Xóa nội dung tìm kiếm"
              onClick={() => setSearchInput('')}
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
          <Segmented ariaLabel="Lọc theo trạng thái" items={STATUS_ITEMS} value={status} onChange={setStatus} />
          <div className="hidden h-5 w-px bg-surface-container-highest sm:block" />
          <p className="flex items-center gap-1 font-mono text-label-md text-on-surface-variant" aria-live="polite">
            <Icon name="tune" size={16} className="text-secondary" />
            <strong className="text-on-surface">{items.length}</strong> dịch vụ hiển thị / {total} tổng cộng
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between bg-surface-container-low px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-sm">Danh mục endpoint callback</h2>
            <span className="font-mono text-label-sm text-on-surface-variant">| Target Simulator Listener</span>
          </div>
          <Button
            aria-label="Tải lại danh sách"
            title="Tải lại danh sách"
            variant="secondary"
            size="sm"
            icon="refresh"
            loading={list.refreshing}
            onClick={list.reload}
          />
        </div>

        {list.error && list.data === undefined ? (
          <div className="p-4">
            <ErrorPanel title="Không tải được danh sách dịch vụ" message={list.error.message} onRetry={list.reload} />
          </div>
        ) : list.data === undefined ? (
          <SectionLoader label="Đang tải danh sách dịch vụ..." />
        ) : (
          <>
            {list.error && (
              <div className="p-3">
                <ErrorPanel
                  compact
                  title="Không làm mới được danh sách"
                  message={toErrorMessage(list.error)}
                  onRetry={list.reload}
                />
              </div>
            )}
            {total === 0 ? (
              <EmptyState
                icon="webhook"
                title="Chưa có dịch vụ callback nào"
                description="Tạo dịch vụ đầu tiên để lấy URL callback và cấu hình mapping."
                action={
                  <Link
                    to={ROUTES.serviceCreate}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-4 text-body-md font-semibold text-on-primary hover:bg-primary"
                  >
                    <Icon name="add" size={18} />
                    Tạo dịch vụ
                  </Link>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon="search_off"
                title="Không tìm thấy dịch vụ phù hợp"
                description="Vui lòng điều chỉnh bộ lọc hoặc từ khóa tra cứu."
                action={
                  filtered ? (
                    <Button variant="tonal" onClick={clearFilters}>
                      Xóa bộ lọc
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ServiceTable
                items={items}
                pendingCode={pendingCode}
                onToggle={(service, enabled) => void toggleEnabled(service, enabled)}
                onDelete={requestDelete}
              />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        tone="danger"
        title={`Xóa dịch vụ ${deleteTarget?.code ?? ''}?`}
        description={
          <>
            Dịch vụ biến khỏi danh sách và URL callback của nó trả 404. Lịch sử callback vẫn được giữ và mã dịch vụ
            không dùng lại được.
          </>
        }
        confirmLabel="Xóa dịch vụ"
        busy={deleting}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
        fallbackFocus={() => document.getElementById(CREATE_LINK_ID)}
      />
    </PageContainer>
  )
}
