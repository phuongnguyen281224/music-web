# Ứng dụng Nghe nhạc Chung (Music Room)

Đây là một ứng dụng web cho phép mọi người tạo phòng và nghe nhạc cùng nhau từ YouTube, được xây dựng với Next.js và Firebase Realtime Database.

## Tính năng

-   Tạo phòng nghe nhạc riêng.
-   Đồng bộ trạng thái phát nhạc (Play, Pause, Seek) giữa các người dùng trong phòng.
-   Người tạo phòng có quyền điều khiển playback.
-   Giao diện người dùng tiếng Việt.

## Yêu cầu

-   Node.js (phiên bản 18 trở lên được khuyến nghị)
-   npm hoặc yarn

## Hướng dẫn Cài đặt

### 1. Sao chép mã nguồn

```bash
git clone <đường-dẫn-repo-của-bạn>
cd <tên-thư-mục>
```

### 2. Cài đặt các gói phụ thuộc

```bash
npm install
# hoặc
yarn install
```

### 3. Cấu hình Firebase

Để ứng dụng hoạt động, bạn cần thiết lập một dự án Firebase:

1.  Truy cập [Firebase Console](https://console.firebase.google.com/).
2.  Tạo một dự án mới.
3.  Trong trang tổng quan dự án, thêm một ứng dụng web (**Web App**).
4.  Sao chép các thông tin cấu hình (firebaseConfig) được cung cấp.
5.  Vào mục **Realtime Database** ở menu bên trái:
    -   Tạo một cơ sở dữ liệu (Database) mới.
    -   Chọn vị trí (location) cho database.
    -   Trong tab **Rules**, cập nhật quy tắc để cho phép đọc/ghi (Lưu ý: Chỉ dùng cho môi trường phát triển):

    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```

### 4. Thiết lập Biến môi trường

Tạo một tệp `.env.local` tại thư mục gốc của dự án, dựa trên tệp mẫu `.env.example`:

```bash
cp .env.example .env.local
```

Mở tệp `.env.local` và điền các thông tin từ cấu hình Firebase bạn đã lấy ở bước 3:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Chạy ứng dụng

Khởi động máy chủ phát triển:

```bash
npm run dev
# hoặc
yarn dev
```

Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt để bắt đầu sử dụng.

## Cấu trúc thư mục

-   `app/`: Mã nguồn chính của ứng dụng Next.js (App Router).
-   `lib/`: Các thư viện tiện ích, bao gồm cấu hình Firebase (`firebase.ts`).
-   `public/`: Các tệp tĩnh.

## Lưu ý

-   Dự án sử dụng `localStorage` để xác định quyền chủ phòng (Host).
-   Hãy đảm bảo Realtime Database URL trong file `.env.local` là chính xác.
