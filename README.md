# TPP Callback Simulator Portal

Frontend giả lập đối tác TPP nhận HTTP callback từ ngân hàng trong môi trường dev/UAT. Người dùng tạo dịch vụ, lấy URL callback `POST /callbacks/{serviceCode}`, cấu hình URL đó phía ngân hàng rồi theo dõi callback, payload và lịch sử nhận.

Stack: React 19 + TypeScript (strict) + Vite 8 + Tailwind CSS 4 + React Router. Backend là `../tpp-simulator-app` (Java 21 + Spring Boot + PostgreSQL); hợp đồng API thật ở `../tpp-simulator-app/docs/api/openapi.yaml`.

## Yêu cầu

- Node.js `22.22.2` trở lên trong nhánh 22, hoặc `24.15` trở lên, hoặc `26+` (jsdom 30 và Vitest 5 đòi hỏi; kiểm tra bằng `node -v`).
- Backend đang chạy ở `http://127.0.0.1:8080` (xem README của `tpp-simulator-app`).

## Chạy dự án

```powershell
npm ci
npm run dev        # http://localhost:5173
```

Trên Windows PowerShell nếu `npm` bị chặn bởi execution policy, dùng `npm.cmd` thay thế.

Trình duyệt luôn gọi **cùng nguồn**: backend cấm CORS, nên Vite proxy chuyển tiếp `/api/*` (mọi phương thức) và `POST /callbacks/*` sang backend. Các yêu cầu GET tới `/callbacks/...` vẫn do ứng dụng (route chi tiết callback) phục vụ. Không cần đặt `VITE_API_BASE_URL`.

Cấu hình (tùy chọn) trong `.env`, xem `.env.example`:

| Biến                     | Mặc định                | Ý nghĩa                                                                                                   |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_BACKEND_URL`       | `http://127.0.0.1:8080` | Địa chỉ backend mà proxy chuyển tiếp tới (dùng `127.0.0.1`, backend chỉ lắng nghe IPv4 loopback).         |
| `VITE_API_BASE_URL`      | (trống)                 | Để trống để gọi cùng nguồn qua proxy. Đặt giá trị sẽ gọi thẳng backend và bị CORS chặn.                   |
| `VITE_CALLBACK_BASE_URL` | (trống)                 | Gốc URL callback hiển thị cho từng dịch vụ. Trống: dùng địa chỉ trang đang mở (`window.location.origin`). |

> Hệ thống ngân hàng thật thường gọi tới địa chỉ khác `localhost:5173`. Khi đó đặt `VITE_CALLBACK_BASE_URL` thành địa chỉ họ gọi được.

## Lệnh

| Lệnh                    | Mục đích                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Chạy dev server (kèm proxy)                                  |
| `npm run build`         | Kiểm tra TypeScript và build production                      |
| `npm run typecheck`     | Chỉ kiểm tra TypeScript                                      |
| `npm run lint`          | ESLint                                                       |
| `npm run format`        | Prettier ghi đè định dạng                                    |
| `npm run format:check`  | Prettier chỉ kiểm tra (chạy trong verify và CI)              |
| `npm test`              | Vitest (jsdom, Testing Library, axe-core); không cần backend |
| `npm run test:coverage` | Vitest kèm coverage (v8)                                     |

