import type { ReactNode } from 'react'
import { NarrowWindowBanner } from './NarrowWindowBanner'
import { SimulatorFooter } from './SimulatorFooter'
import { SimulatorHeader } from './SimulatorHeader'
import { SimulatorSidebar } from './SimulatorSidebar'

export function SimulatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-lg bg-primary px-3 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Bỏ qua điều hướng
      </a>
      <SimulatorSidebar />
      <div className="pl-60">
        <SimulatorHeader />
        <main id="main-content" className="flex min-h-screen flex-col pt-14">
          <NarrowWindowBanner />
          <div className="flex-1">{children}</div>
          <SimulatorFooter />
        </main>
      </div>
    </div>
  )
}
