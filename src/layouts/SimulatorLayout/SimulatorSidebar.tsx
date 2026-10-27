import { NavLink, useLocation } from 'react-router-dom'
import { appConfig } from '@/app/config'
import { Icon } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import type { NavItem } from '@/types/navigation'
import { cn } from '@/utils/cn'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dịch vụ', to: ROUTES.services, icon: 'webhook', matchPrefixes: ['/services'] },
  {
    label: 'Theo dõi giao dịch',
    to: ROUTES.monitoring,
    icon: 'receipt_long',
    matchPrefixes: ['/transactions', '/callbacks'],
  },
]

export function SimulatorSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="fixed top-0 left-0 z-50 flex h-full w-60 flex-col justify-between bg-surface-container-lowest shadow-card">
      <div className="flex flex-col">
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <span className="text-headline-sm tracking-tight text-on-surface">{appConfig.appName}</span>
            <span className="rounded-lg bg-tertiary-container px-1.5 py-0.5 font-mono text-label-sm tracking-wide text-on-tertiary uppercase">
              {appConfig.environmentLabel}
            </span>
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">Môi trường kiểm thử</p>
          <div className="mt-3 flex items-start gap-1 rounded-lg bg-surface-container-low p-1.5">
            <Icon name="schedule" size={16} className="mt-0.5 text-secondary" />
            <span className="font-mono text-label-sm text-on-surface-variant">
              Múi giờ: {appConfig.displayTimezoneLabel} ({appConfig.displayTimezone})
            </span>
          </div>
        </div>

        <nav aria-label="Điều hướng chính" className="mt-1 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-1.5 text-body-md transition-colors',
                  active
                    ? 'bg-primary font-medium text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                )}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="m-3 rounded-lg bg-surface-container-low p-3">
        <div className="flex items-start gap-1">
          <Icon name="terminal" size={15} className="mt-0.5 text-primary" />
          <div className="flex flex-col">
            <span className="font-mono text-label-sm font-semibold text-on-surface">
              Simulator v{appConfig.version}
            </span>
            <span className="text-body-sm text-on-surface-variant">Nhận HTTP Callback</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
