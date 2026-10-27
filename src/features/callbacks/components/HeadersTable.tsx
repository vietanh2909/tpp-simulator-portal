import { Icon } from '@/components/ui'
import type { StoredHeader } from '../types/callbacks.types'

export function HeadersTable({ headers }: { headers: StoredHeader[] }) {
  if (headers.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 px-3 py-2 text-body-sm text-on-surface-variant">
        Không có header nào được ghi nhận.
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left" data-testid="headers-table">
        <caption className="sr-only">Header của request đã nhận, giá trị nhạy cảm đã được che</caption>
        <tbody className="divide-y divide-slate-100">
          {headers.map((header) => (
            <tr key={header.name}>
              <th
                scope="row"
                className="w-1/3 bg-surface-container-low px-3 py-1.5 font-mono text-code-body font-medium"
              >
                <span className="inline-flex items-center gap-1">
                  {header.name}
                  {header.masked && <Icon name="lock" size={13} className="text-on-surface-variant" />}
                </span>
              </th>
              <td className="px-3 py-1.5 font-mono text-code-body break-all">
                {header.masked ? (
                  <span className="text-on-surface-variant" title="Giá trị nhạy cảm đã được che">
                    {header.value}
                    <span className="sr-only"> (đã che)</span>
                  </span>
                ) : (
                  header.value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
