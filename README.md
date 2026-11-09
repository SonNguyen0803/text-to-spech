# 🎙️ VocalFlow AI - Trình Chuyển Đổi Văn Bản Thành Giọng Nói (Text-to-Speech Web Widget)

> Ứng dụng web widget hiện đại, tương tác đa nguồn giọng đọc (Offline Web Speech, Google TTS Free, Hugging Face AI Neural & ElevenLabs Studio) với giao diện Glassmorphism sang trọng, bộ đếm thời gian thực và trình mô phỏng sóng âm sinh động.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🎨 Giao diện Người dùng Hiện đại (UI/UX)
- **Thiết kế Glassmorphism & Dashboard sạch sẽ**: Hiệu ứng kính mờ thời thượng, bóng mờ tinh tế và gradient phát sáng.
- **Chế độ Sáng/Tối (Dark/Light Mode)**: Chuyển đổi mượt mà với 1 nút bấm, tự động ghi nhớ sở thích người dùng qua `localStorage` và phát hiện `prefers-color-scheme`.
- **Thống kê thời gian thực**:
  - Đếm chính xác số ký tự.
  - Đếm số lượng từ.
  - Ước tính thời gian đọc dựa trên tốc độ đọc thực tế (`Rate`).
- **Responsive hoàn hảo**: Tối ưu trên cả màn hình máy tính để bàn (Desktop), máy tính bảng (Tablet) và điện thoại di động (Mobile).

### 2. ⚡ Đa Nguồn Giọng Đọc (Multi-Source TTS Engine)
Ứng dụng tích hợp liền mạch 4 công nghệ tổng hợp giọng nói:
1. **Web Speech API (`window.speechSynthesis`)**:
   - Chạy 100% ngoại tuyến (Offline), không tốn dữ liệu mạng, không có độ trễ.
   - Tự động quét và phân nhóm giọng đọc có sẵn trên thiết bị (Tiếng Việt như Microsoft HoaiMy, Google Tiếng Việt; Tiếng Anh; Tiếng Nhật; Tiếng Hàn...).
   - Đã xử lý triệt để lỗi giới hạn 15 giây tự ngắt của trình duyệt Chrome/Edge thông qua cơ chế phân đoạn câu tự nhiên (`chunking`) và `keep-alive`.
2. **Google Translate TTS (Miễn phí 100% - Không cần API Key)**:
   - Chất lượng phát âm tự nhiên, hỗ trợ hơn 50 ngôn ngữ.
   - Hỗ trợ trực tiếp văn bản dài bằng giải thuật chia đoạn thông minh.
   - Cho phép tải về tệp âm thanh `.mp3` trực tiếp.
3. **Hugging Face Inference API (Mô hình AI Neural TTS)**:
   - Tích hợp các mô hình AI mã nguồn mở chất lượng cao: `facebook/mms-tts-vie` (Meta MMS Tiếng Việt), `facebook/mms-tts-eng`, `kakao-enterprise/vits-ljspeech`...
   - Xử lý mượt mà trạng thái khởi động mô hình (Cold Start 503) với thông báo đếm ngược thân thiện.
   - Xuất tệp âm thanh định dạng `.wav`.
4. **ElevenLabs Voice Studio (Tùy chọn nâng cao)**:
   - Cho phép người dùng kết nối API Key cá nhân để tận hưởng chất lượng giọng đọc siêu chân thực chuẩn phòng thu với mô hình `eleven_multilingual_v2`.

### 3. 🎛️ Bảng Điều Khiển Âm Thanh Trực Quan
- **Thanh trượt Cao độ (Pitch)**: 0.5 (Trầm) đến 1.5 (Bổng).
- **Thanh trượt Tốc độ (Speed / Rate)**: 0.5x (Chậm) đến 2.0x (Nhanh).
- **Thanh trượt Âm lượng (Volume)**: 0% đến 100%.
- Hiển thị thông số dạng số thực trực tiếp khi kéo trượt và nút "Đặt lại" (Reset) tiện lợi.

### 4. 🎬 Xưởng Xuất Video Tự Động (Video Export Studio) - MỚI!
- **Kết xuất Video chuẩn MP4 / WebM**:
  - Hỗ trợ 2 tỉ lệ khung hình: **16:9 Ngang** (YouTube, Facebook, Web) và **9:16 Dọc** (TikTok, Douyin, Instagram Reels, YouTube Shorts).
- **Chèn Hình nền & Video Nền Đa Nền Tảng Linh Hoạt**:
  - **Chèn Video nền từ mạng xã hội**: Tự động bóc tách và giải mã video nền chất lượng cao từ **Facebook** (Reels, Watch, Post), **Douyin (抖音)**, **TikTok** và **YouTube** (Shorts / Video) hoặc link MP4/WebM trực tiếp.
  - Tự động nhận diện và trích xuất URL ngay cả khi người dùng dán toàn bộ văn bản chia sẻ từ ứng dụng điện thoại.
  - Cơ chế **Proxy Stream tự động** vượt qua kiểm duyệt CORS và chống chặn Referer từ máy chủ CDN.
  - Tự động loại bỏ hoàn toàn âm thanh gốc của video nền để chuẩn bị lồng giọng đọc TTS và nhạc nền chất lượng cao.
  - Cho phép người dùng **tải tệp video nền từ máy tính** (`.mp4`, `.webm`, `.mov`).
  - 4 Preset đồ họa cao cấp: Hoàng hôn tím cam (Sunset), Đêm Cyberpunk neon, Căn phòng Lo-Fi studio, Gradient sâu lắng.
  - Tùy chọn tải ảnh nền tùy chỉnh từ máy tính (`.jpg`, `.png`, `.webp`) với hiệu ứng phóng to mượt mà (Ken Burns effect).
