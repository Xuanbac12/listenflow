# Kết quả kiểm tra — 2026-11-17

Môi trường thực tế: Windows, Node.js 22.12.0, npm 10.9.0, Java 21, Firebase CLI 15.14.0, Chrome headless qua Playwright. Auth/Firestore/Functions chạy trên project emulator `demo-listenflow`.

| Kiểm tra | Kết quả |
| --- | --- |
| Cài dependencies frontend và backend độc lập | Đạt; backend dùng `npm ci` với lockfile riêng |
| Import module API để kiểm tra khởi động | Đạt |
| `npm run build` | Đạt; TypeScript frontend/backend và Vite production bundle |
| `npm test` | 13/13 tests đạt |
| `npm run test:integration` | Tất cả assertions đạt; script bên trong emulator thoát code 0 |
| `npm run test:e2e` | 1 kịch bản xuyên suốt đạt, 18.7 giây; script thoát code 0 |
| `npm audit --omit=dev` | 0 cảnh báo dependency production |
| `npm audit --prefix functions --omit=dev` | 0 cảnh báo dependency production |

Kiểm thử API bao gồm token thiếu/sai, hai tài khoản tách biệt dữ liệu, CRUD và validation, nhóm, metadata không chứa bản gốc, chấm điểm backend, gửi lặp/đồng thời không tăng thống kê hai lần, lưu và xóa bài sai khi đạt 100%, lịch sử, timezone, cài đặt, xóa nội dung đang có phiên luyện và chặn truy cập Firestore trực tiếp.

Kiểm thử Chrome thực hiện đăng ký → thêm topic và câu có gợi ý tiếng Việt → tìm kiếm → luyện thiếu một từ (83%) → xem bài sai → luyện đúng (100%) → danh sách bài sai được xóa → lịch sử tồn tại sau refresh → thống kê 2 lượt, trung bình 92% → lưu dark mode → viewport mobile 390×844 không tràn ngang → dùng menu mobile → sửa và xóa nội dung. Không ghi nhận lỗi JavaScript ở trình duyệt.

Ảnh chụp trong `test-results/`: `practice-desktop.png`, `result-desktop.png`, `practice-dark.png`, `practice-mobile.png`. Đã xem trực tiếp ảnh desktop và mobile; menu đóng trên mobile được ẩn hoàn toàn. Ảnh và kết quả chạy được gitignore vì là artifact kiểm thử.

Các lỗi môi trường đã xử lý: ổ C: hết dung lượng ở lần cài đầu; sandbox chặn subprocess nên build/test chạy với quyền phù hợp; npm workspace từng bỏ sót dependency bắc cầu nên chuyển sang hai package/lockfile độc lập và xác nhận lại toàn bộ build/test. Trong PowerShell, chuyển hướng stderr của Firebase CLI có thể khiến lớp gọi ngoài báo exit 1 dù script bên trong đã thành công; kết quả được xác nhận từ `Script exited successfully (code 0)`, assertions và `.last-run.json` của Playwright.

## Cập nhật triển khai miễn phí — 2026-11-17

Người dùng đã chọn Firebase Spark + Render Free. Đã thực hiện trên cloud:

- Tạo project `listenflow-english-20261117` và Firebase Web App.
- Xác nhận Email/Password đã bật; cấu hình hai domain Hosting trong Authentication.
- Tạo Firestore `(default)` tại `asia-southeast1`; API xác nhận `freeTier: true`.
- Deploy Firestore Rules và indexes thành công; ruleset chặn đọc/ghi trực tiếp từ client.
- Tạo service account `listenflow-render@listenflow-english-20261117.iam.gserviceaccount.com` với `roles/datastore.user` và `roles/firebaseauth.viewer`. Chưa tạo khóa bí mật.

Đã chuẩn bị `render.yaml`, server Express độc lập, CORS allowlist, URL API cấu hình theo môi trường, timeout cho cold start, cấu hình Hosting Spark và kiểm tra trước deploy. `npm run deploy` hiện dùng phương án Spark/Render, không deploy Functions.

Kiểm tra sau thay đổi:

- `npm run build`: đạt với cấu hình Firebase production.
- `npm test`: **14/14 tests đạt**, gồm 13 bài chấm điểm và 1 bài CORS.
- `npm run test:standalone`: đạt; Express chạy bằng `node functions/lib/server.js`, kiểm tra preflight/CORS và toàn bộ assertions API với Auth/Firestore emulators. Script bên trong emulator thoát code 0.
- Đã xác nhận các tệp cấu hình local và thư mục `.local/` được Git bỏ qua.

**Chưa public website:** chưa có repository GitHub từ người dùng và chưa có backend Render/URL API. Hosting chưa deploy. Không bật Blaze và không chạy Cloud Functions trên cloud. Chưa kiểm tra toàn bộ luồng người dùng trên môi trường cloud. Hướng dẫn chi tiết và các bước tạo tài khoản nằm trong `DEPLOY_FREE.md`.
