import { Link, useParams } from 'react-router-dom'
import { ErrorPanel, NotFoundView, PageContainer, PageHeading, SectionLoader } from '@/components/common'
import { Badge, Icon } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { useService } from '@/features/callback-services'
import { SelfTestPanel } from '@/features/callbacks'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ApiError } from '@/services/http/error-handler'

export default function ServiceTestPage() {
  const { code = '' } = useParams()
  usePageTitle(`Gửi callback thử · ${code}`)
  const { data: service, error, reload } = useService(code)

  if (!service) {
    if (error instanceof ApiError && error.status === 404) {
      return <NotFoundView title="Không tìm thấy dịch vụ" description={`Dịch vụ "${code}" không tồn tại.`} />
    }
    return (
      <PageContainer>
        {error ? (
          <ErrorPanel message={error.message} onRetry={reload} />
        ) : (
          <SectionLoader label="Đang tải dịch vụ..." />
        )}
      </PageContainer>
    )
  }

  return (
    <PageContainer className="gap-4">
      <PageHeading
        eyebrow={
          <Link
            to={ROUTES.serviceEdit(service.code)}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Icon name="arrow_back" size={15} />
            Quay lại cấu hình dịch vụ
          </Link>
        }
        title={
          <>
            Gửi callback thử nghiệm
            <Badge tone="primary">
              {service.code} ({service.name})
            </Badge>
          </>
        }
        description={`Cấu hình đã lưu: phiên bản v${service.version}`}
      />

      <div
        role="note"
        className="flex gap-3 rounded-xl border border-amber-200 bg-tertiary-fixed/60 p-4 text-body-md text-tertiary"
      >
        <Icon name="science" size={22} filled className="shrink-0 text-tertiary-container" />
        <div>
          <p className="text-headline-sm text-on-tertiary-fixed">Callback được gửi tới endpoint thật của dịch vụ</p>
          <p className="mt-0.5">
            Callback được lưu như mọi callback khác của dịch vụ và xuất hiện trong Theo dõi giao dịch. Chỉ dùng cấu hình
            đã lưu gần nhất.
          </p>
          {!service.enabled && (
            <p className="mt-1 font-semibold">
              Dịch vụ đang tắt: request sẽ nhận HTTP 503 và được lưu thành callback bị từ chối (dịch vụ đang tắt).
            </p>
          )}
        </div>
      </div>

      <SelfTestPanel key={`${service.code}-v${service.version}`} service={service} />
    </PageContainer>
  )
}
