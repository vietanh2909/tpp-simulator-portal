import { useParams } from 'react-router-dom'
import { ErrorPanel, NotFoundView, PageContainer, SectionLoader } from '@/components/common'
import { ServiceFormView, useService } from '@/features/callback-services'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ApiError } from '@/services/http/error-handler'

export default function ServiceEditPage() {
  const { code = '' } = useParams()
  usePageTitle(`Sửa dịch vụ ${code}`)
  const { data, error, reload } = useService(code)

  if (data) return <ServiceFormView key={`${data.code}`} service={data} />
  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundView title="Không tìm thấy dịch vụ" description={`Dịch vụ "${code}" không tồn tại.`} />
  }
  return (
    <PageContainer>
      {error ? (
        <ErrorPanel message={error.message} onRetry={reload} />
      ) : (
        <SectionLoader label="Đang tải cấu hình dịch vụ..." />
      )}
    </PageContainer>
  )
}
