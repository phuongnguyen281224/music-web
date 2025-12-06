## 🔥 Thiết Lập Firebase Realtime Database Rules

Dự án của bạn **đã sử dụng Firebase Realtime Database**. Để hoàn toàn hoạt động, bạn cần thiết lập Database Rules.

### 📋 Các Bước Thiết Lập

#### 1. Đăng nhập Firebase Console
- Truy cập [Firebase Console](https://console.firebase.google.com)
- Chọn project `music-box-93e08`

#### 2. Tạo Realtime Database (nếu chưa có)
- Vào **Build** → **Realtime Database**
- Bấm **Create Database**
- Chọn vị trí: `asia-southeast1` (Singpore - gần Việt Nam nhất)
- Chế độ: **Start in test mode**

#### 3. Thiết Lập Database Rules
1. Trong Realtime Database, vào tab **Rules**
2. Xóa rules cũ
3. Copy và paste rules dưới đây:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "messages": {
          "$messageId": {
            ".validate": "newData.hasChildren(['sender', 'text', 'timestamp'])",
            "sender": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50"
            },
            "text": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 500"
            },
            "timestamp": {
              ".validate": "newData.val() === null || newData.isNumber()"
            }
          }
        },
        "videoId": {
          ".validate": "newData.isString()"
        },
        "isPlaying": {
          ".validate": "newData.isBoolean()"
        },
        "timestamp": {
          ".validate": "newData.isNumber()"
        },
        "updatedAt": {
          ".validate": "newData.val() === null || newData.isNumber()"
        }
      }
    }
  }
}
```

4. Bấm **Publish**

### 📊 Cấu Trúc Database

```
rooms/
├── ROOM_ID/
│   ├── videoId: "dQw4w9WgXcQ"
│   ├── isPlaying: true
│   ├── timestamp: 125.5
│   ├── updatedAt: 1701234567890
│   └── messages/
│       ├── message_id_1/
│       │   ├── sender: "Tuan"
│       │   ├── text: "Nhạc hay quá!"
│       │   └── timestamp: 1701234567890
│       └── message_id_2/...
```

### ✅ Khi Nào Ứng Dụng Hoạt Động Hoàn Toàn?

✓ Firebase credentials trong `.env.local` (đã được set)
✓ Realtime Database được tạo (cần làm)
✓ Database Rules được thiết lập (cần làm)

Sau khi hoàn tất, ứng dụng sẽ:
- Tạo và quản lý phòng
- Đồng bộ video playback giữa tất cả người dùng
- Cho phép người tạo phòng điều khiển video
- Hỗ trợ chat real-time
- Lưu trữ tất cả dữ liệu trên Firebase

### 🚀 Khởi Động Lại Ứng Dụng

Sau khi thiết lập xong:

```bash
npm run dev
```

Truy cập: http://localhost:3000
