import { Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/common'
import { SimulatorLayout } from '@/layouts'
import { ScrollToTop } from './ScrollToTop'

export function RootShell() {
  return (
    <>
      <PageLoader />
      <ScrollToTop />
      <SimulatorLayout>
        <Outlet />
      </SimulatorLayout>
    </>
  )
}