Kiểm tra toàn bộ portal (cài sạch, lint, định dạng, kiểm thử, build) từ thư mục gốc workspace:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 -FrontendOnly
```

**Đóng `npm run dev` trước khi chạy**: máy chủ Vite khóa tệp `.node` của lightningcss và làm `npm ci` lỗi `EPERM`. Bỏ `-FrontendOnly` để chạy cả backend (khoảng 20 phút).

## Màn hình

| Đường dẫn                                   | Màn hình                                                                                             | Phạm vi |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| `/services`                                 | Danh sách dịch vụ: tìm theo mã/tên, lọc bật/tắt, sao chép URL, bật/tắt, xóa mềm (có xác nhận)        | U3      |
| `/services/new`, `/services/:code/edit`     | Tạo/sửa dịch vụ: thông tin chung, xác thực (khóa chỉ ghi), mapping, thử mapping qua server, response | U3      |
| `/services/:code/test`                      | Gửi callback thử tới endpoint thật của dịch vụ                                                       | U3      |
| `/transactions`                             | Theo dõi: tab Giao dịch / Tất cả callback, lọc, phân trang 20/50/100, tự cập nhật 5 giây             | U4      |
| `/transactions/:serviceCode/:transactionId` | Chi tiết giao dịch và lịch sử callback theo thứ tự nhận                                              | U4      |
| `/callbacks/:callbackId`                    | Chi tiết một lần nhận (kể cả callback bị từ chối)                                                    | U4      |

## Theo dõi giao dịch và callback

- **Hai tab**: "Giao dịch" (mỗi dòng một cặp dịch vụ + transactionId, status lấy từ callback nhận gần nhất) và "Tất cả callback" (mỗi lần nhận một dòng, kể cả lỗi mapping và bị từ chối kèm lý do). Mỗi tab giữ bộ lọc và trang riêng khi chuyển qua lại.
- **Bộ lọc**: dịch vụ (kèm dịch vụ đã xóa, ghi "(đã xóa)"), transactionId và Status (ô chữ, khớp chuỗi chứa, không phân biệt hoa thường); tab callback có "Kết quả xử lý" (Thành công, Lỗi mapping, Bị từ chối) và "Lý do" (chỉ khi chọn Bị từ chối). Enter hoặc nút "Áp dụng" mới áp dụng.
- **Thời gian nhận**: ô văn bản `yyyy-MM-dd HH:mm:ss` theo giờ Việt Nam (GMT+7), chính xác tới giây, tính cả hai đầu; gõ tắt `yyyy-MM-dd` hiểu là 00:00:00 ở ô "Từ" và 23:59:59 ở ô "Đến". Có thêm lựa chọn nhanh 15 phút, 1 giờ, 24 giờ, 7 ngày gần đây (tính lại ở mỗi lần tải). Mốc gửi lên API không có phần thập phân giây.
- **Phân trang**: 20, 50 hoặc 100 dòng mỗi trang (backend chỉ nhận ba giá trị này, mặc định 20). Tab, bộ lọc, trang và cỡ trang nằm trong địa chỉ trang (`/transactions?tab=callbacks&outcome=REJECTED&page=2`), nên Quay lại của trình duyệt và liên kết "Quay lại danh sách theo dõi" ở trang chi tiết trả về đúng chỗ. Bộ lọc của tab kia được nhớ trong `sessionStorage` của tab trình duyệt (khóa `tpp-simulator:monitoring:*`, không chứa dữ liệu nhạy cảm).
- **Tự cập nhật mỗi 5 giây** (mặc định bật, tắt được): chỉ tab đang xem được tải; lần tải trước chưa xong thì bỏ qua nhịp kế tiếp (không có hai lần tải chồng nhau); đổi bộ lọc, đổi trang hoặc bấm "Tải lại" hủy lần tải đang chạy. Khi lỗi, giữ dữ liệu cũ kèm banner "Không cập nhật được. Đang hiển thị dữ liệu lúc …"; lần tải thành công kế tiếp xóa banner. Trình đọc màn hình chỉ được thông báo khi bấm "Tải lại", áp dụng bộ lọc, đổi trang, tổng số dòng đổi, lỗi và phục hồi, không đọc lại mỗi 5 giây.
- **Chi tiết là trang riêng** (không phải ngăn trượt): `/transactions/:serviceCode/:transactionId` (lịch sử các lần nhận theo thứ tự nhận; chọn một lần nhận để xem payload, header đã che, kết quả mapping từng trường, response đã trả, phiên bản cấu hình; tự cập nhật cùng nhịp, lần đang chọn không tự nhảy, hiện "Có N callback mới") và `/callbacks/:callbackId` (một lần nhận, `callbackId` là mã số của bản ghi). `transactionId` có `/ ? # %` hay khoảng trắng được mã hóa phần trăm trên cả địa chỉ trang và API.
- **Callback bị từ chối** hiện lý do bằng chữ, mã HTTP đã trả, body gốc dạng văn bản khi không phải JSON và dòng "Chưa chạy mapping vì request bị từ chối".
- **Giá trị gốc của timestamp**: backend không trả giá trị gốc. Khi lần nhận dùng đúng phiên bản cấu hình hiện hành của dịch vụ, giao diện đọc giá trị ở đường dẫn timestamp hiện hành từ payload và hiện cạnh thông báo lỗi; khác phiên bản hoặc dịch vụ đã xóa thì chỉ chỉ xuống payload.
- **Header đã che do backend làm** (`Authorization`, `Proxy-Authorization`, `Cookie` và header khóa API hiện `***`); giao diện không che thêm và không bao giờ hiện khóa.
- Cửa sổ hẹp hơn 1024px hiện banner cảnh báo đóng được, không chặn nội dung.

## Khóa API chỉ ghi

Form gửi `apiKeySecret` khi bạn nhập khóa; backend chỉ trả `apiKeyConfigured`. Khi sửa dịch vụ đã có khóa, để trống ô khóa nghĩa là giữ khóa cũ. Giá trị khóa không bao giờ được đọc về, hiện lại trên trang, đưa vào thông báo lỗi hay giữ lại sau khi gửi callback thử.

## Cấu trúc

```text
src/
  app/            config, providers, router
  components/     common (dùng chung), ui (thành phần giao diện cơ bản, gồm ConfirmDialog)
  constants/      routes, mã lỗi của backend
  features/
    callback-services/   API dịch vụ, DTO và ánh xạ, logic biểu mẫu, danh sách, thử mapping
    callbacks/           gửi callback thử; API và DTO callback, bảng, chi tiết một lần nhận
    transactions/        API và DTO giao dịch, bộ lọc, thời gian, trạng thái URL, bảng, chi tiết giao dịch
  hooks/ layouts/ pages/ services/http/ styles/ test/ types/ utils/
```

Quy ước: `pages` chỉ ghép màn hình; logic và component riêng nằm trong feature; feature API là ranh giới truy cập dữ liệu; DTO của backend tách khỏi mô hình giao diện (`utils/service-dto.ts`). Kiểm thử chỉ giả `fetch` ở biên mạng (`src/test/http.ts`); dữ liệu mẫu ở `src/test/fixtures/`.

## Quy tắc nghiệp vụ chính (phía giao diện)

- Mã dịch vụ: `^[A-Za-z0-9_-]{1,50}$`, không phân biệt hoa thường khi kiểm trùng, không sửa được sau khi tạo.
- Đường dẫn mapping: `$.` kèm 1 đến 10 đoạn `[A-Za-z0-9_-]`, tối đa 200 ký tự (không wildcard, đệ quy hay chỉ số mảng).
- Response cấu hình: HTTP 200 đến 599 (trừ 204, 205, 304), body là JSON hợp lệ tối đa 64 KB.
- Thử mapping do server tính (`POST /api/mapping-tests`) theo cấu hình đang nhập, không ghi callback hay giao dịch.
- Thời gian hiển thị theo `Asia/Ho_Chi_Minh` (GMT+7).
