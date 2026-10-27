import { Badge } from '@/components/ui'
import { formatDateTime } from '@/utils/format'
import type { FieldResult, MappingFields } from '../types/callbacks.types'

const FIELD_ORDER = ['transactionId', 'status', 'timestamp'] as const

function valueText(key: (typeof FIELD_ORDER)[number], field: FieldResult): string | null {
  if (field.value === null) return null
  return key === 'timestamp' ? `${formatDateTime(field.value, true)} GMT+7` : field.value
}

/** Kết quả mapping từng trường do backend tính; trường không có kết quả (chưa chạy mapping) không bịa giá trị. */
export function MappingResultTable({ fields }: { fields: MappingFields }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left text-body-md" data-testid="mapping-table">
        <caption className="sr-only">Kết quả mapping từng trường</caption>
        <thead className="bg-surface-container-low font-mono text-label-sm text-on-surface-variant uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Trường
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Giá trị lấy được
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Kết quả
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {FIELD_ORDER.map((key) => {
            const field = fields[key]
            const text = field ? valueText(key, field) : null
            const failed = field?.errorCode != null || (field?.error ?? null) !== null
            return (
              <tr key={key}>
                <td className="px-3 py-2 font-mono text-code-body">{key}</td>
                <td className="px-3 py-2 font-mono text-code-body">
                  {text !== null ? (
                    <span className="text-indigo-700">{text}</span>
                  ) : failed ? (
                    <span className="text-rose-700">Không lấy được</span>
                  ) : (
                    <>
                      <span aria-hidden="true" className="text-on-surface-variant">
                        —
                      </span>
                      <span className="sr-only">Không có giá trị</span>
                    </>
                  )}
                  {field?.errorCode && (
                    <p className="mt-0.5 font-mono text-label-sm text-rose-700">{field.errorCode}</p>
                  )}
                  {field?.error && <p className="mt-0.5 font-sans text-body-sm text-rose-700">{field.error}</p>}
                  {field?.warning && <p className="mt-0.5 font-sans text-body-sm text-amber-700">{field.warning}</p>}
                </td>
                <td className="px-3 py-2 text-right">
                  {failed ? (
                    <Badge tone="danger" mono={false}>
                      <span aria-hidden="true">✕</span>Lỗi
                    </Badge>
                  ) : text !== null ? (
                    <Badge tone="success" mono={false}>
                      <span aria-hidden="true">✓</span>
                      {key === 'timestamp' ? 'Chuẩn hóa OK' : 'Hợp lệ'}
                    </Badge>
                  ) : (
                    <Badge tone="neutral" mono={false}>
                      Bỏ qua
                    </Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
