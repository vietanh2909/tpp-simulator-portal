# Prompt triển khai frontend TPP Callback Simulator bằng Kiro Vibe

Hãy trực tiếp triển khai frontend TPP Callback Simulator trong workspace hiện tại bằng React + TypeScript + Vite, dùng npm và React Router.

Task này thực hiện theo cách Vibe: đọc yêu cầu và thiết kế, lập kế hoạch ngắn rồi viết code, chạy kiểm tra và sửa lỗi.

Đọc rules/steering đang áp dụng trước khi bắt đầu. Nếu chúng bắt buộc chạy AI-DLC hoặc xác nhận theo stage, chỉ rõ xung đột để tôi quyết định; không tự bỏ qua các hướng dẫn đó.

Trong phạm vi workflow cho phép:
- Không tạo thêm bộ requirements/design/tasks trùng với yêu cầu dưới đây.
- Không phân tích lại quyết định đã chốt.
- Tự quyết chi tiết triển khai thông thường; chỉ hỏi khi thiếu thiết kế hoặc có mâu thuẫn ảnh hưởng nghiệp vụ.
- Hoàn thành code và kiểm tra, không dừng ở đề xuất kế hoạch.

## 1. Kiểm tra workspace và khởi tạo

- Đây là dự án mới, nhưng phải kiểm tra nội dung workspace trước để tránh ghi đè.
- Kiểm tra Node/npm. Nếu thiếu hoặc không tương thích, thông báo cụ thể.
- Khởi tạo trực tiếp tại thư mục hiện tại, không tạo dự án lồng bên trong.
- Nếu có package.json, kiểm tra và bổ sung thay vì scaffold đè.
- Chọn phiên bản thư viện ổn định, tương thích; lưu lockfile.
- Cấu hình alias `@` trỏ đến `src` cho cả TypeScript và Vite.
- Dùng TypeScript strict; tránh any tùy tiện.
- Chưa triển khai backend Java trong task này.

## 2. Cấu trúc source code

```text
src/
  main.tsx
  vite-env.d.ts
  app/
    App.tsx
    config/
      app.config.ts
      env.ts
    providers/
      index.ts
      PageLoadingProvider.tsx
    router/
      index.tsx
      RootShell.tsx
      RouteErrorView.tsx
      routes.tsx
      ScrollToTop.tsx
  components/
    common/
      index.ts
      CopyButton/index.tsx
      EmptyState/index.tsx
      ErrorPanel/index.tsx
      NotFoundView/index.tsx
      PageContainer/index.tsx
      PageHeading/index.tsx
      PageLoader/index.tsx
    ui/
      index.ts
  constants/
    error-codes.ts
    routes.ts
  features/
    callback-services/
      index.ts
      api/callback-services.api.ts
      components/
      constants/callback-services.constants.ts
      hooks/
      types/callback-services.types.ts
      utils/
    callbacks/
      index.ts
      api/callbacks.api.ts
      components/
      hooks/
      types/callbacks.types.ts
      utils/
    transactions/
      index.ts
      api/transactions.api.ts
      components/
      hooks/
      types/transactions.types.ts
  hooks/
    useAsyncData.ts
    usePageTitle.ts
  layouts/
    index.ts
    SimulatorLayout/
      index.tsx
      SimulatorHeader.tsx
      SimulatorSidebar.tsx
      SimulatorFooter.tsx
  mocks/
    index.ts
    demo-http.ts
    demo-store.ts
    latency.ts
    data/
      services.ts
      callbacks.ts
  pages/
    Services/index.tsx
    ServiceCreate/index.tsx
    ServiceEdit/index.tsx
    Monitoring/index.tsx
    TransactionDetail/index.tsx
    NotFound/index.tsx
  services/
    http/
      client.ts
      error-handler.ts
  styles/globals.css
  types/
    api.ts
    common.ts
    navigation.ts
  utils/
    cn.ts
    format.ts
```

