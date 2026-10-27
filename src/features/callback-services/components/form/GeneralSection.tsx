import { CopyButton } from '@/components/common'
import { Card, Field, Icon, Input, SectionHeader, Switch, Textarea } from '@/components/ui'
import { buildCallbackUrl } from '../../utils/callback-url'
import type { FormSectionProps } from './form-types'

export function GeneralSection({ values, errors, onChange, isNew }: FormSectionProps) {
  const url = buildCallbackUrl(values.code.trim() || '{serviceCode}')

  return (
    <Card as="section" className="p-5">
      <SectionHeader
        icon="tune"
        title="A. Thông tin chung"
        subtitle="Định danh dịch vụ webhook và endpoint nhận tín hiệu"
        actions={
          <span className="flex items-center gap-2 font-mono text-label-md">
            {values.enabled ? 'Đang bật' : 'Đã tắt'}
            <Switch checked={values.enabled} onChange={(enabled) => onChange({ enabled })} label="Bật/tắt dịch vụ" />
          </span>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Mã dịch vụ (Service Slug)"
          required={isNew}
          error={errors.code}
          hint={
            isNew
              ? "Duy nhất, 1–50 ký tự: chữ, số, '-' và '_' (không phân biệt hoa thường). Không sửa được sau khi tạo."
              : 'Mã định danh cố định, không thể sửa sau khi tạo.'
          }
        >
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                mono
                value={values.code}
                disabled={!isNew}
                invalid={invalid}
                aria-describedby={describedBy}
                placeholder="ví dụ: THU_HO"
                autoComplete="off"
                onChange={(event) => onChange({ code: event.target.value })}
                className={isNew ? undefined : 'pr-9'}
              />
              {!isNew && (
                <Icon
                  name="lock"
                  size={16}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-on-surface-variant"
                />
              )}
            </div>
          )}
        </Field>

        <Field
          label="Tên dịch vụ hiển thị"
          required
          error={errors.name}
          hint="Hiển thị trong danh sách, theo dõi và báo cáo đối soát."
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={values.name}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(event) => onChange({ name: event.target.value })}
            />
          )}
        </Field>

        <Field label="Mô tả" optionalLabel="Không bắt buộc" className="md:col-span-2">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              value={values.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="mt-4 rounded-lg bg-surface-container-low p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="font-mono text-label-sm tracking-wide text-on-surface-variant uppercase">
            URL callback nhận tín hiệu (endpoint)
          </p>
          <span className="flex items-center gap-2 font-mono text-label-sm">
            <span className="rounded-md bg-primary px-1.5 py-0.5 font-semibold text-on-primary">POST</span>
            <span className="text-on-surface-variant">application/json</span>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-1.5">
          <span className="min-w-0 flex-1 truncate font-mono text-code-body" title={url}>
            {url}
          </span>
          <CopyButton text={url} label="Sao chép URL" />
        </div>
        <p className="mt-1.5 text-body-sm text-on-surface-variant">
          URL được sinh tự động từ mã dịch vụ. Cấu hình URL này phía ngân hàng.
        </p>
      </div>
    </Card>
  )
}
