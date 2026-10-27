import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { THU_HO_DTO } from '@/test/fixtures/services'
import { errorResponse, jsonResponse, routeFetch } from '@/test/http'
import type { ServiceFormValues } from '../../types/callback-services.types'
import { toCallbackService, toFormValues } from '../../utils/service-dto'
import { MappingTester } from './MappingTester'

const baseValues: ServiceFormValues = toFormValues(toCallbackService(THU_HO_DTO))
const SAMPLE = '{"transId":"T1","code":"00","time":"2026-10-19T10:00:00+07:00"}'

function setSample(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Payload thử nghiệm (JSON)' }), { target: { value: text } })
}

describe('MappingTester (thử mapping qua server)', () => {
  it('gửi cấu hình đang nhập (chưa lưu) và JSON mẫu tới đúng POST /api/mapping-tests, không gọi gì khác', async () => {
    const user = userEvent.setup()
    const { calls } = routeFetch({
      'POST /api/mapping-tests': () => jsonResponse(200, { sampleJsonValid: true }),
    })
    const unsaved: ServiceFormValues = {
      ...baseValues,
      mapping: { transactionId: '$.payload.ref', status: '$.payload.state', timestamp: '' },
      timestampFormat: 'CUSTOM',
      timestampPattern: 'yyyy-MM-dd HH:mm:ss',
    }
    render(<MappingTester values={unsaved} />)
    setSample(SAMPLE)

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))

    expect(await screen.findByText('0/2 hợp lệ')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/mapping-tests' })
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      transactionIdPath: '$.payload.ref',
      statusPath: '$.payload.state',
      timestampPath: null,
      timestampFormat: 'PATTERN',
      timestampPattern: 'yyyy-MM-dd HH:mm:ss',
      defaultTimeZone: 'Asia/Ho_Chi_Minh',
      sampleJson: SAMPLE,
    })
  })

  it('hiện transactionId, status và timestamp UTC kèm giờ Asia/Ho_Chi_Minh', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () =>
        jsonResponse(200, {
          sampleJsonValid: true,
          transactionId: { value: 'T1' },
          status: { value: '00' },
          timestamp: { value: '2026-10-19T03:00:00Z' },
        }),
    })
    render(<MappingTester values={baseValues} />)
    setSample(SAMPLE)

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))

    expect(await screen.findByText('T1')).toBeInTheDocument()
    expect(screen.getByText('00')).toBeInTheDocument()
    expect(screen.getByText('UTC: 2026-10-19T03:00:00Z')).toBeInTheDocument()
    expect(screen.getByText(/2026-10-19 10:00:00\.000/)).toBeInTheDocument()
    expect(screen.getByText('3/3 hợp lệ')).toBeInTheDocument()
  })

  it('thiếu trường status: báo "Không tìm thấy" cho status, hai trường còn lại vẫn hiện giá trị', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () =>
        jsonResponse(200, {
          sampleJsonValid: true,
          transactionId: { value: 'T1' },
          status: { errorCode: 'NOT_FOUND', error: 'Không có $.code trong JSON mẫu.' },
          timestamp: { value: '2026-10-19T03:00:00Z' },
        }),
    })
    render(<MappingTester values={baseValues} />)

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))

    expect(await screen.findByText(/Không tìm thấy: Không có \$\.code/)).toBeInTheDocument()
    expect(screen.getByText('T1')).toBeInTheDocument()
    expect(screen.getByText('UTC: 2026-10-19T03:00:00Z')).toBeInTheDocument()
    expect(screen.getByText('2/3 hợp lệ')).toBeInTheDocument()
  })

  it('JSON mẫu không hợp lệ (sampleJsonValid=false) thì báo JSON mẫu không hợp lệ', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () =>
        jsonResponse(200, { sampleJsonValid: false, sampleJsonError: 'Ký tự lạ ở vị trí 3.' }),
    })
    render(<MappingTester values={baseValues} />)
    setSample('{ok:true}')

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))

    expect(await screen.findByText('JSON mẫu không hợp lệ.')).toBeInTheDocument()
    expect(screen.getByText('Ký tự lạ ở vị trí 3.')).toBeInTheDocument()
  })

  it('đường dẫn timestamp để trống thì hiện "Không cấu hình mapping" và không tính vào số trường hợp lệ', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () =>
        jsonResponse(200, { sampleJsonValid: true, transactionId: { value: 'T1' }, status: { value: '00' } }),
    })
    render(<MappingTester values={{ ...baseValues, mapping: { ...baseValues.mapping, timestamp: '' } }} />)

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))

    expect(await screen.findByText('Không cấu hình mapping cho trường này.')).toBeInTheDocument()
    expect(screen.getByText('2/2 hợp lệ')).toBeInTheDocument()
  })

  it('cấu hình sai bị server từ chối (400): hiện thông điệp lỗi theo trường thay vì kết quả', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () =>
        errorResponse(400, 'VALIDATION_FAILED', 'Sai.', [{ field: 'statusPath', message: 'Đường dẫn status sai.' }]),
    })
    render(<MappingTester values={baseValues} />)

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))

    expect(await screen.findByText(/Cấu hình mapping không hợp lệ: Đường dẫn status sai\./)).toBeInTheDocument()
    expect(screen.queryByText(/\d\/\d hợp lệ/)).not.toBeInTheDocument()
  })

  it('kết quả báo "đã cũ" khi cấu hình hoặc JSON mẫu đổi sau lần kiểm tra', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () => jsonResponse(200, { sampleJsonValid: true, transactionId: { value: 'T1' } }),
    })
    const { rerender } = render(<MappingTester values={baseValues} />)

    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))
    await screen.findByText('T1')
    expect(screen.queryByText('Kết quả đã cũ, hãy kiểm tra lại.')).not.toBeInTheDocument()

    rerender(<MappingTester values={{ ...baseValues, mapping: { ...baseValues.mapping, status: '$.state' } }} />)

    expect(screen.getByText('Kết quả đã cũ, hãy kiểm tra lại.')).toBeInTheDocument()
  })
})
