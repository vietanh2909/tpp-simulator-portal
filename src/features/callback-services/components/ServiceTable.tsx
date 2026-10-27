import { Link } from 'react-router-dom'
import { CopyButton } from '@/components/common'
import { Badge, Icon, Switch } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { AUTH_TYPE_LABEL } from '../constants/callback-services.constants'
import type { CallbackService } from '../types/callback-services.types'
import { buildCallbackUrlFromPath } from '../utils/callback-url'

interface ServiceTableProps {
  items: CallbackService[]
  /** Mã dịch vụ đang chờ kết quả bật/tắt. */
  pendingCode: string | null
  onToggle: (service: CallbackService, enabled: boolean) => void
  onDelete: (service: CallbackService) => void
}

const TH = 'px-4 py-3 font-mono text-label-sm font-medium tracking-wider text-on-surface-variant uppercase'
const ROW_ACTION =
  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-body-sm font-medium whitespace-nowrap transition-colors'

export function ServiceTable({ items, pendingCode, onToggle, onDelete }: ServiceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="bg-surface-container-low">
          <tr>
            <th scope="col" className={`${TH} w-44 whitespace-nowrap`}>
              Mã dịch vụ
            </th>
            <th scope="col" className={`${TH} min-w-56 whitespace-nowrap`}>
              Tên dịch vụ
            </th>
            <th scope="col" className={TH}>
              URL callback (endpoint)
            </th>
            <th scope="col" className={`${TH} w-52`}>
              Xác thực
            </th>
            <th scope="col" className={`${TH} w-40`}>
              Hoạt động
            </th>
            <th scope="col" className={`${TH} w-44 text-right`}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((service) => {
            const url = buildCallbackUrlFromPath(service.callbackPath)
            return (
              <tr
                key={service.code}
                className="border-t border-slate-100 transition-colors hover:bg-surface-container-low/70"
              >
                <td className="px-4 py-3 align-middle whitespace-nowrap">
                  <span className="inline-flex rounded-md bg-surface-container-high px-2 py-1 font-mono text-label-md font-medium text-primary">
                    {service.code}
                  </span>
                </td>
                <td className="min-w-56 px-4 py-3 align-middle">
                  <p className="text-headline-sm text-on-surface">{service.name}</p>
                  {service.description && <p className="text-body-sm text-on-surface-variant">{service.description}</p>}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex max-w-xl items-center gap-1.5">
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-label-sm font-bold text-emerald-700">
                      POST
                    </span>
                    <span
                      className="min-w-0 truncate rounded-md bg-surface-container-low px-2 py-1 font-mono text-code-body select-all"
                      title={url}
                    >
                      {url}
                    </span>
                    <CopyButton text={url} label="Sao chép URL" />
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  {service.authType === 'API_KEY' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2 py-1 font-mono text-label-sm font-medium text-on-secondary-fixed-variant">
                      <Icon name="key" size={14} />
                      {AUTH_TYPE_LABEL.API_KEY} ({service.apiKeyHeader})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2 py-1 font-mono text-label-sm text-on-surface-variant">
                      <Icon name="lock_open" size={14} />
                      {AUTH_TYPE_LABEL.NONE}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={service.enabled}
                      disabled={pendingCode === service.code}
                      label={`${service.enabled ? 'Tắt' : 'Bật'} dịch vụ ${service.code}`}
                      onChange={(enabled) => onToggle(service, enabled)}
                    />
                    <Badge tone={service.enabled ? 'success' : 'neutral'} mono={false}>
                      {service.enabled ? 'Đang bật' : 'Đã tắt'}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      to={ROUTES.serviceTest(service.code)}
                      title="Gửi thử callback"
                      className={`${ROW_ACTION} bg-surface-container text-primary hover:bg-surface-container-high`}
                    >
                      <Icon name="send" size={15} />
                      Gửi thử
                    </Link>
                    <Link
                      to={ROUTES.serviceEdit(service.code)}
                      title="Chỉnh sửa cấu hình"
                      className={`${ROW_ACTION} text-on-surface hover:bg-surface-container`}
                    >
                      <Icon name="edit" size={15} />
                      Sửa
                    </Link>
                    <button
                      type="button"
                      title="Xóa dịch vụ"
                      aria-label={`Xóa dịch vụ ${service.code}`}
                      onClick={() => onDelete(service)}
                      className={`${ROW_ACTION} text-error hover:bg-error-container/40`}
                    >
                      <Icon name="delete" size={15} />
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
