# Đưa ListenFlow lên mạng miễn phí

Phương án đã chọn: **Firebase Spark + Render Free**. Firebase giữ Authentication, Firestore và Hosting; Node.js Express chạy trên Render. Không triển khai Cloud Functions và không cần bật Blaze cho phương án này.

Project đã tạo: `listenflow-english-20261117`.

- [Firebase Console](https://console.firebase.google.com/project/listenflow-english-20261117/overview)
- Firestore: database `(default)`, Singapore `asia-southeast1`, free tier.
- Email/Password và domain `listenflow-english-20261117.web.app` / `.firebaseapp.com` đã cấu hình.
- Firestore Rules chặn truy cập trực tiếp từ frontend đã được deploy.

## 1. Tạo tài khoản và repository GitHub

1. Mở https://github.com/signup, tạo tài khoản và xác minh email.
2. Mở https://github.com/new.
3. Repository name: `listenflow`. Chọn **Private**.
4. Chưa chọn tạo README, `.gitignore` hoặc license vì dự án đã có mã nguồn.
5. Bấm **Create repository**, sao chép URL dạng `https://github.com/TEN_CUA_BAN/listenflow` và gửi URL đó cho tôi để tiếp tục đưa mã nguồn lên.

Repository Git riêng đã được khởi tạo trong thư mục dự án. Không chạy `git add` ở thư mục người dùng hoặc Desktop. Những tệp `.env*.local`, `.local/`, khóa Firebase, `node_modules/` và `dist/` phải được giữ ngoài Git. Không chỉnh trực tiếp `dist/index.html`; Vite tạo lại tệp này khi build.

## 2. Tạo tài khoản Render

1. Mở https://dashboard.render.com/register.
2. Chọn đăng nhập bằng GitHub, xác minh tài khoản nếu Render yêu cầu.
3. Khi kết nối repository, chỉ cấp quyền cho repository `listenflow` nếu có lựa chọn **Only select repositories**.
4. Chọn **New → Web Service**, kết nối repository `listenflow` sau khi đã push mã nguồn.

Điền các trường sau:

| Trường | Giá trị |
| --- | --- |
| Name | `listenflow-api` |
| Region | Singapore |
| Branch | `main` |
| Root Directory | `functions` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |
| Health Check Path | `/api/health` |

`render.yaml` cũng có sẵn nếu bạn dùng Blueprint. Hướng dẫn Web Service phía trên giúp thấy rõ gói **Free** trước khi tạo dịch vụ. Không chọn dịch vụ trả phí nếu muốn giữ phương án miễn phí.

## 3. Cấu hình bí mật backend trên Render

Backend cần một service account Google để truy cập Firestore và xác minh trạng thái tài khoản Firebase. Service account dùng riêng cho backend: `listenflow-render@listenflow-english-20261117.iam.gserviceaccount.com`; các quyền cần thiết là **Cloud Datastore User** (`roles/datastore.user`) và **Firebase Authentication Viewer** (`roles/firebaseauth.viewer`). Không cấp Owner hoặc Editor.

Sau khi service account đã được tạo:

1. Mở [IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=listenflow-english-20261117).
2. Chọn `listenflow-render` → **Keys → Add key → Create new key → JSON**.
3. Google tải tệp JSON về máy. Mở tệp trên máy và dán toàn bộ nội dung vào biến `FIREBASE_SERVICE_ACCOUNT_JSON` trong **Environment** của Render. Không gửi JSON vào chat, không đưa vào GitHub và không đặt biến này trong bất kỳ biến `VITE_*` nào.
4. Thêm các biến còn lại trong bảng dưới đây, rồi deploy.

| Environment variable | Giá trị |
| --- | --- |
| `NODE_VERSION` | `22.22.0` |
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `listenflow-english-20261117` |
| `ALLOWED_ORIGINS` | `https://listenflow-english-20261117.web.app,https://listenflow-english-20261117.firebaseapp.com` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Nội dung JSON bí mật vừa tải |

Không thêm `FIREBASE_AUTH_EMULATOR_HOST` hoặc `FIRESTORE_EMULATOR_HOST` trên Render. `PORT` do Render tự cung cấp.

Đợi Render báo **Live**, rồi mở `https://TEN_DICH_VU.onrender.com/api/health`. Kết quả đúng là `{"ok":true}`. Gửi URL dịch vụ thực tế cho tôi để nối frontend; tên miền có thể có hậu tố do Render cấp.

## 4. Deploy giao diện lên Firebase Hosting

Tệp `.env.production.local` đã có cấu hình public Firebase thật. Chỉ cần điền URL Render thực tế:

```dotenv
VITE_API_BASE_URL=https://TEN_DICH_VU.onrender.com/api
```

Giữ `VITE_USE_EMULATORS=false` trong tệp production. Tệp `.env.local` vẫn dùng emulator cho `npm run dev`.

Chạy từ thư mục `C:\Users\user\Desktop\Learn_English`:

```powershell
npm test
npm run deploy:spark
```

Lệnh này build lại và chỉ deploy **Hosting + Firestore Rules**, không deploy Functions. Predeploy sẽ từ chối nếu thiếu URL Render, đang bật emulator, build cũ hoặc health check backend thất bại.

Sau khi Firebase báo deploy thành công, mở https://listenflow-english-20261117.web.app. URL này là địa chỉ dự kiến; chỉ có ứng dụng sau khi bước deploy Hosting hoàn tất.

## 5. Kiểm tra sau deploy

Đăng ký một tài khoản mới trên website thật, thêm một câu có gợi ý, luyện sai rồi luyện đúng. Kiểm tra History, Review Mistakes và Statistics. Các tài khoản/dữ liệu trong emulator không tự chuyển lên Firebase thật.

Nếu gặp lỗi:

- **Render chưa Live:** xem Logs, kiểm tra các biến môi trường và JSON service account.
- **403 Origin is not allowed:** thêm đúng domain website đang mở vào `ALLOWED_ORIGINS` trên Render.
- **auth/operation-not-allowed:** kiểm tra Email/Password trong Firebase Authentication.
- **permission-denied khi API gọi Firestore:** kiểm tra hai IAM roles của service account và project trong JSON.
- **Lần đầu tải chậm:** Render Free có thể đang khởi động lại sau thời gian không dùng.

Gói miễn phí vẫn có hạn mức. Render Free ngủ sau 15 phút không nhận truy cập và có thể cần khoảng một phút để khởi động lại; workspace có 750 giờ instance miễn phí/tháng. Firebase Spark có giới hạn sử dụng riêng. Nguồn: [Render Free](https://render.com/docs/free), [Firebase pricing](https://firebase.google.com/pricing).
