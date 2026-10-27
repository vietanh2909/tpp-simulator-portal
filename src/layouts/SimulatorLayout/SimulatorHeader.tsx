import { appConfig } from '@/app/config'
import { Icon } from '@/components/ui'
import { DISPLAY_TZ_LABEL } from '@/utils/format'

export function SimulatorHeader() {
  return (
    <header className="fixed top-0 right-0 left-60 z-40 flex h-14 items-center justify-between bg-surface/80 px-4 shadow-card backdrop-blur-xl xl:px-6">
      <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
        <Icon name="domain" size={16} />
        <span>Ngân hàng Sandbox</span>
        <Icon name="chevron_right" size={14} />
        <span className="font-medium text-on-surface">TPP Webhook Engine</span>
      </div>
      <div className="flex items-center gap-4">
        {/* D1: chỉ nhãn môi trường và múi giờ cố định, không có đồng hồ chạy từng giây. */}
        <div className="flex items-center gap-1 rounded-lg bg-surface-container-lowest px-2 py-1 font-mono text-label-sm text-on-surface-variant">
          <Icon name="public" size={15} />
          <span>
            {appConfig.environmentLabel} {DISPLAY_TZ_LABEL}
          </span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary" aria-hidden="true">
          <Icon name="person" size={18} className="text-on-primary" />
        </div>
      </div>
    </header>
  )
}