Quy tắc:
- `pages` chỉ ghép màn hình, đọc route params và điều phối component.
- Logic nghiệp vụ, hooks, component riêng nằm trong feature tương ứng.
- `components/common`, `components/ui` chỉ chứa thành phần dùng chung.
- `services/http` chỉ xử lý HTTP và lỗi chung.
- Feature API là ranh giới truy cập dữ liệu; component không truy cập mock store trực tiếp.
- Export công khai của feature qua index.ts; tránh import sâu xuyên feature và circular dependency.
- Không tạo file rỗng hoặc abstraction chưa dùng. Cây trên quy định vị trí khi cần triển khai.
- Không thêm AIS, OAuth, đăng nhập, PKCE hoặc refresh token.
- Giao diện tiếng Việt; chưa cần framework đa ngôn ngữ.

## 3. Thiết kế

- Đọc file trong `design/` và ảnh được cung cấp.
- Bám sát thiết kế Stitch về layout, màu sắc, typography, spacing và trạng thái tương tác.
- Tận dụng HTML/CSS phù hợp, chuyển thành component React; không nhúng nguyên trang bằng iframe.
- Nếu không tìm thấy hoặc không đọc được thiết kế, báo rõ và hỏi trước khi tự quyết phong cách.
- Chọn một cách styling nhất quán.
- UI dùng chung đặt trong components/ui. Nếu có source bộ component Msb*, tái sử dụng; tên file đơn thuần không được coi là đã có implementation.
- Không tạo wrapper chỉ để đổi tên thư viện.
- Ưu tiên desktop 1440px, sử dụng tốt ở 1280px.

## 4. Bối cảnh và phạm vi

TPP giả lập đối tác nhận HTTP callback từ ngân hàng trong dev/UAT. Người dùng tạo dịch vụ trên TPP, lấy URL rồi tự cấu hình URL đó phía ngân hàng.

TPP chỉ nhận thông báo và trả response. Không tạo yêu cầu nghiệp vụ gọi sang ngân hàng.

Mục tiêu:
- Kiểm tra callback đã đến TPP.
- Xem trạng thái nghiệp vụ ngân hàng gửi.
- Xem payload và lịch sử nhận.
- Thêm dịch vụ JSON mới bằng cấu hình mapping, không sửa code trong khả năng đã hỗ trợ.

## 5. Màn hình cấu hình dịch vụ

### Danh sách
- Mã, tên dịch vụ, URL callback và nút sao chép.
- Xác thực NONE/API key, trạng thái bật/tắt.
- Tìm theo mã/tên, lọc bật/tắt.
- Tạo, sửa, bật/tắt; không cần xóa.

### Tạo/sửa
- Mã dịch vụ duy nhất, không sửa sau khi tạo.
- Tên, mô tả tùy chọn, trạng thái bật/tắt.
- URL tự sinh: `POST /callbacks/{serviceCode}`, nhận application/json.
- Xác thực NONE hoặc API key: tên header, giá trị khóa có che và hiện/ẩn.
- Mapping ba trường transactionId, status, timestamp.
- Hỗ trợ đường dẫn root/object lồng nhau như `$.transId`, `$.data.transId`.
- Chưa hỗ trợ wildcard, filter hoặc mapping mảng; báo rõ cú pháp chưa hỗ trợ.
- Không dùng eval để xử lý mapping.
- Timestamp hỗ trợ ISO 8601, Unix giây, Unix mili giây và mẫu tùy chỉnh như `yyyy-MM-dd HH:mm:ss`.
- Múi giờ mặc định Asia/Ho_Chi_Minh khi dữ liệu không có múi giờ.
- Response gồm HTTP status và JSON body cố định; kiểm tra tính hợp lệ.
- Hiển thị validation tại trường.
- Response xác nhận tiếp nhận callback khác với status nghiệp vụ trong payload.

### Thử mapping
- JSON editor, nút kiểm tra, kết quả ba trường và lỗi từng trường.
- Không lưu callback hoặc giao dịch.
- Mapping lỗi một phần vẫn hiển thị giá trị lấy được.

