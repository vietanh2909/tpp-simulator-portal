import { useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildCallbackUrl, buildSamplePayload, type CallbackService } from '@/features/callback-services'
import { CopyButton, ErrorPanel } from '@/components/common'
import { Badge, Button, Card, Icon, JsonEditor, JsonViewer, TabPanel, Tabs } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { toErrorMessage } from '@/services/http/error-handler'
import { byteLength, formatBytes, formatDateTime, prettyJson } from '@/utils/format'
import { callbacksApi } from '../api/callbacks.api'
import type { SelfTestResult } from '../types/callbacks.types'
import { isSensitiveHeader } from '../utils/mask-headers'
import { HeadersEditor, type HeaderRow } from './HeadersEditor'
import { HttpStatusBadge } from './StatusBadges'

type RequestTab = 'body' | 'headers'

type PresetId = 'success' | 'processing' | 'error' | 'missing-txn' | 'wrong-key' | 'invalid-json'

interface Preset {
  id: PresetId
  label: string
  icon: string
}

const PRESETS: Preset[] = [
  { id: 'success', label: 'Mẫu 1: SUCCESS', icon: 'task_alt' },
  { id: 'processing', label: 'Mẫu 2: PROCESSING', icon: 'sync' },
  { id: 'error', label: 'Mẫu 3: ERROR', icon: 'error_outline' },
  { id: 'missing-txn', label: 'Thiếu transactionId', icon: 'help_outline' },
  { id: 'wrong-key', label: 'Sai key (401)', icon: 'key_off' },
  { id: 'invalid-json', label: 'JSON lỗi (400)', icon: 'data_object' },
]

const ERROR_CASES = [
  { code: '401 Unauthorized', detail: 'API key sai hoặc thiếu' },
  { code: '400 Bad Request', detail: 'Body không phải JSON hợp lệ hoặc Content-Type không phải JSON' },
  { code: '404 Not Found', detail: 'Mã dịch vụ không tồn tại hoặc đã xóa' },
  { code: '413 Payload Too Large', detail: 'Body lớn hơn 1 MiB (1.048.576 byte)' },
  { code: '503 Service Unavailable', detail: 'Dịch vụ đang tắt' },
]

/** Khóa sai cố định dùng cho mẫu "Sai key" (interaction-spec S3). */
const WRONG_KEY = 'sai-khoa'

let rowCounter = 0
function newRow(name = '', value = ''): HeaderRow {
  rowCounter += 1
  return { id: rowCounter, name, value }
}

/**
 * Header mặc định. Với dịch vụ API_KEY, tên header được điền sẵn còn giá trị luôn để trống: backend không bao giờ
 * trả khóa về trình duyệt (AC2.10.4). `X-Callback-Id` không tồn tại ở backend nên không có.
 */
function buildHeaders(service: CallbackService, apiKeyOverride = ''): HeaderRow[] {
  const rows = [newRow('Content-Type', 'application/json')]
  if (service.authType === 'API_KEY') rows.push(newRow(service.apiKeyHeader, apiKeyOverride))
  return rows
}

function buildBody(service: CallbackService, status: string, omitTxn = false): string {
  const payload = buildSamplePayload(service, {
    transactionId: 'TEST-001',
    status,
    businessTime: new Date(),
    omit: omitTxn ? 'transactionId' : undefined,
  })
  return JSON.stringify(payload, null, 2)
}

function headerRowsToRecord(rows: HeaderRow[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const row of rows) {
    const name = row.name.trim()
    if (name) record[name] = row.value
  }
  return record
}

function bodyValidity(body: string): string | null {
  try {
    JSON.parse(body)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'JSON không hợp lệ'
  }
}

