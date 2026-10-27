import { ServiceFormView } from '@/features/callback-services'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function ServiceCreatePage() {
  usePageTitle('Tạo dịch vụ')
  return <ServiceFormView />
}
