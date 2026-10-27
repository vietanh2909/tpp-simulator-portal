import type { ServiceFormErrors, ServiceFormValues } from '../../types/callback-services.types'

export interface FormSectionProps {
  values: ServiceFormValues
  errors: ServiceFormErrors
  onChange: (patch: Partial<ServiceFormValues>) => void
  isNew: boolean
}