- **Lồng Nhạc Nền (Background Music - BGM)**:
  - Tự động tổng hợp nhạc nền phong cách **Lo-Fi Chill**, **Piano Cảm xúc**, **Thiền định (Ambient)** bằng Web Audio API ngay trong trình duyệt.
  - Hỗ trợ người dùng **tải file nhạc riêng từ máy tính** (`.mp3`, `.wav`).
  - Thanh trượt điều chỉnh âm lượng nhạc nền riêng biệt (5% - 50%) để giọng đọc luôn rõ ràng, nổi bật.
- **Hiệu ứng đồ họa sống động**:
  - Sóng âm thanh Neon Audio Waveform chuyển động theo biên độ giọng nói thực tế.
  - Hiển thị phụ đề chữ (Subtitles) nổi bật trên hộp kính mờ tự động canh dòng.

### 5. 🌊 Visualizer Sóng Âm, Lịch Sử & Tải Tệp Âm Thanh
- **Audio-Reactive Canvas Visualizer**:
  - Khi phát âm thanh từ tệp API (Google / Hugging Face / ElevenLabs): Kết nối trực tiếp với `Web Audio API AnalyserNode` để vẽ tần số âm thanh thực tế.
  - Khi phát âm thanh Web Speech API: Chuyển sang thuật toán mô phỏng nhịp điệu sinh động với gradient đa sắc.
- **Tải xuống tệp âm thanh (.mp3 / .wav)**: Nhấp một chạm để lưu file âm thanh về máy.
- **Lịch sử tệp âm thanh (Audio History Tray)**: Lưu trữ các bản ghi gần đây trong phiên, hỗ trợ nghe lại và tải lại 1-click.
- **Nhập bằng giọng nói (Mic)**: Hỗ trợ Speech-to-Text đọc chính tả trực tiếp vào ô văn bản.
- **Văn bản mẫu (Templates)**: Cung cấp sẵn các mẫu văn bản phong phú (Tin tức AI, Đoạn văn truyền cảm, Lời thoại quảng cáo, Hội thoại tiếng Anh...).
- **Hệ thống Toast Notification**: Thông báo trạng thái thao tác rõ ràng, trang nhã.

---

## 🚀 Hướng Dẫn Cài Đặt & Sử Dụng

### Khởi chạy nhanh (Không cần cài đặt gì thêm)
Vì dự án được xây dựng hoàn toàn bằng **HTML, Tailwind CSS (CDN) và JavaScript thuần (Vanilla JS)**, bạn chỉ cần mở trực tiếp tệp `index.html` trong bất kỳ trình duyệt nào:

1. Mở thư mục dự án: `d:\personal\text-to-spech\`
2. Nhấp đúp chuột vào tệp `index.html` (hoặc kéo thả vào Chrome / Edge / Firefox / Safari).
3. Hoặc khởi chạy bằng một máy chủ tĩnh nhẹ (Live Server, http-server hoặc Python):
   ```powershell
   # Dùng Python:
   python -m http.server 3000
   
   # Dùng Node.js (nếu có npx):
   npx serve .
   ```
4. Truy cập: `http://localhost:3000`

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
d:\personal\text-to-spech\
├── index.html            # Giao diện chính của ứng dụng widget
├── css/
│   └── styles.css        # Hiệu ứng Glassmorphism, animations và thanh trượt
├── js/
│   ├── templates.js      # Kho văn bản mẫu thử nghiệm phong phú
│   ├── visualizer.js     # Trình trực quan hóa sóng âm thanh (Canvas Audio Visualizer)
│   ├── video-exporter.js # Xưởng kết xuất Video kèm lồng nhạc nền và hình nền
│   ├── tts-engine.js     # Động cơ điều phối đa nguồn giọng đọc (Multi-source Engine)
│   └── app.js            # Xử lý sự kiện giao diện, bộ đếm, Toast & Cài đặt
└── README.md             # Tài liệu hướng dẫn sử dụng và tích hợp
```

---

## 🔐 Cấu Hình API Key (Tùy chọn)

Để sử dụng các dịch vụ AI mở rộng, bấm vào nút **"Cài đặt API"** ở góc trên bên phải màn hình:
- **Hugging Face Token**: Lấy token đọc miễn phí tại [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) để tăng giới hạn truy vấn các mô hình Meta MMS TTS.
- **ElevenLabs API Key**: Nhập key từ [elevenlabs.io](https://elevenlabs.io) nếu bạn muốn trải nghiệm giọng đọc phòng thu.
- **Bảo mật**: Khóa được lưu trực tiếp tại trình duyệt (`localStorage`) của bạn, không gửi qua máy chủ thứ ba.

---

## 🧩 Hướng Dẫn Tích Hợp Vào Dự Án Khác (Widget Embed)

Bạn có thể dễ dàng nhúng widget này vào bất kỳ website WordPress, Landing Page hoặc ứng dụng React/Vue:

### Nhúng dạng iFrame:
```html
<iframe 
  src="https://your-domain.com/text-to-speech/" 
  width="100%" 
  height="680px" 
  style="border: none; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);"
></iframe>
```

---

## 📜 Giấy Phép & Bản Quyền
Dự án được phát hành dưới giấy phép mã nguồn mở MIT License. Tự do tùy biến và tích hợp vào các dự án thương mại hoặc cá nhân.

