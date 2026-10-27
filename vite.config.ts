import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

/** Địa chỉ backend mặc định: backend chỉ lắng nghe loopback IPv4 (xem openapi.yaml, mục servers). */
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8080'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL

  // Backend cấm CORS nên trình duyệt luôn gọi cùng nguồn qua proxy.
  const proxy = {
    '/api': { target },
    // Route SPA `callbacks/:callbackId` (GET trình duyệt) trùng tiền tố với `POST /callbacks/{serviceCode}`:
    // chỉ chuyển tiếp POST, các phương thức khác trả về chính đường dẫn đó để SPA phục vụ.
    '/callbacks': {
      target,
      bypass: (req: { method?: string; url?: string }) => (req.method === 'POST' ? undefined : req.url),
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: { proxy },
    preview: { proxy },
    test: {
      environment: 'jsdom',
      // Render + user-event trong jsdom chạy chậm trên máy này (gõ từng phím); 5 giây mặc định không đủ cho kiểm thử form.
      testTimeout: 60_000,
      // Giới hạn số worker chạy song song. Mặc định Vitest mở theo số lõi CPU; trên máy chậm 7/10 tệp không kịp khởi
      // động worker trong 60 giây cố định của Vitest ("Timeout waiting for worker to respond", mã thoát 1). Với 2 worker
      // cả bộ chạy xanh ổn định. Ngưỡng và số kiểm thử không đổi.
      maxWorkers: 2,
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
      },
    },
  }
})