### Gửi callback thử
- Mở từ dịch vụ đã lưu bằng drawer rộng hoặc trang phù hợp thiết kế.
- URL điền sẵn, nhập payload và headers; che giá trị nhạy cảm.
- Nếu cấu hình đang sửa chưa lưu, yêu cầu lưu trước.
- Loading, HTTP status, response body và thời gian xử lý.
- Trong mock mode chỉ mô phỏng xử lý, lưu dữ liệu mock và liên kết tới callback tương ứng.
- Ghi rõ chưa gửi HTTP callback đến backend thật.
- Khi nối backend sau này, dùng endpoint callback thật của dịch vụ, không tạo endpoint nhận riêng cho self-test.

## 6. Màn hình theo dõi

Hai tab: Giao dịch và Tất cả callback.

### Tab Giao dịch
- Một dòng cho mỗi cặp serviceCode + transactionId.
- Cột: dịch vụ, transactionId, status từ callback nhận gần nhất, timestamp nghiệp vụ của callback đó, thời điểm nhận gần nhất, số callback.
- Lọc dịch vụ, transactionId, status, khoảng thời gian nhận.
- Phân trang, tổng số kết quả.
- Bấm mở chi tiết.

### Tab Tất cả callback
- Mỗi lần nhận một dòng, kể cả lỗi mapping hoặc thiếu transactionId.
- Cột: mã callback, dịch vụ, transactionId, status nghiệp vụ, thời điểm nhận, kết quả mapping, HTTP response status.
- Lọc dịch vụ, transactionId, thời gian nhận, kết quả mapping.
- Phân trang.

### Chi tiết giao dịch/callback
- Lịch sử theo thứ tự nhận; chọn từng callback.
- Payload gốc định dạng JSON, headers đã che thông tin nhạy cảm.
- Kết quả mapping từng trường, lỗi cụ thể.
- Response và phiên bản/snapshot cấu hình đã dùng.
- Callback thiếu transactionId vẫn có chi tiết riêng, không tạo giao dịch giả.

### Tự cập nhật
- Polling 5 giây, bật/tắt và tải lại thủ công.
- Hiển thị thời điểm cập nhật.
- Không mất bộ lọc, trang hiện tại hoặc đóng chi tiết đang đọc.
- Không cần WebSocket.

## 7. Quy tắc nghiệp vụ

- Mỗi callback là bản ghi riêng, không deduplicate, không ghi đè lịch sử.
- Một giao dịch xác định bởi serviceCode + transactionId.
- Status giữ nguyên giá trị, badge trung tính, không tự diễn giải SUCCESS/FAILED hoặc mã 00/99.
- Trạng thái tổng hợp lấy callback nhận gần nhất, không dựa vào timestamp nghiệp vụ.
- Callback mới thiếu status: hiển thị thiếu và lỗi; không dùng giá trị cũ để che lỗi.
- Lưu riêng timestamp nghiệp vụ và receivedAt.
- Chuẩn hóa thời gian hợp lệ về UTC; UI hiển thị Asia/Ho_Chi_Minh và ghi rõ múi giờ.
- Mapping lỗi vẫn lưu payload, các giá trị lấy được và lỗi cụ thể.
- Thiếu transactionId: không nhóm vào giao dịch.
- Thay đổi cấu hình không làm thay đổi lịch sử cũ.
- Không hiển thị/lưu Authorization hoặc API key nguyên văn trong lịch sử headers.

Hành vi đích khi có backend; mock mô phỏng tương ứng:
- Dịch vụ không tồn tại: 404.
- Dịch vụ tắt: 503.
- API key sai/thiếu: 401.
- JSON không hợp lệ: 400.
- Request hợp lệ, xác thực đúng, dịch vụ bật: mapping lỗi vẫn lưu và trả response cấu hình.
- Lỗi lưu database: 500, không giả báo thành công.

## 8. Mock và chuẩn bị backend

- Backend tương lai dùng Java 21 + Spring Boot + PostgreSQL, nhưng không xây trong task này.
- Tạo mock service bất đồng bộ, mô phỏng độ trễ.
- LocalStorage giữ dữ liệu demo qua reload; chỉ dùng khóa và dữ liệu giả.
- Hiển thị rõ badge “Dữ liệu mô phỏng”.
- Cấu hình chế độ dữ liệu tập trung ở app/config; không rải điều kiện mock/real trong component.
- Chuẩn bị HTTP client lấy base URL từ biến môi trường và `.env.example`.
- Không tự fallback sang mock khi API thật lỗi.
- Nếu chưa có backend contract, đánh dấu contract đề xuất là dự kiến, chưa được xác nhận.
- Không giả nhận đã gọi backend, xác thực server hoặc kiểm chứng ngân hàng gửi thành công.
- Mock mô phỏng lọc/phân trang qua feature API; backend thật sẽ lọc/phân trang phía server.

