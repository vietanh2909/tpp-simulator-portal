import { Badge, Card, Field, Icon, Input, JsonEditor, SectionHeader } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { FormSectionProps } from './form-types'

export function ResponseSection({ values, errors, onChange }: FormSectionProps) {
  const status = Number(values.responseStatus)
  const statusOk = /^\d{3}$/.test(values.responseStatus.trim()) && status >= 200 && status < 300

  return (
    <Card as="section" className="p-5">
      <SectionHeader
        icon="reply"
        title="E. Phản hồi trả về ngân hàng (Receiver Sync Response)"
        subtitle="Quy định HTTP status code và body trả về đồng bộ ngay khi nhận callback"
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Field
            label="Mã phản hồi HTTP Status"
            required
            error={errors.responseStatus}
            hint="Từ 200 đến 599, trừ 204, 205 và 304. Khuyên dùng HTTP 200 để báo hiệu đã nhận gói tin thành công cho phía Core."
          >
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center gap-2">
                <Input
                  id={id}
                  mono
                  inputMode="numeric"
                  maxLength={3}
                  value={values.responseStatus}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  className="w-24"
                  onChange={(event) => onChange({ responseStatus: event.target.value })}
                />
                {!invalid && (
                  <Badge tone={statusOk ? 'success' : 'warning'}>{statusOk ? `${status} OK` : String(status)}</Badge>
                )}
              </div>
            )}
          </Field>

          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-body-sm text-amber-900">
            <p className="flex items-center gap-1 font-mono text-label-md font-semibold">
              <Icon name="lightbulb" size={16} className="text-amber-600" />
              Ghi chú kỹ thuật đối soát:
            </p>
            <p className="mt-1">
              Response này xác nhận simulator đã tiếp nhận callback, khác với status nghiệp vụ nằm trong payload. Core
              Banking chỉ cần mã này để xác nhận hoàn tất việc truyền tin.
            </p>
          </div>
        </div>

        <Field label="Định dạng nội dung Response Body (JSON)" required error={errors.responseBody}>
          {({ id, describedBy, invalid }) => (
            <JsonEditor
              id={id}
              minLines={7}
              value={values.responseBody}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(responseBody) => onChange({ responseBody })}
              className={cn(invalid && 'border-error')}
            />
          )}
        </Field>
      </div>
    </Card>
  )
}
