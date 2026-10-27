import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Icon } from '@/components/ui'
import { BusinessStatusBadge, MappingErrorBadge } from '@/features/callbacks'
import { ROUTES } from '@/constants/routes'
import { formatDateTime, formatRelative, formatTime } from '@/utils/format'
import type { TransactionSummary } from '../types/transactions.types'
import { buildBackState } from '../utils/navigation-state'

const TH = 'px-4 py-3 font-mono text-label-sm font-medium tracking-wide text-on-surface-variant uppercase'

/** Ô trống: dấu "—" cho mắt nhìn và chữ ẩn cho trình đọc màn hình. */
function EmptyCell({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </>
  )
}

export function TransactionTable({ items }: { items: TransactionSummary[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const backState = buildBackState(location.pathname, location.search)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" data-testid="transactions-table">
        <caption className="sr-only">Danh sách giao dịch, mỗi dòng là một cặp dịch vụ và transactionId</caption>
        <thead className="bg-surface-container-low">
          <tr>
            <th scope="col" className={TH}>
              Dịch vụ
            </th>
            <th scope="col" className={TH}>
              transactionId
            </th>
            <th scope="col" className={TH}>
              Status nhận gần nhất
            </th>
            <th scope="col" className={TH}>
              Timestamp nghiệp vụ
            </th>
            <th scope="col" className={TH}>
              Nhận gần nhất
            </th>
            <th scope="col" className={TH}>
              Số callback
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const href = ROUTES.transactionDetail(item.serviceCode, item.transactionId)
            return (
              <tr
                key={`${item.serviceCode}/${item.transactionId}`}
                onClick={() => navigate(href, { state: backState })}
                className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-primary-fixed/40"
              >
                <td className="px-4 py-3">
                  <Badge tone="primary" title={item.serviceCode}>
                    {item.serviceCode}
                  </Badge>
                  {item.serviceDeleted && <span className="ml-1.5 text-body-sm text-on-surface-variant">(đã xóa)</span>}
                </td>
                <td
                  className="max-w-64 truncate px-4 py-3 font-mono text-code-body font-medium text-primary"
                  title={item.transactionId}
                >
                  {item.transactionId}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <BusinessStatusBadge status={item.latestStatus} />
                    {item.latestHasMappingError && <MappingErrorBadge />}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-code-body">
                  {item.latestBusinessTimestamp ? (
                    formatDateTime(item.latestBusinessTimestamp)
                  ) : (
                    <EmptyCell label="Không có timestamp nghiệp vụ" />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-code-body">
                  <div>{formatTime(item.latestReceivedAt)}</div>
                  <div className="text-body-sm text-on-surface-variant">{formatRelative(item.latestReceivedAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="info" mono={false}>
                    {item.callbackCount} callback
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={href}
                    state={backState}
                    data-testid="view-transaction"
                    aria-label={`Xem chi tiết giao dịch ${item.transactionId} của ${item.serviceCode}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1 text-body-md font-medium text-on-surface hover:bg-surface-container"
                  >
                    Xem
                    <Icon name="arrow_forward" size={15} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
