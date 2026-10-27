import { Badge, Card, Field, Icon, Input, SectionHeader, Select } from '@/components/ui'
import { MAPPING_FIELDS, TIMESTAMP_FORMAT_OPTIONS, TIMEZONE_OPTIONS } from '../../constants/callback-services.constants'
import type { MappingFieldKey, TimestampFormat } from '../../types/callback-services.types'
import { isValidMappingPath } from '../../utils/mapping-path'
import { isTimestampSettingsLocked } from '../../utils/service-form'
import type { FormSectionProps } from './form-types'

function MappingStatus({ path, required, hasError }: { path: string; required: boolean; hasError: boolean }) {
  if (path.trim() === '')
    return (
      <Badge tone="neutral" mono={false}>
        {required ? 'Chưa map' : 'Không dùng'}
      </Badge>
    )
  if (hasError || !isValidMappingPath(path.trim()))
    return (
      <Badge tone="danger" mono={false}>
        Cú pháp lỗi
      </Badge>
    )
  return (
    <Badge tone="success" mono={false}>
      Đã map
    </Badge>
  )
}

export function MappingSection({ values, errors, onChange }: FormSectionProps) {
  const custom = values.timestampFormat === 'CUSTOM'
  // D3: không có đường dẫn timestamp thì định dạng và múi giờ không có tác dụng nên bị khóa (giữ giá trị).
  const locked = isTimestampSettingsLocked(values)
  const timezoneOptions = TIMEZONE_OPTIONS.some((option) => option.value === values.timezone)
    ? TIMEZONE_OPTIONS
    : [...TIMEZONE_OPTIONS, { value: values.timezone, label: values.timezone, offsetMinutes: 0 }]

  function setPath(key: MappingFieldKey, path: string) {
    onChange({ mapping: { ...values.mapping, [key]: path } })
  }

  return (
    <Card as="section" className="p-5">
      <SectionHeader
        icon="account_tree"
        title="C. Mapping dữ liệu (Standard Field Schema)"
        subtitle="Ánh xạ payload JSON tuỳ biến của ngân hàng sang 3 trường chuẩn của Simulator"
        actions={
          <span className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1 font-mono text-label-sm text-on-surface-variant">
            <Icon name="code" size={14} />
            Cú pháp: $.field, $.object.field
          </span>
        }
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left">
          <thead className="bg-surface-container-low font-mono text-label-sm tracking-wide text-on-surface-variant uppercase">
            <tr>
              <th scope="col" className="w-[28%] px-3 py-2 font-medium">
                Trường chuẩn TPP
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Biểu thức đường dẫn (ngân hàng)
              </th>
              <th scope="col" className="w-40 px-3 py-2 font-medium">
                Kiểu dữ liệu
              </th>
              <th scope="col" className="w-28 px-3 py-2 font-medium">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MAPPING_FIELDS.map((field) => {
              const errorKey = `mapping.${field.key}` as const
              const error = errors[errorKey]
              return (
                <tr key={field.key} className="align-top">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-label-lg font-semibold text-primary">{field.key}</span>
                      <Badge tone={field.required ? 'danger' : 'neutral'} mono={false}>
                        {field.required ? 'Bắt buộc' : 'Tùy chọn'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">{field.description}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Field label={`Đường dẫn ${field.key}`} labelClassName="sr-only" error={error} hint={field.example}>
                      {({ id, describedBy, invalid }) => (
                        <Input
                          id={id}
                          mono
                          value={values.mapping[field.key]}
                          invalid={invalid}
                          aria-describedby={describedBy}
                          placeholder="$.field"
                          autoComplete="off"
                          onChange={(event) => setPath(field.key, event.target.value)}
                        />
                      )}
                    </Field>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone="neutral">{field.dataType}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <MappingStatus
                      path={values.mapping[field.key]}
                      required={field.required}
                      hasError={Boolean(error)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-body-sm text-on-surface-variant">
        <Icon name="info" size={15} className="mt-0.5 text-primary" />
        Chỉ hỗ trợ dạng $.a.b.c: object lồng nhau, tối đa 10 đoạn, mỗi đoạn gồm chữ, số, '_' hoặc '-'. Không dùng
        wildcard (*), đệ quy (..) hay chỉ số mảng ([ ]).
      </p>

      <div className="mt-4 rounded-lg bg-surface-container-low p-4">
        <h3 className="flex items-center gap-2 text-headline-sm">
          <Icon name="schedule" size={18} className="text-primary" />
          Cấu hình chuẩn hóa thời gian (Timestamp Normalization)
        </h3>
        {locked && (
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Chỉ dùng khi có đường dẫn timestamp. Nhập đường dẫn timestamp ở trên để chỉnh định dạng và múi giờ.
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Loại định dạng thời gian" error={errors.timestampFormat}>
            {({ id }) => (
              <Select
                id={id}
                value={values.timestampFormat}
                disabled={locked}
                onChange={(event) => onChange({ timestampFormat: event.target.value as TimestampFormat })}
              >
                {TIMESTAMP_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Mẫu định dạng khi chọn Tùy chỉnh"
            error={errors.timestampPattern}
            hint={custom ? 'Cú pháp DateTimeFormatter của Java, ví dụ yyyy-MM-dd HH:mm:ss' : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                mono
                value={values.timestampPattern}
                disabled={!custom || locked}
                invalid={invalid}
                aria-describedby={describedBy}
                placeholder="yyyy-MM-dd HH:mm:ss"
                onChange={(event) => onChange({ timestampPattern: event.target.value })}
              />
            )}
          </Field>
          <Field
            label="Múi giờ mặc định (Fallback)"
            error={errors.timezone}
            hint="Áp dụng khi dữ liệu thời gian không kèm múi giờ."
          >
            {({ id }) => (
              <Select
                id={id}
                value={values.timezone}
                disabled={locked}
                onChange={(event) => onChange({ timezone: event.target.value })}
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>
    </Card>
  )
}
