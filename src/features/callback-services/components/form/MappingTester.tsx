import { useRef, useState } from 'react'
import { Badge, Button, Card, Icon, JsonEditor, SectionHeader } from '@/components/ui'
import { ApiError, toErrorMessage } from '@/services/http/error-handler'
import { byteLength, formatDateTime, prettyJson } from '@/utils/format'
import { mappingTestsApi } from '../../api/mapping-tests.api'
import { MAPPING_FIELDS } from '../../constants/callback-services.constants'
import type {
  MappingFieldErrorCode,
  MappingFieldResultDto,
  MappingTestResponse,
  ServiceFormValues,
} from '../../types/callback-services.types'
import { buildSamplePayload } from '../../utils/sample-payload'

type TestOutcome =
  | { kind: 'error'; message: string }
  | { kind: 'invalid-json'; message: string | null }
  | { kind: 'result'; response: MappingTestResponse }

const ERROR_LABEL: Record<MappingFieldErrorCode, string> = {
  NOT_FOUND: 'Không tìm thấy',
  EMPTY: 'Giá trị rỗng',
  WRONG_TYPE: 'Sai kiểu (object hoặc mảng)',
  TOO_LONG: 'Giá trị quá dài',
  PAYLOAD_NOT_OBJECT: 'JSON mẫu không phải object',
  UNPARSEABLE: 'Không đọc được theo định dạng đã cấu hình',
}

function toMappingConfig(values: ServiceFormValues) {
  return {
    mapping: values.mapping,
    timestampFormat: values.timestampFormat,
    timestampPattern: values.timestampPattern,
    timezone: values.timezone,
  }
}

function sampleText(values: ServiceFormValues, omitStatus: boolean): string {
  return JSON.stringify(
    buildSamplePayload(toMappingConfig(values), {
      transactionId: 'TEST-001',
      status: 'SUCCESS',
      businessTime: new Date(),
      omit: omitStatus ? 'status' : undefined,
    }),
    null,
    2,
  )
}

/** Chuỗi mô tả cấu hình mapping đang nhập, dùng để biết kết quả đã cũ hay chưa (D4). */
function snapshotOf(values: ServiceFormValues, text: string): string {
  return JSON.stringify([values.mapping, values.timestampFormat, values.timestampPattern, values.timezone, text])
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiError && error.fieldErrors.length > 0) {
    return `Cấu hình mapping không hợp lệ: ${error.fieldErrors.map((item) => item.message).join(' ')}`
  }
  return toErrorMessage(error)
}

