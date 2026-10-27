import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageContainer, PageHeading } from '@/components/common'
import { Badge, Button, Card, Icon, useToast } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { toErrorMessage } from '@/services/http/error-handler'
import { callbackServicesApi } from '../api/callback-services.api'
import type {
  CallbackService,
  ServiceFormErrorKey,
  ServiceFormErrors,
  ServiceFormValues,
} from '../types/callback-services.types'
import { toFormValues } from '../utils/service-dto'
import { applyApiError, EMPTY_FORM_VALUES, FORM_FIELD_ORDER, validateServiceForm } from '../utils/service-form'
import { AuthSection } from './form/AuthSection'
import { GeneralSection } from './form/GeneralSection'
import { MappingSection } from './form/MappingSection'
import { MappingTester } from './form/MappingTester'
import { ResponseSection } from './form/ResponseSection'

interface ServiceFormViewProps {
  /** Dịch vụ đang sửa; bỏ trống khi tạo mới. */
  service?: CallbackService
}

export function ServiceFormView({ service }: ServiceFormViewProps) {
  const isNew = service === undefined
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useRef<HTMLDivElement>(null)

  const [baseline, setBaseline] = useState<ServiceFormValues>(() =>
    service ? toFormValues(service) : EMPTY_FORM_VALUES,
  )
  const [values, setValues] = useState<ServiceFormValues>(baseline)
  const [errors, setErrors] = useState<ServiceFormErrors>({})
  const [unmatchedErrors, setUnmatchedErrors] = useState<string[]>([])
  const [focusTick, setFocusTick] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showSaveFirst, setShowSaveFirst] = useState(false)

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline])
  const errorMessages = FORM_FIELD_ORDER.flatMap((key) => (errors[key] ? [errors[key]] : []))

  useEffect(() => {
    if (!dirty) return undefined
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Chuyển tiêu điểm tới ô lỗi đầu tiên sau mỗi lần lưu bị từ chối.
  useEffect(() => {
    if (focusTick === 0) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusTick])

  function handleChange(patch: Partial<ServiceFormValues>) {
    setValues((current) => ({ ...current, ...patch }))
    setShowSaveFirst(false)
    const touched = Object.keys(patch)
    if (touched.length > 0) {
      setErrors((current) => {
        const next = { ...current }
        for (const key of touched) {
          delete next[key as ServiceFormErrorKey]
          if (key === 'mapping') {
            delete next['mapping.transactionId']
            delete next['mapping.status']
            delete next['mapping.timestamp']
          }
        }
        return next
      })
    }
  }

  function rejectSave(found: ServiceFormErrors, unmatched: string[] = []) {
    setErrors(found)
    setUnmatchedErrors(unmatched)
    setFocusTick((tick) => tick + 1)
  }

  async function handleSave() {
    const found = validateServiceForm(values, { isNew })
    if (Object.keys(found).length > 0) {
      rejectSave(found)
      toast.show('Vui lòng sửa các trường chưa hợp lệ trước khi lưu.', 'error')
      return
    }
    setErrors({})
    setUnmatchedErrors([])

    setSaving(true)
    try {
      if (isNew) {
        await callbackServicesApi.create(values)
        toast.show(`Đã tạo dịch vụ "${values.code.trim()}".`)
      } else {
        const updated = await callbackServicesApi.update(service.code, values)
        toast.show(`Đã lưu cấu hình (phiên bản v${updated.version}).`)
      }
      // Đã lưu: bỏ cờ "chưa lưu" trước khi rời trang để không bật cảnh báo beforeunload.
      setBaseline(values)
      navigate(ROUTES.services)
    } catch (error) {
      const { errors: fieldErrors, unmatched } = applyApiError(error)
      if (Object.keys(fieldErrors).length > 0 || unmatched.length > 0) {
        rejectSave(fieldErrors, unmatched)
        toast.show('Không lưu được cấu hình. Kiểm tra các ô báo lỗi.', 'error')
      } else {
        toast.show(`Không lưu được cấu hình. ${toErrorMessage(error)}`, 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleSendTest() {
    if (!service) return
    if (dirty) {
      setShowSaveFirst(true)
      return
    }
    navigate(ROUTES.serviceTest(service.code))
  }

  function handleReset() {
    setValues(baseline)
    setErrors({})
    setUnmatchedErrors([])
    setShowSaveFirst(false)
  }

  const sectionProps = { values, errors, onChange: handleChange, isNew }

  return (
    <PageContainer className="gap-5">
      <PageHeading
        eyebrow={
          <span className="flex items-center gap-1">
            <Link to={ROUTES.services} className="text-primary hover:underline">
              Dịch vụ callback
            </Link>
            <span>/</span>
            <span>{isNew ? 'Tạo dịch vụ mới' : 'Chỉnh sửa dịch vụ:'}</span>
            {!isNew && <Badge tone="primary">{service.code}</Badge>}
          </span>
        }
        title={
          <>
            {isNew ? 'Tạo dịch vụ & Mapping' : 'Cấu hình Dịch vụ & Mapping'}
            {!isNew && <Badge tone="info">v{service.version}</Badge>}
          </>
        }
        actions={
          <>
            {!isNew && (
              <Button variant="tonal" icon="send" onClick={handleSendTest}>
                Gửi callback thử
              </Button>
            )}
            <Button variant="primary" icon="save" loading={saving} onClick={() => void handleSave()}>
              Lưu cấu hình
            </Button>
          </>
        }
      />

      {(errorMessages.length > 0 || unmatchedErrors.length > 0) && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-body-md text-rose-900">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="error" size={18} className="text-rose-600" />
            Chưa lưu được: có {errorMessages.length + unmatchedErrors.length} lỗi cần sửa.
          </p>
          <ul className="mt-1 list-disc pl-9">
            {[...errorMessages, ...unmatchedErrors].map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {showSaveFirst && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-md text-amber-900"
        >
          <span className="flex items-center gap-2">
            <Icon name="warning" size={18} className="text-amber-600" />
            Cấu hình đang sửa chưa được lưu. Hãy lưu trước khi gửi callback thử để kết quả phản ánh đúng cấu hình.
          </span>
          <Button size="sm" variant="primary" loading={saving} onClick={() => void handleSave()}>
            Lưu ngay
          </Button>
        </div>
      )}

      <div ref={formRef} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <GeneralSection {...sectionProps} />
          <AuthSection {...sectionProps} />
        </div>
        <MappingSection {...sectionProps} />
        <MappingTester values={values} />
        <ResponseSection {...sectionProps} />
      </div>

      <Card className="sticky bottom-3 z-10 flex items-center justify-between gap-3 px-4 py-3 shadow-overlay">
        <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Icon
            name={dirty ? 'edit_note' : 'check_circle'}
            size={18}
            className={dirty ? 'text-amber-600' : 'text-emerald-600'}
          />
          {dirty
            ? 'Có thay đổi chưa lưu.'
            : isNew
              ? 'Điền thông tin và lưu để tạo dịch vụ.'
              : `Cấu hình v${service.version} đã được lưu. Thay đổi cấu hình không ảnh hưởng lịch sử callback cũ.`}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={!dirty || saving} onClick={handleReset}>
            Hủy thay đổi
          </Button>
          <Button variant="primary" icon="check" loading={saving} onClick={() => void handleSave()}>
            Lưu cấu hình
          </Button>
        </div>
      </Card>
    </PageContainer>
  )
}
