import { useState } from 'react'
import { Badge, Card, Field, Icon, Input, SectionHeader } from '@/components/ui'
import type { AuthType } from '../../types/callback-services.types'
import type { FormSectionProps } from './form-types'

const AUTH_OPTIONS: { value: AuthType; label: string }[] = [
  { value: 'NONE', label: 'Không xác thực' },
  { value: 'API_KEY', label: 'API Key Header' },
]

export function AuthSection({ values, errors, onChange }: FormSectionProps) {
  const [revealed, setRevealed] = useState(false)
  const apiKey = values.authType === 'API_KEY'
  const keepExisting = values.apiKeyConfigured

  return (
    <Card as="section" className="p-5">
      <SectionHeader icon="verified_user" title="B. Cơ chế xác thực" subtitle="Bảo vệ webhook receiver đối soát" />

      <fieldset className="mt-4">
        <legend className="sr-only">Kiểu xác thực</legend>
        <div className="flex gap-1 rounded-lg bg-surface-container-low p-1">
          {AUTH_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-body-md has-[:checked]:bg-surface-container-lowest has-[:checked]:font-medium has-[:checked]:shadow-card has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container"
            >
              <input
                type="radio"
                name="authType"
                value={option.value}
                checked={values.authType === option.value}
                onChange={() => onChange({ authType: option.value })}
                className="accent-primary-container"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {apiKey ? (
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Tên header (Request Header Name)" required error={errors.apiKeyHeader}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                mono
                value={values.apiKeyHeader}
                invalid={invalid}
                aria-describedby={describedBy}
                placeholder="X-API-Key"
                autoComplete="off"
                onChange={(event) => onChange({ apiKeyHeader: event.target.value })}
              />
            )}
          </Field>
          <Field
            label="Giá trị khóa (Secret Token)"
            required={!keepExisting}
            error={errors.apiKeySecret}
            hint={
              keepExisting
                ? 'Để trống để giữ khóa hiện tại. Nhập khóa mới để thay khóa cũ.'
                : 'Khóa chỉ ghi: sau khi lưu sẽ không bao giờ hiện lại hay nằm trong lịch sử callback.'
            }
          >
            {({ id, describedBy, invalid }) => (
              <div className="relative">
                <Input
                  id={id}
                  mono
                  type={revealed ? 'text' : 'password'}
                  value={values.apiKeySecret}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder={keepExisting ? 'Đã cấu hình khóa' : undefined}
                  autoComplete="new-password"
                  className="pr-10"
                  onChange={(event) => onChange({ apiKeySecret: event.target.value })}
                />
                <button
                  type="button"
                  aria-label={revealed ? 'Ẩn giá trị khóa' : 'Hiện giá trị khóa'}
                  aria-pressed={revealed}
                  onClick={() => setRevealed((current) => !current)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={revealed ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            )}
          </Field>
          {keepExisting && (
            <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Badge tone="success" mono={false}>
                Đã cấu hình khóa
              </Badge>
              Nút “Hiện” chỉ hiện chuỗi bạn vừa gõ, không hiện khóa đã lưu.
            </p>
          )}
          <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
            <Icon name="info" size={16} className="mt-0.5 text-primary" />
            Request thiếu header hoặc sai khóa bị từ chối với HTTP 401 và vẫn được lưu thành callback bị từ chối (lý do:
            thiếu hoặc sai API key).
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
          <Icon name="lock_open" size={16} className="mt-0.5 text-primary" />
          Endpoint nhận mọi request POST JSON mà không kiểm tra header xác thực.
        </div>
      )}
    </Card>
  )
}
