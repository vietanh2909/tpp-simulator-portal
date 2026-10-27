import { appConfig } from '@/app/config'
import {
  OUTCOME_LABEL,
  OUTCOME_VALUES,
  REJECTION_REASON_LABEL,
  REJECTION_REASON_VALUES,
} from '@/features/callbacks/constants/callbacks.constants'
import type { CallbackOutcome, RejectionReason } from '@/features/callbacks/types/callbacks.types'
import { RANGE_OPTIONS, isRangeKey, type RangeKey } from './time-filter'

export type MonitoringTab = 'transactions' | 'callbacks'

/** Bộ lọc của một tab (mỗi tab giữ bộ lọc riêng, D9). Trường không thuộc tab luôn rỗng. */
export interface MonitoringFilters {
  service: string
  txn: string
  /** Chỉ tab Giao dịch: ô chữ, khớp chuỗi chứa. */
  status: string
  /** Chỉ tab Tất cả callback. */
  outcome: CallbackOutcome | ''
  /** Chỉ tab Tất cả callback và chỉ khi `outcome` là `REJECTED`. */
  reason: RejectionReason | ''
  range: RangeKey
  from: string
  to: string
}

export interface MonitoringQuery extends MonitoringFilters {
  tab: MonitoringTab
  page: number
  size: number
}

export const EMPTY_FILTERS: MonitoringFilters = {
  service: '',
  txn: '',
  status: '',
  outcome: '',
  reason: '',
  range: 'all',
  from: '',
  to: '',
}

export const DEFAULT_PAGE_SIZE = appConfig.defaultPageSize

/** Backend chỉ nhận 20, 50, 100; giá trị khác (kể cả 10) quy về mặc định thay vì gửi và bị 400. */
export function normalizePageSize(value: number): number {
  return (appConfig.pageSizeOptions as readonly number[]).includes(value) ? value : DEFAULT_PAGE_SIZE
}

function positiveInt(text: string | null): number {
  const value = Number(text)
  return Number.isInteger(value) && value > 0 ? value : 1
}

/** `custom` mà cả hai ô thời gian đều trống thì không giới hạn gì (R-03): tương đương "Tất cả thời gian". */
function isEmptyCustomRange(filters: Pick<MonitoringFilters, 'range' | 'from' | 'to'>): boolean {
  return filters.range === 'custom' && filters.from.trim() === '' && filters.to.trim() === ''
}

/**
 * Đưa bộ lọc về dạng hợp lệ của tab: bỏ trường không thuộc tab, `reason` chỉ khi bị từ chối, `custom` giữ hai ô
 * và quy về `all` khi cả hai ô trống.
 */
export function normalizeFilters(tab: MonitoringTab, filters: MonitoringFilters): MonitoringFilters {
  const outcome = tab === 'callbacks' ? filters.outcome : ''
  const range = isEmptyCustomRange(filters) ? 'all' : filters.range
  return {
    service: filters.service,
    txn: filters.txn,
    status: tab === 'transactions' ? filters.status : '',
    outcome,
    reason: outcome === 'REJECTED' ? filters.reason : '',
    range,
    from: range === 'custom' ? filters.from : '',
    to: range === 'custom' ? filters.to : '',
  }
}

export function parseQuery(params: URLSearchParams): MonitoringQuery {
  const tab: MonitoringTab = params.get('tab') === 'callbacks' ? 'callbacks' : 'transactions'
  const outcomeParam = params.get('outcome')
  const reasonParam = params.get('reason')
  const rangeParam = params.get('range')
  const filters = normalizeFilters(tab, {
    service: params.get('service') ?? '',
    txn: params.get('txn') ?? '',
    status: params.get('status') ?? '',
    outcome: OUTCOME_VALUES.includes(outcomeParam as CallbackOutcome) ? (outcomeParam as CallbackOutcome) : '',
    reason: REJECTION_REASON_VALUES.includes(reasonParam as RejectionReason) ? (reasonParam as RejectionReason) : '',
    range: isRangeKey(rangeParam) ? rangeParam : 'all',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  })
  return {
    tab,
    ...filters,
    page: positiveInt(params.get('page')),
    size: normalizePageSize(Number(params.get('size'))),
  }
}