### Dữ liệu mẫu

| Dịch vụ | transactionId | status | timestamp |
| --- | --- | --- | --- |
| thu-ho | $.transId | $.code | $.time |
| chi-ho | $.processId | $.status | $.date |
| bien-dong-so-du | $.trnId | $.stage | $.dateTime |

Có dữ liệu:
- Cùng giao dịch nhận PROCESSING → SUCCESS → SUCCESS.
- Trùng transactionId giữa hai dịch vụ để kiểm tra nhóm đúng.
- Callback thiếu mã giao dịch.
- Callback lỗi định dạng timestamp.
- Callback có timestamp nghiệp vụ đến sai thứ tự.

Ví dụ thu hộ:
```json
{
  "transId": "TEST-001",
  "code": "SUCCESS",
  "time": "2026-10-20T11:00:00+07:00"
}
```

Response ví dụ:
```json
{
  "code": "00",
  "message": "Received"
}
```

## 9. Trạng thái UI

- Danh sách rỗng, chưa có callback, không có kết quả lọc.
- Loading, lỗi tải và thử lại.
- JSON sai, lỗi từng mapping, lỗi một phần.
- Đang gửi self-test, phản hồi 401 mô phỏng.
- Lưu thành công, sao chép thành công.
- Nhãn status nghiệp vụ tách biệt với kết quả mapping.

## 10. Phạm vi loại trừ

- Không gọi nghiệp vụ sang ngân hàng.
- Không phát hiện callback chưa đến hoặc đối soát danh sách dự kiến.
- Không Kafka, NoSQL, đồng bộ database, microservices.
- Không đăng nhập, phân quyền, OAuth hoặc AIS.
- Không response động, giả lập timeout hoặc kịch bản lỗi N lần.
- Không triển khai production.

## 11. Triển khai và nghiệm thu

Thứ tự:
1. Kiểm tra workspace, môi trường và thiết kế; nêu kế hoạch ngắn.
2. Tạo project, layout và danh sách dịch vụ để xác lập hướng UI.
3. Hoàn thiện cấu hình, thử mapping, self-test.
4. Hoàn thiện theo dõi và chi tiết.
5. Chạy kiểm tra, sửa lỗi, bàn giao.

Không dừng xin duyệt từng bước nếu rules không bắt buộc và không có quyết định quan trọng còn thiếu.

Tiêu chí:
- Chạy được theo README.
- Tạo/sửa/bật/tắt dịch vụ hoạt động, dữ liệu demo giữ qua reload.
- Thử mapping không tạo callback.
- Self-test tạo callback mock và xem được lịch sử.
- Nhiều callback cùng giao dịch giữ đủ lịch sử, trạng thái tổng hợp đúng.
- Dịch vụ khác nhau có cùng transactionId không bị gộp.
- Lỗi mapping vẫn tra cứu được.
- Bộ lọc, phân trang, tự cập nhật, sao chép hoạt động.
- Thêm dịch vụ có cấu trúc JSON khác không sửa code.
- Chạy build, kiểm tra TypeScript và lint nếu có cấu hình; sửa lỗi trước bàn giao.
- Test tập trung mapping lồng nhau, timestamp, lỗi mapping, nhóm giao dịch và lịch sử; không viết test chỉ lặp lại implementation.
- Nếu có công cụ trình duyệt, kiểm tra luồng chính và console; nếu không, ghi rõ chưa kiểm tra trình duyệt.
- README ngắn mô tả cách chạy, cấu trúc, mock mode và chuẩn bị nối backend.
- Báo chính xác kiểm tra đã chạy và phần chưa kiểm chứng.

Bắt đầu kiểm tra workspace và triển khai.
