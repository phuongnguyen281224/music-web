# Ứng dụng Nghe nhạc Chung (Music Room)

Đây là một ứng dụng web cho phép mọi người tạo phòng và nghe nhạc cùng nhau từ YouTube, được xây dựng với Next.js và Firebase Realtime Database. Ứng dụng hỗ trợ đồng bộ trạng thái phát nhạc, chat thời gian thực, và giao diện tùy chỉnh.

## Tính năng

### Nghe nhạc chung
- **Đồng bộ hóa:** Trạng thái phát (Play, Pause, Seek) được đồng bộ giữa tất cả người dùng trong phòng.
- **Hàng đợi:** Người dùng có thể thêm bài hát vào hàng đợi. Host và người tham gia đều có quyền thêm bài.
- **Tìm kiếm YouTube:** Tìm kiếm video trực tiếp từ YouTube và thêm vào hàng đợi hoặc phát ngay.
- **Auto-play:** Tự động phát bài tiếp theo trong hàng đợi khi bài hiện tại kết thúc.

### Chat & Tương tác
- **Chat thời gian thực:** Gửi tin nhắn cho mọi người trong phòng.
- **Nhận diện người dùng:** Đặt tên hiển thị và màu sắc tin nhắn riêng.
- **Thông báo:** Hiển thị thông báo khi có tin nhắn mới (kèm âm thanh nếu không đang xem tab chat).
- **Danh sách thành viên:** Xem ai đang online trong phòng.

### Tùy chỉnh Giao diện
- **Mobile-First:** Giao diện tối ưu cho thiết bị di động với thanh điều hướng dưới cùng để chuyển đổi giữa Nhạc và Chat.
- **Hình nền Chat:** Người dùng có thể tải lên ảnh nền cho khung chat, điều chỉnh độ mờ (blur) và độ tối (overlay). Cài đặt này được đồng bộ cho tất cả mọi người trong phòng.

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

### 3. Cấu hình Firebase & YouTube API

Tạo một tệp `.env.local` tại thư mục gốc của dự án, dựa trên tệp mẫu (nếu có) hoặc tạo mới với các nội dung sau:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# YouTube Data API v3 Key (Cho chức năng tìm kiếm)
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
```

**Lưu ý:**
- Để có `NEXT_PUBLIC_YOUTUBE_API_KEY`, bạn cần tạo dự án trên Google Cloud Console và kích hoạt YouTube Data API v3.
- Cấu hình Firebase Realtime Database Rules nên được đặt là public cho môi trường development:
    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```

### 4. Chạy ứng dụng

Khởi động máy chủ phát triển:

```bash
npm run dev
# hoặc
yarn dev
```

Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt để bắt đầu sử dụng.

## Hướng dẫn Sử dụng

1.  **Trang chủ:** Nhấn "Tạo Phòng Mới" để tạo phòng hoặc nhập mã phòng để tham gia phòng có sẵn.
2.  **Giao diện Phòng:**
    -   **Nhạc (Music Panel):** Dán link YouTube vào ô input để phát hoặc thêm vào hàng đợi. Sử dụng thanh tìm kiếm để tìm bài hát.
    -   **Chat (Chat Panel):** Nhấn vào biểu tượng Chat (trên mobile) hoặc nhìn sang cột bên phải (trên desktop) để chat.
    -   **Cài đặt:** Nhấn biểu tượng bánh răng trong khung chat để đổi hình nền, màu sắc.
    -   **Đổi tên:** Nhấn biểu tượng bút chì để đổi tên hiển thị của bạn.

## Cấu trúc thư mục

-   `app/`: Mã nguồn chính của ứng dụng Next.js (App Router).
    -   `room/[id]/`: Trang chính của phòng nghe nhạc.
    -   `components/`: Các thành phần giao diện (ChatPanel, MobileNav,...).
-   `hooks/`: Các Custom Hooks (`useRoom`, `usePresence`) xử lý logic và kết nối Firebase.
-   `lib/`: Các thư viện tiện ích và cấu hình (`firebase.ts`, `youtube.ts`, `roomService.ts`).
-   `public/`: Các tệp tĩnh.

## Đóng góp

Mọi đóng góp đều được hoan nghênh. Vui lòng tạo Pull Request hoặc mở Issue nếu bạn tìm thấy lỗi.
