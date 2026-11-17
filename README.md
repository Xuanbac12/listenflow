# ListenFlow — English Practice

Ứng dụng luyện viết và nhớ nội dung tiếng Anh. React + TypeScript + Vite + Tailwind CSS; Node.js Express TypeScript; Firebase Authentication và Cloud Firestore. Phương án deploy đang chọn là **Firebase Spark + Render Free**.

**Hướng dẫn deploy miễn phí từng bước:** [DEPLOY_FREE.md](DEPLOY_FREE.md). `npm run deploy` mặc định dùng Spark/Render; không bật billing hay triển khai Cloud Functions.

[Tạo backend Render từ repository này](https://render.com/deploy?repo=https://github.com/Xuanbac12/listenflow) — cấu hình `render.yaml` đã chọn gói Free. Đăng nhập Render bằng GitHub, cấp quyền cho repository và điền `FIREBASE_SERVICE_ACCOUNT_JSON` theo hướng dẫn trước khi deploy.

## Chức năng

- Dashboard, Vocabulary, Sentences, Paragraphs, Add/Edit Content, Practice, Review Mistakes, History, Statistics, Settings.
- Đăng ký, đăng nhập bằng email/password, đặt lại mật khẩu, đăng xuất.
- CRUD nội dung, chủ đề, bộ sưu tập; tìm kiếm tiêu đề/gợi ý; lọc theo loại, chủ đề và bộ sưu tập.
- Luyện bằng gợi ý (ví dụ bản dịch tiếng Việt), nhập đáp án, chấm điểm trên backend, so sánh từng từ, luyện lại.
- Lịch sử phân trang 20 lượt; lưu bài sai, tự xóa khỏi danh sách ôn tập khi đạt 100%; thống kê tổng hợp và tiến độ ngày.
- Light/Dark/System, mục tiêu hằng ngày, múi giờ và tùy chọn chấm điểm lưu qua API.

Không có Text-to-Speech, audio player, file âm thanh, API âm thanh hoặc Firebase Storage. Frontend không chấm điểm và không truy cập Firestore trực tiếp.

## Chạy localhost

Yêu cầu Node.js 22 phiên bản 22.12 trở lên (nên dùng bản vá 22.x mới nhất), npm, Java 21+, Firebase CLI (`npm install -g firebase-tools`). Cần đủ dung lượng cho npm và Firestore emulator.

```powershell
npm install
Copy-Item .env.example .env.local
npm run emulators
```

Mở terminal thứ hai trong thư mục dự án:

```powershell
npm run dev
```

Truy cập địa chỉ Vite in ra (thường http://127.0.0.1:5173). Đăng ký tài khoản bất kỳ trên giao diện; tài khoản được tạo trong Auth Emulator. Tạo một nội dung với tiêu đề không tiết lộ đáp án, thêm gợi ý tiếng Việt, rồi vào Practice để luyện tập.

Frontend và `functions/` có package.json/lockfile riêng. `npm install` ở thư mục gốc tự chạy `npm --prefix functions ci` qua postinstall, nên chỉ cần một lệnh cài đặt. Giữ cả hai lockfile trong mã nguồn để local và Cloud Functions dùng cùng phiên bản. Các Firebase component và gRPC có overrides để giữ tương thích Node.js 22 và bản vá bảo mật.

Emulator UI: http://127.0.0.1:4000. Auth: 9099; Firestore: 8080; Functions: 5001. Project local luôn là `demo-listenflow`; không cần tài khoản Firebase thật để sử dụng local. API được Vite proxy đến Functions Emulator, không cần CORS. Frontend dùng Firebase SDK chỉ cho Authentication.

Để giữ dữ liệu emulator qua lần khởi động, thay `npm run emulators` bằng:

```powershell
npm --prefix functions run build
firebase emulators:start --project demo-listenflow --only auth,firestore,functions --import .emulator-data --export-on-exit .emulator-data
```

Lần đầu có thể bỏ `--import` nếu thư mục chưa tồn tại. Email đặt lại mật khẩu trong môi trường local được in dưới dạng link trong log Auth Emulator, không gửi email thật.

## Kiểm thử

```powershell
npm test
npm run build
npm run test:integration
npm run test:e2e
```

Tắt emulator đang chạy trước khi chạy integration để tránh trùng cổng. Kiểm thử tích hợp tự chạy emulator, đăng ký hai tài khoản tạm và kiểm tra CRUD, phân quyền, không lộ đáp án, chấm điểm, gửi trùng/đồng thời, lịch sử, thống kê, bài sai, cài đặt và Firestore Rules. Dữ liệu chỉ nằm trong project emulator `demo-listenflow`.

Unit tests chấm điểm kiểm tra từ đúng/sai/thiếu/thừa, trùng từ, chữ hoa/thường, dấu câu, Unicode, đáp án rỗng, giới hạn từ và tính đầy đủ của alignment.

Kiểm thử E2E dùng Playwright và Chrome cài sẵn (`channel: chrome`), tự chạy Vite và emulator; kiểm tra đăng ký → tạo nhóm/nội dung → luyện sai → ôn đúng → lịch sử/thống kê → dark mode → mobile → sửa/xóa. Ảnh chụp nằm trong `test-results/`. Nếu máy chưa có Chrome, cài Chrome hoặc chỉnh channel trong `playwright.config.ts` theo trình duyệt đã cài.

## Triển khai Firebase Cloud Functions (tùy chọn Blaze)

Phần này dành riêng cho phương án Cloud Functions có billing. Với phương án miễn phí đã chọn, làm theo [DEPLOY_FREE.md](DEPLOY_FREE.md) và dùng `npm run deploy:spark`.

1. Tạo/chọn Firebase project, bật gói Blaze để triển khai Cloud Functions Gen 2. Tạo Firestore ở region phù hợp (API đặt tại `asia-southeast1`).
2. Authentication → Sign-in method → bật Email/Password. Thêm domain Hosting hoặc custom domain vào Authorized domains nếu cần.
3. Project settings → Your apps → tạo Web app, sao chép Firebase web config. Đây là cấu hình public của web app, không phải service-account key. Không đưa service-account key vào frontend.
4. Tạo `.env.production.local`:

```dotenv
VITE_USE_EMULATORS=false
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=your-web-app-id
```

5. Chạy:

```powershell
firebase login
firebase use --add
npm test
npm run build
firebase deploy --only hosting,functions,firestore --project YOUR_PROJECT_ID
```

Sau khi đã chọn project bằng `firebase use --add`, có thể dùng `npm run deploy:blaze`. Với phương án này, để trống `VITE_API_BASE_URL` và deploy cả API và Firestore Rules cùng với Hosting. Hosting rewrite `/api/**` đến function `api`, còn lại về `index.html` cho React Router. Admin SDK dùng service identity của Functions, không cần khóa JSON.

6. Mở URL Hosting do CLI trả về, đăng ký tài khoản thật, thêm nội dung và thử một đáp án sai/một đáp án đúng. Kiểm tra History, Review Mistakes và Statistics. Xác nhận DevTools Network không có nội dung gốc trong `/contents` hoặc `/practice` trước khi nộp đáp án.

Tài liệu chính thức: [Node.js runtime](https://firebase.google.com/docs/functions/manage-functions), [Hosting + Functions](https://firebase.google.com/docs/hosting/functions), [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [Firestore Emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore).

## Kiến trúc và bảo vệ dữ liệu

```text
React ── Firebase Auth SDK ── Firebase Authentication
  │
  └─ REST /api + Bearer ID token
         └─ Express trên Render Free (hoặc Cloud Functions Gen 2)
              ├─ verifyIdToken(token, checkRevoked=true)
              ├─ Word-level alignment + server scoring
              └─ Firebase Admin SDK → Cloud Firestore
```

Mọi route dữ liệu lấy UID từ token đã xác minh, không nhận UID từ client. Dữ liệu nằm trong `users/{uid}`. Firestore Rules từ chối toàn bộ đọc/ghi trực tiếp từ client; chỉ Admin SDK trên backend truy cập được. API trả `Cache-Control: no-store`.

| Collection dưới `users/{uid}` | Mục đích |
| --- | --- |
| `contents` | Nội dung gốc, tiêu đề, gợi ý, nhóm |
| `groups` | Chủ đề và bộ sưu tập |
| `sessions` | Bản chụp nội dung và tùy chọn cho phiên luyện, hạn 1 giờ |
| `attempts` | Đáp án, bản gốc sau chấm, alignment, điểm, ngày |
| `mistakes` | Một bản ghi cho mỗi nội dung cần ôn |
| `stats/total` | Tổng số lượt, tổng điểm, số lượt hoàn hảo |
| `days/{YYYY-MM-DD}` | Số lượt và tổng điểm theo ngày |
| `profile/settings` | Tùy chọn cá nhân |

Một transaction Firestore lưu kết quả, cập nhật thống kê và danh sách bài sai. ID phiên chính là ID kết quả: gửi trùng hoặc gửi đồng thời không tăng thống kê nhiều lần. Nội dung đã xóa không thể nộp thêm kết quả từ phiên cũ. Lịch sử giữ bản chụp để việc sửa/xóa nội dung không thay đổi kết quả đã chấm. Phiên hết hạn bị từ chối; phiên đã chấm được xóa. Phiên bỏ dở còn lại có thể được dọn theo chính sách vận hành (trường `expiresAt` hiện là milliseconds, không phải TTL timestamp).

**Ranh giới đáp án:** danh sách nội dung và API bắt đầu luyện chỉ trả metadata. `GET /contents/:id/edit` trả nội dung gốc cho tính năng sửa nội dung do chính người dùng sở hữu. Màn hình Practice không gọi endpoint editor và không giữ text gốc trong state trước chấm. Đây là ứng dụng tự luyện với thư viện cá nhân, không phải hệ thống thi chống gian lận: người sở hữu vẫn có thể mở editor hoặc lịch sử cũ để xem nội dung.

## REST API

Ngoại trừ `/api/health`, tất cả yêu cầu `Authorization: Bearer <Firebase ID token>`. JSON body giới hạn 32 KB; lỗi trả `{ "error": "..." }`.

| Method | Route (prefix `/api`) | Mục đích |
| --- | --- | --- |
| GET | `/contents?type=&q=&topicId=&collectionId=` | Danh sách metadata; tìm tiêu đề/gợi ý |
| POST | `/contents` | Tạo `{title,type,text,hint,topicId,collectionId}` |
| GET | `/contents/:id/edit` | Nội dung dành riêng cho editor |
| PUT / DELETE | `/contents/:id` | Sửa / xóa nội dung |
| GET / POST | `/groups` | Liệt kê / tạo `{name,kind}` |
| PUT / DELETE | `/groups/:id` | Đổi tên / xóa nhóm, giữ nội dung |
| GET / PUT | `/settings` | Đọc / lưu cài đặt |
| POST | `/practice` | Tạo phiên `{contentId,options:{ignoreCase,ignorePunctuation}}` |
| POST | `/practice/:id/check` | Nộp `{answer}`, nhận điểm và bản gốc |
| GET | `/history?cursor=` | Lịch sử 20 lượt, `nextCursor` |
| GET | `/mistakes` | Bài chưa đạt 100% ở lần nộp gần nhất |
| GET | `/statistics` | Tổng hợp, 90 ngày hoạt động gần nhất |

## Cách chấm điểm

Word-level Levenshtein, chi phí thay/thêm/bớt một từ đều bằng 1; truy ngược ma trận để tạo `correct`, `incorrect`, `missing`, `extra`. Khi có nhiều alignment tối ưu, ưu tiên đường chéo, rồi thiếu, rồi thừa. Hiển thị từ nguyên bản để người học thấy đúng chỗ cần sửa.

```text
score = round(100 × max(0, 1 − editDistance / referenceWordCount))
```

Ví dụ `I like cats` → `I like dogs`: 67%; `I really like tea` → `I like tea`: 75%. Từ thừa bị trừ điểm; điểm không âm. Trường hợp bản gốc chuẩn hóa rỗng được kiểm tra phòng thủ trong thuật toán; API không cho lưu nội dung chỉ có dấu câu.

Token chia theo khoảng trắng, chuẩn hóa Unicode NFKC; nếu bật tùy chọn thì xóa ký tự Unicode punctuation trong từng token (`it's` → `its`, `well-known` → `wellknown`) và bỏ token rỗng; case-insensitive chuyển lowercase tiếng Anh. Không tách hyphen thành hai từ. Giới hạn 500 từ và 8.000 ký tự để giới hạn tài nguyên O(n×m).

## Giới hạn vận hành

- Danh sách thư viện/nhóm hiện tải toàn bộ theo người dùng, phù hợp thư viện cá nhân; lịch sử có phân trang, thống kê dùng bộ đếm transaction. Thư viện rất lớn nên bổ sung phân trang và chỉ mục tìm kiếm chuyên dụng.
- Xóa nhóm dọn các tham chiếu theo batch. Nếu có chỉnh sửa đồng thời từ nhiều thiết bị, thao tác tạo/sửa nội dung và xóa nhóm chưa được khóa chung; có thể còn ID nhóm đã xóa (UI hiển thị Unassigned).
- `maxInstances: 10`, giới hạn payload/từ và xác minh token được bật. Chưa có quota riêng từng tài khoản hoặc App Check; nên bổ sung khi mở đăng ký quy mô lớn.
- Ngày hoạt động là 90 ngày có dữ liệu gần nhất, không phải chuỗi streak. Đổi múi giờ chỉ áp dụng lượt luyện mới.
- UI dùng tiếng Anh cho môi trường học; gợi ý hỗ trợ tiếng Việt và Unicode.

Xem `VERIFICATION.md` để biết các kiểm tra thực sự đã chạy trong môi trường bàn giao.
