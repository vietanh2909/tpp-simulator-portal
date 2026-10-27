import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Icon } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { buildBackState } from '@/features/transactions/utils/navigation-state'
import { formatDateTime, formatRelative } from '@/utils/format'
import { REJECTION_REASON_LABEL } from '../constants/callbacks.constants'
import type { CallbackSummary } from '../types/callbacks.types'
import { BusinessStatusBadge, HttpStatusBadge, OutcomeBadge } from './StatusBadges'

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

export function CallbackTable({ items }: { items: CallbackSummary[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const backState = buildBackState(location.pathname, location.search)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" data-testid="callbacks-table">
        <caption className="sr-only">Danh sách tất cả callback, mỗi lần nhận là một dòng</caption>
        <thead className="bg-surface-container-low">
          <tr>
            <th scope="col" className={TH}>
              Mã
            </th>
            <th scope="col" className={TH}>
              Nhận lúc
            </th>
            <th scope="col" className={TH}>
              Dịch vụ
            </th>
            <th scope="col" className={TH}>
              transactionId
            </th>
            <th scope="col" className={TH}>
              Status nghiệp vụ
            </th>
            <th scope="col" className={TH}>
              Kết quả xử lý
            </th>
            <th scope="col" className={TH}>
              HTTP đã trả
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const href = ROUTES.callbackDetail(item.recordId)
            return (
              <tr
                key={item.recordId}
                onClick={() => navigate(href, { state: backState })}
                className="group cursor-pointer border-t border-slate-100 transition-colors hover:bg-primary-fixed/40"
              >
                <td className="px-4 py-2.5 font-mono text-code-body font-medium">#{item.recordId}</td>
                <td className="px-4 py-2.5 font-mono text-code-body">
                  <div>{formatDateTime(item.receivedAt)}</div>
                  <div className="text-body-sm text-on-surface-variant">{formatRelative(item.receivedAt)}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone="primary" title={item.serviceCode}>
                    {item.serviceCode}
                  </Badge>
                  {item.serviceDeleted && <span className="ml-1.5 text-body-sm text-on-surface-variant">(đã xóa)</span>}
                </td>
                <td className="max-w-64 truncate px-4 py-2.5 font-mono text-code-body" title={item.transactionId ?? ''}>
                  {item.transactionId ?? <EmptyCell label="Không lấy được transactionId" />}
                </td>
                <td className="px-4 py-2.5">
                  {item.outcome === 'REJECTED' ? (
                    <EmptyCell label="Không có status vì request bị từ chối" />
                  ) : (
                    <BusinessStatusBadge status={item.status} />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col items-start gap-1">
                    <OutcomeBadge outcome={item.outcome} />
                    {item.rejectionReason && (
                      <span className="text-body-sm text-on-surface-variant">
                        {REJECTION_REASON_LABEL[item.rejectionReason]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <HttpStatusBadge status={item.httpStatusReturned} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    to={href}
                    state={backState}
                    data-testid="view-callback"
                    aria-label={`Xem chi tiết callback #${item.recordId} của ${item.serviceCode}`}
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
