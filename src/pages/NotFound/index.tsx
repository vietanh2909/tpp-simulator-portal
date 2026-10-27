import { NotFoundView } from '@/components/common'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Không tìm thấy trang')
  return <NotFoundView />
}