/** Thử mapping bằng server (`POST /api/mapping-tests`) theo cấu hình đang nhập: không ghi callback hay giao dịch nào. */
export function MappingTester({ values }: { values: ServiceFormValues }) {
  const [text, setText] = useState(() => sampleText(values, false))
  const [outcome, setOutcome] = useState<TestOutcome | null>(null)
  const [ranWith, setRanWith] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const requestId = useRef(0)

  const stale = outcome !== null && ranWith !== null && ranWith !== snapshotOf(values, text)

  function replaceText(next: string) {
    setText(next)
  }

  async function runTest() {
    const id = ++requestId.current
    const snapshot = snapshotOf(values, text)
    setRunning(true)
    try {
      const response = await mappingTestsApi.run(values, text)
      if (id !== requestId.current) return
      setOutcome(
        response.sampleJsonValid
          ? { kind: 'result', response }
          : { kind: 'invalid-json', message: response.sampleJsonError ?? null },
      )
      setRanWith(snapshot)
    } catch (error) {
      if (id !== requestId.current) return
      setOutcome({ kind: 'error', message: describeFailure(error) })
      setRanWith(snapshot)
    } finally {
      if (id === requestId.current) setRunning(false)
    }
  }

  const fieldResults =
    outcome?.kind === 'result'
      ? MAPPING_FIELDS.map((meta) => ({
          meta,
          result: outcome.response[meta.key] as MappingFieldResultDto | undefined,
        }))
      : []
  const configured = fieldResults.filter(
    ({ meta }) => meta.key !== 'timestamp' || values.mapping.timestamp.trim() !== '',
  )
  const okCount = configured.filter(({ result }) => result?.value != null && !result.errorCode).length

  return (
    <Card as="section" className="p-5">
      <SectionHeader
        icon="play_circle"
        title="D. Thử nghiệm mapping trực tiếp (Interactive Payload Tester)"
        subtitle="Kiểm tra ngay biểu thức đối chiếu với payload thực tế, theo cấu hình đang sửa (chưa cần lưu)"
        actions={
          <>
            <Button size="sm" variant="tonal" onClick={() => replaceText(sampleText(values, false))}>
              Mẫu hợp lệ
            </Button>
            <Button size="sm" variant="tonal" onClick={() => replaceText(sampleText(values, true))}>
              Mẫu thiếu trường
            </Button>
            <Button size="sm" variant="tonal" onClick={() => replaceText(prettyJson(text))}>
              Định dạng JSON
            </Button>
          </>
        }
      />

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-body-sm text-sky-900">
        <Icon name="info" size={16} />
        <span>
          Kết quả do server tính theo đúng quy tắc lúc nhận callback. Kiểm tra này{' '}
          <strong>không lưu bản ghi callback</strong> hay giao dịch nào.
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-label-md text-on-surface-variant">
            <span>Raw Request Payload (JSON)</span>
            <span>{byteLength(text)} bytes</span>
          </div>
          <JsonEditor
            minLines={12}
            value={text}
            onChange={replaceText}
            invalid={outcome?.kind === 'invalid-json'}
            aria-label="Payload thử nghiệm (JSON)"
          />
          <div>
            <Button variant="primary" icon="play_arrow" loading={running} onClick={() => void runTest()}>
              Kiểm tra mapping
            </Button>
          </div>
        </div>

        <div className="min-w-0 rounded-lg bg-surface-container-low p-3" aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-label-md text-on-surface-variant">Kết quả bóc tách (Parsed Mapping Output)</p>
            {outcome?.kind === 'result' && (
              <Badge tone={okCount === configured.length ? 'success' : okCount === 0 ? 'danger' : 'warning'}>
                {okCount}/{configured.length} hợp lệ
              </Badge>
            )}
          </div>

          {stale && <p className="mb-2 text-body-sm text-amber-700">Kết quả đã cũ, hãy kiểm tra lại.</p>}

          {outcome === null && (
            <p className="py-8 text-center text-body-sm text-on-surface-variant">
              Bấm “Kiểm tra mapping” để xem giá trị lấy được và lỗi từng trường.
            </p>
          )}

          {outcome?.kind === 'invalid-json' && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-body-md text-rose-800">
              <p className="font-semibold">JSON mẫu không hợp lệ.</p>
              {outcome.message && <p className="mt-0.5 font-mono text-code-body break-words">{outcome.message}</p>}
            </div>
          )}

          {outcome?.kind === 'error' && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-body-md text-rose-800">
              <p className="font-semibold">Không thử được mapping</p>
              <p className="mt-0.5 break-words">{outcome.message}</p>
            </div>
          )}

          {outcome?.kind === 'result' && (
            <ul className="flex flex-col gap-2">
              {fieldResults.map(({ meta, result }) => {
                const notConfigured = meta.key === 'timestamp' && values.mapping.timestamp.trim() === ''
                const failed = Boolean(result?.errorCode)
                const hasValue = result?.value != null && !failed
                return (
                  <li key={meta.key} className="rounded-lg bg-surface-container-lowest p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-label-sm text-on-surface-variant">
                          standardField: <span className="text-primary">{meta.key}</span>
                          {meta.key === 'timestamp' && hasValue && ' (ISO 8601 · UTC)'}
                        </p>
                        {notConfigured ? (
                          <p className="mt-0.5 text-body-sm text-on-surface-variant">
                            Không cấu hình mapping cho trường này.
                          </p>
                        ) : failed && result?.errorCode ? (
                          <p className="mt-0.5 text-body-sm text-rose-700">
                            {ERROR_LABEL[result.errorCode]}
                            {result.error ? `: ${result.error}` : ''}
                          </p>
                        ) : hasValue ? (
                          <p className="mt-0.5 font-mono text-label-lg break-all">
                            {meta.key === 'timestamp' ? (
                              <>
                                {formatDateTime(result?.value, true)}{' '}
                                <span className="text-on-surface-variant">GMT+7</span>
                              </>
                            ) : (
                              result?.value
                            )}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-body-sm text-amber-700">{result?.warning ?? 'Không có giá trị.'}</p>
                        )}
                        {hasValue && meta.key === 'timestamp' && (
                          <p className="font-mono text-label-sm text-on-surface-variant">UTC: {result?.value}</p>
                        )}
                      </div>
                      {notConfigured ? (
                        <Badge tone="neutral">Bỏ qua</Badge>
                      ) : hasValue ? (
                        <Badge tone="success">{meta.key === 'timestamp' ? 'Chuẩn hóa OK' : 'Hợp lệ'}</Badge>
                      ) : !failed && result?.warning ? (
                        <Badge tone="warning">Cảnh báo</Badge>
                      ) : (
                        <Badge tone="danger">Lỗi</Badge>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
