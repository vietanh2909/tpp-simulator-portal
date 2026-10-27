import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { SectionLoader } from '@/components/common'
import { ROUTES } from '@/constants/routes'
import { RootShell } from './RootShell'
import { RouteErrorView } from './RouteErrorView'

/** Tải trang theo nhu cầu (code splitting) từ module có `default export`. */
function page(load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, 'lazy'> {
  return { lazy: async () => ({ Component: (await load()).default }) }
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootShell />,
    hydrateFallbackElement: <SectionLoader label="Đang khởi động..." />,
    children: [
      {
        // Lỗi của trang con hiển thị trong khung layout, không làm mất sidebar/header.
        errorElement: <RouteErrorView />,
        children: [
          { index: true, element: <Navigate to={ROUTES.services} replace /> },
          { path: 'services', ...page(() => import('@/pages/Services')) },
          { path: 'services/new', ...page(() => import('@/pages/ServiceCreate')) },
          { path: 'services/:code/edit', ...page(() => import('@/pages/ServiceEdit')) },
          { path: 'services/:code/test', ...page(() => import('@/pages/ServiceTest')) },
          { path: 'transactions', ...page(() => import('@/pages/Monitoring')) },
          { path: 'transactions/:serviceCode/:transactionId', ...page(() => import('@/pages/TransactionDetail')) },
          { path: 'callbacks/:callbackId', ...page(() => import('@/pages/TransactionDetail')) },
          { path: '*', ...page(() => import('@/pages/NotFound')) },
        ],
      },
    ],
  },
]
