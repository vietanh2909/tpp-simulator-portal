import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom + render nặng chạy chậm khi cả bộ chạy song song hoặc có coverage; chỉ nới thời gian chờ, không đổi khẳng định.
configure({ asyncUtilTimeout: 20_000 })

beforeEach(() => {
  // jsdom chưa cài `scrollTo`; router gọi nó khi đổi trang.
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