export function SelfTestPanel({ service }: { service: CallbackService }) {
  const [body, setBody] = useState(() => buildBody(service, 'SUCCESS'))
  const [headers, setHeaders] = useState<HeaderRow[]>(() => buildHeaders(service))
  const [tab, setTab] = useState<RequestTab>('body')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SelfTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sendId = useRef(0)
  const tabsId = useId()

  const url = buildCallbackUrl(service.code)
  // Phản hồi không trả mã bản ghi nên chỉ liên kết sang tab "Tất cả callback" đã lọc theo dịch vụ (AC2.10.3).
  const monitoringHref = `${ROUTES.monitoring}?tab=callbacks&service=${encodeURIComponent(service.code)}`
  const jsonError = useMemo(() => bodyValidity(body), [body])
  const headerCount = headers.filter((row) => row.name.trim()).length

  function applyPreset(id: PresetId) {
    switch (id) {
      case 'success':
      case 'processing':
      case 'error': {
        const status = id === 'success' ? 'SUCCESS' : id === 'processing' ? 'PROCESSING' : 'ERROR'
        setBody(buildBody(service, status))
        setHeaders(buildHeaders(service))
        break
      }
      case 'missing-txn':
        setBody(buildBody(service, 'SUCCESS', true))
        setHeaders(buildHeaders(service))
        break
      case 'wrong-key':
        setBody(buildBody(service, 'SUCCESS'))
        setHeaders(buildHeaders(service, WRONG_KEY))
        break
      case 'invalid-json':
        setBody('{ "transactionId": "TEST-001", "status": ')
        setHeaders(buildHeaders(service))
        break
    }
  }

  async function handleSend() {
    const id = ++sendId.current
    setSending(true)
    setError(null)
    try {
      const outcome = await callbacksApi.sendTest(service.code, { headers: headerRowsToRecord(headers), body })
      if (id === sendId.current) setResult(outcome)
    } catch (sendError) {
      if (id === sendId.current) {
        setResult(null)
        setError(toErrorMessage(sendError))
      }
    } finally {
      if (id === sendId.current) {
        setSending(false)
        // Không giữ giá trị khóa sau khi gửi (NFR3): xóa giá trị của các header nhạy cảm, tên header được giữ lại.
        setHeaders((current) =>
          current.map((row) => (isSensitiveHeader(row.name, service.apiKeyHeader) ? { ...row, value: '' } : row)),
        )
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-mono text-label-md tracking-wide text-on-surface-variant uppercase">
              Đích nhận webhook (target endpoint)
            </p>
            <span className="font-mono text-label-sm text-on-surface-variant">application/json</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-1.5">
            <span className="rounded-md bg-primary px-3 py-1.5 font-mono text-label-md font-semibold text-on-primary">
              POST
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-code-body" title={url}>
              {url}
            </span>
            <CopyButton text={url} label="Sao chép URL" />
          </div>

          <p className="mt-4 mb-2 font-mono text-label-md text-on-surface-variant">Chọn mẫu dữ liệu nhanh (presets):</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const disabled = preset.id === 'wrong-key' && service.authType !== 'API_KEY'
              return (
                <Button
                  key={preset.id}
                  size="sm"
                  variant="tonal"
                  icon={preset.icon}
                  disabled={disabled}
                  title={disabled ? 'Dịch vụ này không yêu cầu API key' : undefined}
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Tabs<RequestTab>
              ariaLabel="Thành phần request"
              idBase={tabsId}
              value={tab}
              onChange={setTab}
              items={[
                { value: 'body', label: 'Request Body', icon: <Icon name="data_object" size={16} /> },
                {
                  value: 'headers',
                  label: 'Request Headers',
                  count: headerCount,
                  icon: <Icon name="list_alt" size={16} />,
                },
              ]}
            />
            <span className="font-mono text-label-md text-on-surface-variant">{formatBytes(byteLength(body))}</span>
          </div>

          <TabPanel idBase={tabsId} value={tab} className="mt-3">
            {tab === 'body' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-body-sm">
                  {jsonError ? (
                    <span role="alert" className="flex items-center gap-1 text-amber-700">
                      <Icon name="warning" size={15} />
                      JSON không hợp lệ, request sẽ nhận 400: {jsonError}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Icon name="check_circle" size={15} />
                      JSON hợp lệ
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="format_align_left"
                      onClick={() => setBody(prettyJson(body))}
                    >
                      Format
                    </Button>
                    <CopyButton text={body} label="Copy" withLabel />
                  </span>
                </div>
                <JsonEditor
                  tone="dark"
                  minLines={12}
                  value={body}
                  onChange={setBody}
                  invalid={Boolean(jsonError)}
                  aria-label="Request body (JSON)"
                />
              </div>
            ) : (
              <HeadersEditor
                rows={headers}
                apiKeyHeader={service.apiKeyHeader}
                onChange={setHeaders}
                onAdd={() => setHeaders([...headers, newRow()])}
              />
            )}
          </TabPanel>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1 font-mono text-label-md text-on-surface-variant">
              <Icon name="tune" size={16} />
              Chế độ: Gửi đồng bộ (Synchronous HTTP)
            </p>
            <Button variant="primary" size="lg" icon="send" loading={sending} onClick={() => void handleSend()}>
              {sending ? 'Đang gửi...' : 'Gửi callback'}
            </Button>
          </div>
        </Card>

        <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3 text-body-md text-on-surface-variant">
          <Icon name="lightbulb" size={20} className="mt-0.5 text-primary" />
          <p>
            <strong className="text-on-surface">Mẹo kiểm thử:</strong> dùng mẫu <em>“Sai key (401)”</em> để xác nhận TPP
            từ chối callback giả mạo, và mẫu <em>“Thiếu transactionId”</em> để xem callback lỗi mapping vẫn được lưu
            riêng.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-headline-md">
              <Icon name="terminal" size={20} className="text-primary" />
              Kết quả phản hồi (Response)
            </h2>
            <Badge tone="neutral" mono>
              {sending ? 'Đang gửi' : result ? 'Hoàn tất' : error ? 'Lỗi' : 'Đang chờ lệnh'}
            </Badge>
          </div>

          {error && <ErrorPanel compact title="Không gửi được callback" message={error} />}

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-slate-200 text-center">
            <div className="bg-surface-container-low p-2">
              <dt className="font-mono text-label-sm text-on-surface-variant uppercase">Trạng thái</dt>
              <dd className="mt-1 min-h-5">{result ? <HttpStatusBadge status={result.httpStatus} /> : '—'}</dd>
            </div>
            <div className="bg-surface-container-low p-2">
              <dt className="font-mono text-label-sm text-on-surface-variant uppercase">Thời gian</dt>
              <dd className="mt-1 font-mono text-label-lg">{result ? `${result.processingMs} ms` : '—'}</dd>
            </div>
            <div className="bg-surface-container-low p-2">
              <dt className="font-mono text-label-sm text-on-surface-variant uppercase">Dung lượng</dt>
              <dd className="mt-1 font-mono text-label-lg">
                {result ? formatBytes(byteLength(result.responseBody)) : '—'}
              </dd>
            </div>
          </dl>

          {result && (
            <div className="mt-3 flex flex-col gap-3">
              <p
                className={
                  result.simulatorError
                    ? 'rounded-lg bg-amber-50 px-3 py-2 text-body-sm text-amber-800'
                    : 'rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800'
                }
              >
                {result.simulatorError ? (
                  <>
                    Simulator từ chối request này (
                    <code className="font-mono">X-Simulator-Error: {result.simulatorError}</code>).
                  </>
                ) : (
                  'Đây là response đã cấu hình của dịch vụ (không có header X-Simulator-Error).'
                )}
              </p>
              {result.httpStatus === 413 && (
                <p role="note" className="rounded-lg bg-amber-50 px-3 py-2 text-body-sm text-amber-800">
                  413: body lớn hơn giới hạn 1 MiB (1.048.576 byte). Request bị chặn trước khi đọc hết body và không
                  được lưu thành callback.
                </p>
              )}
              <Link
                to={monitoringHref}
                className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 text-body-md hover:bg-surface-container"
              >
                <span className="flex items-center gap-2">
                  <Icon name="receipt_long" size={18} className="text-primary" />
                  Xem trong Theo dõi giao dịch (lọc theo dịch vụ {service.code})
                </span>
                <Icon name="open_in_new" size={18} className="text-primary" />
              </Link>
              <p className="flex justify-between font-mono text-code-body">
                <span className="text-on-surface-variant">Thời điểm gửi:</span>
                <span>{formatDateTime(result.sentAt, true)} GMT+7</span>
              </p>
              <div>
                <p className="mb-1 font-mono text-label-md">Headers nhận được:</p>
                <dl className="flex flex-col gap-0.5 rounded-lg bg-surface-container-low p-2 font-mono text-code-body">
                  {Object.entries(result.responseHeaders).map(([name, value]) => (
                    <div key={name} className="flex justify-between gap-3">
                      <dt className="text-on-surface-variant">{name}:</dt>
                      <dd className="text-right break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-mono text-label-md">Payload phản hồi (Body):</p>
                  <CopyButton text={result.responseBody} label="Copy" withLabel />
                </div>
                <JsonViewer
                  value={prettyJson(result.responseBody)}
                  tone="dark"
                  minLines={4}
                  ariaLabel="Response body"
                />
              </div>
            </div>
          )}
          {!result && !error && (
            <p className="mt-3 text-body-sm text-on-surface-variant">
              Bấm “Gửi callback” để xem HTTP status, response body và thời gian xử lý tại đây.
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="flex items-center gap-2 text-headline-sm">
            <Icon name="rule" size={18} className="text-tertiary-container" />
            Hành vi của endpoint nhận callback
          </h3>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Backend kiểm tra theo thứ tự: kích thước body, dịch vụ tồn tại, đang bật, xác thực, Content-Type, JSON hợp
            lệ. Request bị từ chối vẫn được lưu thành callback kèm lý do, trừ 413 và mã dịch vụ chưa từng có.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ERROR_CASES.map((item) => (
              <li key={item.code} className="rounded-lg bg-surface-container-low px-3 py-2">
                <p className="font-mono text-label-md font-semibold text-rose-700">{item.code}</p>
                <p className="text-body-sm text-on-surface-variant">{item.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
