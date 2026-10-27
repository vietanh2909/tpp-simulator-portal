import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useId, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '@/test/a11y'
import { TabPanel, Tabs } from './Tabs'

type View = 'one' | 'two' | 'three'

const ITEMS: { value: View; label: string }[] = [
  { value: 'one', label: 'Tab một' },
  { value: 'two', label: 'Tab hai' },
  { value: 'three', label: 'Tab ba' },
]

function Harness({ withIds = true }: { withIds?: boolean }) {
  const idBase = useId()
  const [value, setValue] = useState<View>('one')
  return (
    <>
      <Tabs<View>
        ariaLabel="Chế độ xem"
        items={ITEMS}
        value={value}
        onChange={setValue}
        idBase={withIds ? idBase : undefined}
      />
      {withIds && (
        <TabPanel idBase={idBase} value={value}>
          Nội dung của {value}
        </TabPanel>
      )}
    </>
  )
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('Tabs (mẫu ARIA tabs)', () => {
  it('roving tabindex: chỉ tab đang chọn nằm trong thứ tự Tab, các tab còn lại tabindex=-1', () => {
    render(<Harness />)

    expect(tab('Tab một')).toHaveAttribute('tabindex', '0')
    expect(tab('Tab hai')).toHaveAttribute('tabindex', '-1')
    expect(tab('Tab ba')).toHaveAttribute('tabindex', '-1')
    expect(tab('Tab một')).toHaveAttribute('aria-selected', 'true')
  })

  it('Tab từ ngoài vào danh sách tab dừng ở tab đang chọn rồi đi thẳng sang vùng nội dung/ngoài, không dừng ở từng tab', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Trước</button>
        <Harness />
        <button type="button">Sau</button>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Trước' }))
    await user.tab()
    expect(tab('Tab một')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sau' })).toHaveFocus()
  })

  it('mũi tên phải/trái chuyển tab, chuyển tiêu điểm theo và xoay vòng ở hai đầu', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    tab('Tab một').focus()

    await user.keyboard('{ArrowRight}')
    expect(tab('Tab hai')).toHaveFocus()
    expect(tab('Tab hai')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Tab hai')).toHaveAttribute('tabindex', '0')
    expect(tab('Tab một')).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(tab('Tab một')).toHaveFocus()
    expect(tab('Tab một')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(tab('Tab ba')).toHaveFocus()
    expect(tab('Tab ba')).toHaveAttribute('aria-selected', 'true')
  })

  it('Home về tab đầu, End về tab cuối', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    tab('Tab một').focus()

    await user.keyboard('{End}')
    expect(tab('Tab ba')).toHaveFocus()
    expect(tab('Tab ba')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(tab('Tab một')).toHaveFocus()
    expect(tab('Tab một')).toHaveAttribute('aria-selected', 'true')
  })

  it('phím khác không đổi tab; bấm chuột vẫn chọn tab', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    tab('Tab một').focus()

    await user.keyboard('{ArrowDown}a')
    expect(tab('Tab một')).toHaveAttribute('aria-selected', 'true')

    await user.click(tab('Tab ba'))
    expect(tab('Tab ba')).toHaveAttribute('aria-selected', 'true')
  })

  it('aria-controls của tab trỏ tới vùng tabpanel có aria-labelledby trỏ ngược về tab', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const selected = tab('Tab một')
    const panel = screen.getByRole('tabpanel')
    expect(selected.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(selected.id)
    expect(panel).toHaveAccessibleName('Tab một')
    expect(panel).toHaveTextContent('Nội dung của one')

    await user.click(tab('Tab hai'))
    const next = screen.getByRole('tabpanel')
    expect(tab('Tab hai').getAttribute('aria-controls')).toBe(next.id)
    expect(next).toHaveAccessibleName('Tab hai')
    expect(next).toHaveTextContent('Nội dung của two')
  })

  it('không truyền idBase thì tab không có aria-controls (không trỏ tới id không tồn tại)', () => {
    render(<Harness withIds={false} />)

    expect(tab('Tab một')).not.toHaveAttribute('aria-controls')
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
  })

  it('không có vi phạm truy cập (axe)', async () => {
    const { container } = render(<Harness />)

    await expectNoA11yViolations(container)
  })
})
