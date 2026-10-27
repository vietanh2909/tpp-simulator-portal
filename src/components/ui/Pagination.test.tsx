import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

function setup(props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn()
  const onPageSizeChange = vi.fn()
  render(
    <Pagination
      page={1}
      pageSize={20}
      total={128}
      unit="giao dịch"
      onPageChange={onPageChange}
      pageSizeOptions={[20, 50, 100]}
      onPageSizeChange={onPageSizeChange}
      {...props}
    />,
  )
  return { onPageChange, onPageSizeChange }
}

describe('Pagination', () => {
  it('hiện "Hiển thị 1 - 20 trong 128" và cuối danh sách hiện đúng số dòng của trang cuối', () => {
    setup()
    expect(screen.getByText('Hiển thị', { exact: false })).toHaveTextContent('Hiển thị 1 - 20 trong 128 giao dịch')
  })

  it('nút trang có tên "Trang N trên M", trang hiện tại có aria-current, nút Trước bị khóa ở trang 1', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Trang 1 trên 7' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled()
  })

  it('bấm số trang hoặc Trang sau gọi onPageChange với đúng trang', async () => {
    const user = userEvent.setup()
    const { onPageChange } = setup({ page: 3 })

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await user.click(screen.getByRole('button', { name: 'Trang 7 trên 7' }))

    expect(onPageChange.mock.calls).toEqual([[4], [7]])
  })

  it('ô "Dòng mỗi trang" chỉ có 20, 50, 100 và báo cỡ trang mới', async () => {
    const user = userEvent.setup()
    const { onPageSizeChange } = setup()
    const select = screen.getByLabelText('Dòng mỗi trang')

    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['20', '50', '100'])
    await user.selectOptions(select, '100')

    expect(onPageSizeChange).toHaveBeenCalledWith(100)
  })

  it('không có pageSizeOptions thì không hiện ô chọn cỡ trang (tương thích nơi dùng khác)', () => {
    setup({ pageSizeOptions: undefined, onPageSizeChange: undefined })
    expect(screen.queryByLabelText('Dòng mỗi trang')).not.toBeInTheDocument()
  })

  it('rút gọn bằng dấu … khi có nhiều trang', () => {
    setup({ page: 10, total: 400 })
    expect(screen.getAllByText('…').length).toBeGreaterThan(0)
  })
})
