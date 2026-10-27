import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CHI_HO_DTO, TEST_KEY, THU_HO_DTO } from '@/test/fixtures/services'
import { errorResponse, jsonResponse, routeFetch } from '@/test/http'
import { renderPage } from '@/test/render'
import { toCallbackService } from '../utils/service-dto'
import { ServiceFormView } from './ServiceFormView'

function renderCreate() {
  const api = routeFetch({ 'POST /api/services': () => jsonResponse(201, THU_HO_DTO) })
  renderPage(<ServiceFormView />, { path: '/services/new' })
  return api
}

function renderEdit(dto = CHI_HO_DTO) {
  const api = routeFetch({ [`PUT /api/services/${dto.serviceCode}`]: () => jsonResponse(200, dto) })
  renderPage(<ServiceFormView service={toCallbackService(dto)} />, { path: `/services/${dto.serviceCode}/edit` })
  return api
}

const saveButton = () => screen.getAllByRole('button', { name: 'Lưu cấu hình' })[0] as HTMLElement
const codeInput = () => screen.getByLabelText(/Mã dịch vụ \(Service Slug\)/)
const nameInput = () => screen.getByLabelText(/Tên dịch vụ hiển thị/)

describe('Form tạo dịch vụ', () => {
  it('mở với mặc định: bật, không xác thực, ISO 8601, Asia/Ho_Chi_Minh, response 200 với body {}', () => {
    renderCreate()

    expect(screen.getByRole('switch', { name: 'Bật/tắt dịch vụ' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Không xác thực' })).toBeChecked()
    expect(screen.getByLabelText('Loại định dạng thời gian')).toHaveValue('ISO_8601')
    expect(screen.getByLabelText(/Múi giờ mặc định/)).toHaveValue('Asia/Ho_Chi_Minh')
    expect(screen.getByLabelText(/Mã phản hồi HTTP Status/)).toHaveValue('200')
    expect(screen.getByLabelText(/Định dạng nội dung Response Body/)).toHaveValue('{}')
  })

  it('lưu thành công: POST /api/services với mã chữ hoa, body response là giá trị JSON, rồi về danh sách', async () => {
    const user = userEvent.setup()
    const { calls } = renderCreate()

    await user.type(codeInput(), 'THU_HO')
    await user.type(nameInput(), 'Thu hộ')
    await user.click(saveButton())

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/services'))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/services' })
    const body = JSON.parse(calls[0]?.body ?? '{}')
    expect(body).toMatchObject({
      serviceCode: 'THU_HO',
      name: 'Thu hộ',
      enabled: true,
      authType: 'NONE',
      timestampFormat: 'ISO_8601',
      responseHttpStatus: 200,
      responseBody: {},
    })
    expect('apiKeySecret' in body).toBe(false)
  })

  it('lưu khi còn lỗi: hiện lỗi chữ cạnh từng ô, chuyển tiêu điểm tới ô lỗi đầu tiên và không gọi API', async () => {
    const user = userEvent.setup()
    const { calls } = renderCreate()

    fireEvent.change(screen.getByLabelText(/Mã phản hồi HTTP Status/), { target: { value: '199' } })
    fireEvent.change(screen.getByLabelText(/Định dạng nội dung Response Body/), { target: { value: '{ok:true}' } })
    await user.clear(screen.getByLabelText('Đường dẫn transactionId'))
    await user.click(saveButton())

    expect(await screen.findByText('Nhập mã dịch vụ.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Nhập tên dịch vụ.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Nhập đường dẫn.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('HTTP status phải từ 200 đến 599.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Body phải là JSON hợp lệ.', { selector: 'p' })).toBeInTheDocument()
    expect(codeInput()).toHaveFocus()
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toHaveLength(0)
  })

  it('đường dẫn sai cú pháp bị từ chối với thông báo chỉ hỗ trợ dạng $.a.b.c', async () => {
    const user = userEvent.setup()
    const { calls } = renderCreate()

    await user.type(codeInput(), 'X')
    await user.type(nameInput(), 'X')
    fireEvent.change(screen.getByLabelText('Đường dẫn status'), { target: { value: '$.items[0].id' } })
    await user.click(saveButton())

    expect(await screen.findByText(/Đường dẫn phải có dạng \$\.a\.b\.c/, { selector: 'p' })).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('409 trùng mã: lỗi gắn vào ô mã và ở lại trang', async () => {
    const user = userEvent.setup()
    routeFetch({ 'POST /api/services': () => errorResponse(409, 'SERVICE_CODE_DUPLICATE', 'Mã đã tồn tại.') })
    renderPage(<ServiceFormView />, { path: '/services/new' })

    await user.type(codeInput(), 'thu_ho')
    await user.type(nameInput(), 'Thu hộ')
    await user.click(saveButton())

    expect(
      await screen.findByText('Mã dịch vụ đã tồn tại (kể cả dịch vụ đã xóa).', { selector: 'p' }),
    ).toBeInTheDocument()
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  })

  it('fieldErrors của backend được gắn về đúng từng ô', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/services': () =>
        errorResponse(400, 'VALIDATION_FAILED', 'Sai.', [
          { field: 'timestampPattern', message: 'Mẫu sai theo server.' },
          { field: 'statusPath', message: 'Đường dẫn status sai theo server.' },
        ]),
    })
    renderPage(<ServiceFormView />, { path: '/services/new' })

    await user.type(codeInput(), 'X')
    await user.type(nameInput(), 'X')
    await user.click(saveButton())

    expect(await screen.findByText('Đường dẫn status sai theo server.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByLabelText('Đường dẫn status')).toHaveAttribute('aria-invalid', 'true')
  })

  it('khóa định dạng và múi giờ khi đường dẫn timestamp để trống (D3)', async () => {
    const user = userEvent.setup()
    renderCreate()
    expect(screen.getByLabelText('Loại định dạng thời gian')).toBeEnabled()

    await user.clear(screen.getByLabelText('Đường dẫn timestamp'))

    expect(screen.getByLabelText('Loại định dạng thời gian')).toBeDisabled()
    expect(screen.getByLabelText(/Múi giờ mặc định/)).toBeDisabled()
  })
})

describe('Form sửa dịch vụ', () => {
  it('ô mã chỉ đọc; ô khóa hiện "Đã cấu hình khóa" và không chứa giá trị khóa', () => {
    renderEdit()

    expect(codeInput()).toBeDisabled()
    expect(codeInput()).toHaveValue('CHI_HO')
    const secret = screen.getByLabelText(/Giá trị khóa/)
    expect(secret).toHaveValue('')
    expect(secret).toHaveAttribute('placeholder', 'Đã cấu hình khóa')
    expect(screen.getByText(/Để trống để giữ khóa hiện tại/)).toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(TEST_KEY)
  })

  it('để trống ô khóa rồi lưu: PUT không có apiKeySecret (giữ khóa cũ) và về danh sách', async () => {
    const user = userEvent.setup()
    const { calls } = renderEdit()

    await user.clear(nameInput())
    await user.type(nameInput(), 'Chi hộ mới')
    await user.click(saveButton())

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/services'))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/services/CHI_HO' })
    const body = JSON.parse(calls[0]?.body ?? '{}')
    expect(body.name).toBe('Chi hộ mới')
    expect(body.authType).toBe('API_KEY')
    expect('apiKeySecret' in body).toBe(false)
    expect(body.serviceCode).toBeUndefined()
  })

  it('nhập khóa mới thì PUT mang apiKeySecret mới', async () => {
    const user = userEvent.setup()
    const { calls } = renderEdit()

    fireEvent.change(screen.getByLabelText(/Giá trị khóa/), { target: { value: TEST_KEY } })
    await user.click(saveButton())

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(JSON.parse(calls[0]?.body ?? '{}').apiKeySecret).toBe(TEST_KEY)
  })

  it('đổi dịch vụ không xác thực sang API_KEY mà không nhập khóa thì bị từ chối', async () => {
    const user = userEvent.setup()
    const { calls } = renderEdit(THU_HO_DTO)

    await user.click(screen.getByRole('radio', { name: 'API Key Header' }))
    await user.click(saveButton())

    expect(await screen.findByText('Nhập giá trị khóa.', { selector: 'p' })).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('đổi sang NONE rồi lưu thì PUT bỏ khóa và tên header', async () => {
    const user = userEvent.setup()
    const { calls } = renderEdit()

    await user.click(screen.getByRole('radio', { name: 'Không xác thực' }))
    await user.click(saveButton())

    await waitFor(() => expect(calls).toHaveLength(1))
    const body = JSON.parse(calls[0]?.body ?? '{}')
    expect(body.authType).toBe('NONE')
    expect(body.apiKeyHeaderName).toBeNull()
    expect('apiKeySecret' in body).toBe(false)
  })
})
