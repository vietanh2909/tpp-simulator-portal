import { useState, type FormEvent } from 'react'
import { Button, Card, Field, Icon, Input, Select, Switch } from '@/components/ui'
import {
  OUTCOME_LABEL,
  OUTCOME_VALUES,
  REJECTION_REASON_LABEL,
  REJECTION_REASON_VALUES,
} from '@/features/callbacks/constants/callbacks.constants'
import type { CallbackOutcome, RejectionReason } from '@/features/callbacks/types/callbacks.types'
import { DISPLAY_TZ_LABEL, formatTime } from '@/utils/format'
import { normalizeFilters, type MonitoringFilters as FilterValues, type MonitoringTab } from '../utils/monitoring-query'
import { RANGE_OPTIONS, validateTimeInputs, type RangeKey, type TimeInputErrors } from '../utils/time-filter'

export interface ServiceOption {
  code: string
  label: string
}

interface MonitoringFiltersProps {
  tab: MonitoringTab
  /** Bộ lọc đang áp dụng (từ URL). Đổi `key` của thành phần khi muốn đặt lại các ô nháp theo giá trị này. */
  applied: FilterValues
  serviceOptions: ServiceOption[]
  /** Dòng "Đang lọc: …" (rỗng khi không có bộ lọc). */
  summary: string
  onApply: (filters: FilterValues) => void
  onReset: () => void
  autoRefresh: boolean
  onAutoRefreshChange: (value: boolean) => void
  pollSeconds: number
  updatedAt: Date | undefined
  onReload: () => void
}

/**
 * Thanh bộ lọc và thanh cập nhật của màn hình theo dõi. Các ô là bản nháp: chỉ Enter hoặc "Áp dụng" mới áp dụng
 * (và chỉ khi hai ô thời gian hợp lệ); "Xóa bộ lọc" đưa về mặc định.
 */
export function MonitoringFilters(props: MonitoringFiltersProps) {
  const { tab, applied, serviceOptions, summary, onApply, onReset } = props
  const [draft, setDraft] = useState<FilterValues>(applied)
  const [errors, setErrors] = useState<TimeInputErrors>({})

  // Dịch vụ đang lọc luôn có mặt trong danh sách chọn dù danh sách dịch vụ chưa tải xong hoặc tải lỗi.
  const options =
    draft.service && !serviceOptions.some((option) => option.code === draft.service)
      ? [...serviceOptions, { code: draft.service, label: draft.service }]
      : serviceOptions

  function patch(next: Partial<FilterValues>) {
    setDraft((current) => ({ ...current, ...next }))
    if ('from' in next || 'to' in next || 'range' in next) setErrors({})
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = draft.range === 'custom' ? validateTimeInputs(draft.from, draft.to) : {}
    setErrors(nextErrors)
    if (nextErrors.from || nextErrors.to) return
    onApply(normalizeFilters(tab, { ...draft, txn: draft.txn.trim(), status: draft.status.trim() }))
  }

  return (
    <Card className="p-4">
      <form
        className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={handleSubmit}
        aria-label="Bộ lọc theo dõi"
      >
        <Field label="Dịch vụ tích hợp">
          {({ id }) => (
            <Select id={id} value={draft.service} onChange={(event) => patch({ service: event.target.value })}>
              <option value="">Tất cả dịch vụ ({serviceOptions.length})</option>
              {options.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Mã giao dịch (transactionId)">
          {({ id }) => (
            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
              />
              <Input
                id={id}
                mono
                placeholder="Ví dụ: TEST-001, TXN-88..."
                autoComplete="off"
                className="pl-9"
                value={draft.txn}
                onChange={(event) => patch({ txn: event.target.value })}
              />
            </div>
          )}
        </Field>
        {tab === 'transactions' ? (
          <Field label="Status (chứa chuỗi)">
            {({ id }) => (
              <Input
                id={id}
                mono
                placeholder="Ví dụ: 00, SUCCESS"
                autoComplete="off"
                value={draft.status}
                onChange={(event) => patch({ status: event.target.value })}
              />
            )}
          </Field>
        ) : (
          <Field label="Kết quả xử lý">
            {({ id }) => (
              <Select
                id={id}
                value={draft.outcome}
                onChange={(event) => patch({ outcome: event.target.value as CallbackOutcome | '', reason: '' })}
              >
                <option value="">Tất cả</option>
                {OUTCOME_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {OUTCOME_LABEL[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <div className="flex items-center gap-2 pt-5">
          <Button type="submit" variant="primary" icon="filter_alt" className="flex-1 xl:w-32">
            Áp dụng
          </Button>
          <Button variant="secondary" icon="restart_alt" onClick={onReset}>
            Xóa bộ lọc
          </Button>
        </div>

        {tab === 'callbacks' && draft.outcome === 'REJECTED' && (
          <Field label="Lý do">
            {({ id }) => (
              <Select
                id={id}
                value={draft.reason}
                onChange={(event) => patch({ reason: event.target.value as RejectionReason | '' })}
              >
                <option value="">Tất cả lý do</option>
                {REJECTION_REASON_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {REJECTION_REASON_LABEL[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <Field label={`Khung giờ nhận (${DISPLAY_TZ_LABEL})`}>
          {({ id }) => (
            <Select id={id} value={draft.range} onChange={(event) => patch({ range: event.target.value as RangeKey })}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {draft.range === 'custom' && (
          <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-3 xl:max-w-3xl">
            <Field label="Nhận từ (GMT+7)" hint="yyyy-MM-dd HH:mm:ss hoặc yyyy-MM-dd (00:00:00)" error={errors.from}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  mono
                  placeholder="2026-10-19 00:00:00"
                  autoComplete="off"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={draft.from}
                  onChange={(event) => patch({ from: event.target.value })}
                />
              )}
            </Field>
            <Field
              label="Nhận đến (GMT+7)"
              hint="yyyy-MM-dd HH:mm:ss hoặc yyyy-MM-dd (23:59:59), gồm cả giây này"
              error={errors.to}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  mono
                  placeholder="2026-10-19 23:59:59"
                  autoComplete="off"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={draft.to}
                  onChange={(event) => patch({ to: event.target.value })}
                />
              )}
            </Field>
          </div>
        )}
      </form>

      {summary && (
        <p className="mt-3 flex items-start gap-1.5 text-body-sm text-on-surface-variant" data-testid="active-filters">
          <Icon name="filter_list" size={15} className="mt-0.5" />
          <span>Đang lọc: {summary}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2">
        <div className="flex items-center gap-2 text-body-sm">
          <Switch
            checked={props.autoRefresh}
            onChange={props.onAutoRefreshChange}
            label={`Tự cập nhật mỗi ${props.pollSeconds} giây`}
          />
          <span className="font-mono text-label-md text-on-surface">
            {props.autoRefresh ? `Tự cập nhật mỗi ${props.pollSeconds} giây` : 'Tự cập nhật đang tắt'}
          </span>
          <span className="text-on-surface-variant">· Giữ bộ lọc và trang hiện tại khi có dữ liệu mới</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-label-md text-on-surface-variant">
            <Icon name="schedule" size={15} />
            Cập nhật lúc{' '}
            <strong className="text-on-surface">
              {props.updatedAt ? `${formatTime(props.updatedAt.toISOString())} (${DISPLAY_TZ_LABEL})` : '—'}
            </strong>
          </span>
          <Button size="sm" variant="tonal" icon="refresh" onClick={props.onReload}>
            Tải lại
          </Button>
        </div>
      </div>
    </Card>
  )
}