/** Chỉ ghi giá trị khác mặc định để URL gọn; `parseQuery(serializeQuery(q))` trả lại `q`. */
export function serializeQuery(query: MonitoringQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.tab !== 'transactions') params.set('tab', query.tab)
  const filters = normalizeFilters(query.tab, query)
  if (filters.service) params.set('service', filters.service)
  if (filters.txn) params.set('txn', filters.txn)
  if (filters.status) params.set('status', filters.status)
  if (filters.outcome) params.set('outcome', filters.outcome)
  if (filters.reason) params.set('reason', filters.reason)
  if (filters.range !== 'all') params.set('range', filters.range)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (query.page > 1) params.set('page', String(query.page))
  if (query.size !== DEFAULT_PAGE_SIZE) params.set('size', String(query.size))
  return params
}

/** Khóa định danh một truy vấn dữ liệu (tab, bộ lọc, trang, cỡ trang): hai truy vấn cùng khóa cho cùng kết quả. */
export function queryKey(query: MonitoringQuery): string {
  return serializeQuery(query).toString()
}

/**
 * Có bộ lọc nào đang áp dụng không (để phân biệt "chưa có dữ liệu" với "không khớp bộ lọc").
 * `custom` chỉ tính là đang lọc khi có ít nhất một ô thời gian (R-03).
 */
export function hasActiveFilters(filters: MonitoringFilters): boolean {
  return Boolean(
    filters.service ||
    filters.txn ||
    filters.status ||
    filters.outcome ||
    filters.reason ||
    (filters.range !== 'all' && !isEmptyCustomRange(filters)),
  )
}

// ---------------------------------------------------------------------------------------------
// Bộ lọc của tab còn lại nhớ trong sessionStorage (khóa riêng mỗi tab, không chứa dữ liệu nhạy cảm).
// ---------------------------------------------------------------------------------------------

const STORAGE_PREFIX = 'tpp-simulator:monitoring:'

export interface StoredTabState extends MonitoringFilters {
  page: number
  size: number
}

export function saveTabState(tab: MonitoringTab, state: StoredTabState): void {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${tab}`, JSON.stringify(state))
  } catch {
    // sessionStorage bị chặn hoặc đầy: tính năng nhớ bộ lọc tab kia không bắt buộc.
  }
}

export function loadTabState(tab: MonitoringTab): StoredTabState | null {
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${tab}`)
    if (!raw) return null
    const stored = parseQuery(serializeQuery({ ...(JSON.parse(raw) as StoredTabState), tab }))
    const { service, txn, status, outcome, reason, range, from, to, page, size } = stored
    return { service, txn, status, outcome, reason, range, from, to, page, size }
  } catch {
    return null
  }
}

/** Mô tả bộ lọc đang áp dụng cho dòng "Đang lọc: …". */
export function describeFilters(filters: MonitoringFilters, serviceLabel?: string): string {
  const parts: string[] = []
  if (filters.service) parts.push(`dịch vụ ${serviceLabel ?? filters.service}`)
  if (filters.txn) parts.push(`transactionId chứa "${filters.txn}"`)
  if (filters.status) parts.push(`status chứa "${filters.status}"`)
  if (filters.outcome) parts.push(`kết quả xử lý: ${OUTCOME_LABEL[filters.outcome]}`)
  if (filters.reason) parts.push(`lý do: ${REJECTION_REASON_LABEL[filters.reason]}`)
  if (filters.range === 'custom') {
    if (filters.from) parts.push(`từ ${filters.from}`)
    if (filters.to) parts.push(`đến ${filters.to}`)
  } else if (filters.range !== 'all') {
    parts.push(RANGE_OPTIONS.find((option) => option.value === filters.range)?.label.toLowerCase() ?? filters.range)
  }
  return parts.join(' · ')
}
