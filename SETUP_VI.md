# 🎵 Hướng Dẫn Setup Music Web App

Dự án này đã được chuẩn bị sẵn sàng để chạy! Hãy làm theo các bước dưới đây.

## ✅ Trạng Thái Hiện Tại
- ✓ Tất cả dependencies đã được cài đặt
- ✓ Project đã được build thành công
- ✓ Cấu hình Next.js hoàn chỉnh
- ⏳ Cần cấu hình Firebase (tùy chọn - ứng dụng vẫn chạy mà không Firebase)

---

## 🚀 Cách Chạy Ứng Dụng

### Tùy Chọn 1: Sử Dụng Script Tự Động
```bash
./setup-and-run.sh
```

### Tùy Chọn 2: Chạy Thủ Công
```bash
# Chế độ phát triển
npm run dev

# Hoặc: Build và chạy production
npm run build
npm start
```

Ứng dụng sẽ có sẵn tại: **http://localhost:3000**

---

## 🔥 Cấu Hình Firebase (Tùy Chọn)

Nếu bạn muốn sử dụng đầy đủ tính năng (real-time sync giữa các người dùng):

### 1. Tạo Dự Án Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Bấm "Create Project" hoặc "Add Project"
3. Nhập tên dự án và tạo

### 2. Thêm Web App
1. Trong trang tổng quan, bấm biểu tượng web (</>) để thêm Web App
2. Đặt tên cho ứng dụng
3. Sao chép file `firebaseConfig` được cung cấp

### 3. Thiết Lập Realtime Database
1. Vào **Build** → **Realtime Database**
2. Bấm **Create Database**
3. Chọn vị trí địa lý gần nhất
4. Chọn chế độ **Start in test mode** (để chạy ngay)
5. Sau đó, vào tab **Rules** và cập nhật:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ **Lưu ý**: Quy tắc trên chỉ dùng cho phát triển. Với production, hãy thiết lập quy tắc bảo mật phù hợp.

### 4. Cấu Hình Biến Môi Trường
Sao chép các giá trị từ Firebase vào file `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=music-app-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://music-app-xxxxx.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=music-app-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=music-app-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...
```

### 5. Khởi động lại ứng dụng
```bash
npm run dev
```

---

## 📋 Các Lệnh Có Sẵn

```bash
npm run dev       # Chạy chế độ phát triển (hot reload)
npm run build     # Build production
npm start         # Chạy production
npm run lint      # Kiểm tra linting
```

---

## 🎯 Tính Năng

- ✅ Tạo phòng nghe nhạc chung
- ✅ Phát YouTube video và đồng bộ giữa người dùng
- ✅ Điều khiển Play/Pause/Seek realtime
- ✅ Giao diện tiếng Việt
- ✅ Responsive design

---

## 🐛 Troubleshooting

### Cổng 3000 đã bị chiếm dụng
```bash
npm run dev -- -p 3001  # Chạy ở cổng khác
```

### Module không tìm thấy
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build lỗi
```bash
npm run lint  # Kiểm tra linting
npm run build # Build lại
```

---

## 📚 Cấu Trúc Dự Án

```
music-web/
├── app/                 # Next.js App Router
│   ├── components/     # React components
│   ├── room/           # Dynamic route: /room/[id]
│   ├── page.tsx        # Trang chủ
│   └── layout.tsx      # Layout chung
├── lib/
│   └── firebase.ts     # Firebase configuration
├── public/             # Static files
├── .env.local          # Environment variables
├── package.json        # Dependencies
└── tailwind.config.ts  # Tailwind CSS config
```

---

## ✨ Bây Giờ Bạn Đã Sẵn Sàng!

```bash
npm run dev
```

Truy cập **http://localhost:3000** và bắt đầu tạo phòng nghe nhạc! 🎵
