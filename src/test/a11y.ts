import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * Chạy axe-core trên một vùng DOM và khẳng định không có vi phạm.
 * `color-contrast` bị tắt vì jsdom không có bố cục và bảng màu; độ tương phản được kiểm theo
 * `design-system-mapping.md` và kiểm tay (ghi trong code-summary.md).
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} -> ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
  )
  expect(summary).toEqual([])
}
