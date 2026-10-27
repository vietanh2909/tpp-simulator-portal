import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/http/error-handler'
import { BIEN_DONG_DTO, CHI_HO_DTO, DA_XOA_DTO, THU_HO_DTO, TEST_KEY } from '@/test/fixtures/services'
import { errorResponse, jsonResponse, stubFetch } from '@/test/http'
import { toFormValues, toCallbackService } from '../utils/service-dto'
import { callbackServicesApi } from './callback-services.api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('callbackServicesApi', () => {
  it('list: GET /api/services, bỏ dịch vụ đã xóa và đếm số dịch vụ đang bật', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, [THU_HO_DTO, CHI_HO_DTO, BIEN_DONG_DTO, DA_XOA_DTO]))

    const result = await callbackServicesApi.list()

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'GET', url: '/api/services' })
    expect(result.items.map((s) => s.code)).toEqual(['THU_HO', 'CHI_HO', 'BIEN_DONG'])
    expect(result.total).toBe(3)
    expect(result.enabledTotal).toBe(2)
  })

  it('list: includeDeleted=true gửi tham số và giữ dịch vụ đã xóa', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, [THU_HO_DTO, DA_XOA_DTO]))

    const result = await callbackServicesApi.list({ includeDeleted: true })

    expect(calls[0]?.url).toBe('/api/services?includeDeleted=true')
    expect(result.items.map((s) => s.deleted)).toEqual([false, true])
  })

  it('get: mã được mã hóa phần trăm và dịch vụ đã xóa mềm bị coi là không tìm thấy', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, DA_XOA_DTO))

    const error = await callbackServicesApi.get('DA XOA/1').catch((e: unknown) => e)

    expect(calls[0]?.url).toBe('/api/services/DA%20XOA%2F1')
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).code).toBe('SERVICE_NOT_FOUND')
  })

  it('get: đọc về không có giá trị khóa, chỉ có cờ apiKeyConfigured', async () => {
    stubFetch(() => jsonResponse(200, CHI_HO_DTO))

    const service = await callbackServicesApi.get('CHI_HO')

    expect(service.apiKeyConfigured).toBe(true)
    expect(JSON.stringify(service)).not.toContain(TEST_KEY)
  })

  it('create: POST /api/services với serviceCode và khóa mới', async () => {
    const { calls } = stubFetch(() => jsonResponse(201, CHI_HO_DTO))
    const values = {
      ...toFormValues(toCallbackService(CHI_HO_DTO)),
      apiKeySecret: TEST_KEY,
    }

    const created = await callbackServicesApi.create(values)

    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/services' })
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      serviceCode: 'CHI_HO',
      apiKeySecret: TEST_KEY,
      timestampFormat: 'PATTERN',
    })
    expect(created.code).toBe('CHI_HO')
  })

  it('update: dùng PUT (không phải PATCH) và không gửi apiKeySecret khi ô khóa để trống', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, CHI_HO_DTO))

    await callbackServicesApi.update('CHI_HO', toFormValues(toCallbackService(CHI_HO_DTO)))

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/services/CHI_HO' })
    expect(calls[0]?.body).not.toContain('apiKeySecret')
    expect(JSON.parse(calls[0]?.body ?? '{}').serviceCode).toBeUndefined()
  })

  it('setEnabled: PUT /api/services/{code}/enabled với { enabled }', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { ...THU_HO_DTO, enabled: false }))

    const updated = await callbackServicesApi.setEnabled('THU_HO', false)

    expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/services/THU_HO/enabled' })
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ enabled: false })
    expect(updated.enabled).toBe(false)
  })

  it('remove: DELETE /api/services/{code} và chấp nhận 204', async () => {
    const { calls } = stubFetch(() => new Response(null, { status: 204 }))

    await expect(callbackServicesApi.remove('THU_HO')).resolves.toBeUndefined()

    expect(calls[0]).toMatchObject({ method: 'DELETE', url: '/api/services/THU_HO' })
  })

  it('lỗi 409 trùng mã được giữ nguyên mã lỗi của backend', async () => {
    stubFetch(() => errorResponse(409, 'SERVICE_CODE_DUPLICATE', 'Mã dịch vụ đã tồn tại.'))

    const error = await callbackServicesApi.create(toFormValues(toCallbackService(THU_HO_DTO))).catch((e: unknown) => e)

    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).code).toBe('SERVICE_CODE_DUPLICATE')
  })
})
