import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/test/a11y'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ onConfirm = vi.fn(), busy = false }: { onConfirm?: () => void; busy?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Mở hộp thoại
      </button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Xóa dịch vụ THU_HO?"
        description="Không hoàn tác được."
        confirmLabel="Xóa dịch vụ"
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
      />
    </>
  )
}

describe('ConfirmDialog', () => {
  it('có vai trò alertdialog, nhãn và mô tả; tiêu điểm đầu tiên ở nút Hủy', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Xóa dịch vụ THU_HO?' })
    expect(dialog).toHaveAccessibleDescription('Không hoàn tác được.')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Hủy' })).toHaveFocus()
  })

  it('Esc đóng hộp thoại và trả tiêu điểm về nút đã mở', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Mở hộp thoại' })

    await user.click(opener)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('bẫy tiêu điểm: Tab và Shift+Tab xoay vòng trong hộp thoại', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }))

    const cancel = screen.getByRole('button', { name: 'Hủy' })
    const confirm = screen.getByRole('button', { name: 'Xóa dịch vụ' })

    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  it('xác nhận gọi onConfirm; bấm lớp phủ thì hủy', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const { container } = render(<Harness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }))
    await user.click(screen.getByRole('button', { name: 'Xóa dịch vụ' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mở hộp thoại' }))
    const backdrop = document.body.querySelector('[aria-hidden="true"].absolute')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(container).toBeInTheDocument()
  })

  it('đang xử lý (busy) thì Esc không đóng và nút bị khóa', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        open
        title="Đang xóa"
        description="Chờ chút"
        confirmLabel="Xóa"
        busy
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    await user.keyboard('{Escape}')

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()
  })

  it('không có vi phạm truy cập (axe)', async () => {
    render(
      <ConfirmDialog open title="Xóa?" description="Mô tả" confirmLabel="Xóa" onCancel={vi.fn()} onConfirm={vi.fn()} />,
    )

    await expectNoA11yViolations(document.body)
  })
})
