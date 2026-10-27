import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { ROUTES } from '@/constants/routes'

interface NotFoundViewProps {
  title?: string
  description?: string
}

export function NotFoundView({
  title = 'Không tìm thấy trang',
  description = 'Đường dẫn không tồn tại hoặc dữ liệu đã bị thay đổi.',
}: NotFoundViewProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name="search_off" size={24} />
      </span>
      <h1 className="text-headline-md text-on-surface">{title}</h1>
      <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>
      <Link
        to={ROUTES.services}
        className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary-container px-4 text-body-md font-semibold text-on-primary hover:bg-primary"
      >
        Về danh sách dịch vụ
      </Link>
    </div>
  )
}
