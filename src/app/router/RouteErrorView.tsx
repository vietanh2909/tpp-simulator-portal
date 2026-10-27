import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ErrorPanel, NotFoundView, PageContainer } from '@/components/common'

export function RouteErrorView() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundView />
  const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn khi hiển thị trang.'
  return (
    <PageContainer>
      <ErrorPanel title="Không hiển thị được trang" message={message} onRetry={() => window.location.reload()} />
    </PageContainer>
  )
}
