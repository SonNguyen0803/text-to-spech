/**
 * Kho văn bản mẫu (Templates) cho ứng dụng Text-to-Speech
 * Đa dạng các chủ đề: Tin tức, Truyền cảm, Quảng cáo, Tiếng Anh, Thơ ca...
 */

const SAMPLE_TEMPLATES = [
  {
    id: "welcome-vi",
    title: "🇻🇳 Lời chào mừng & Giới thiệu",
    category: "Giới thiệu",
    text: "Chào mừng bạn đến với ứng dụng Chuyển đổi Văn bản thành Giọng nói thông minh. Ứng dụng này hỗ trợ cả giọng đọc trình duyệt ngoại tuyến lẫn các mô hình trí tuệ nhân tạo hiện đại, giúp bạn biến bất kỳ văn bản nào thành âm thanh tự nhiên chỉ trong tích tắc!"
  },
  {
    id: "tech-news",
    title: "📰 Bản tin Công nghệ & AI",
    category: "Tin tức",
    text: "Theo báo cáo mới nhất từ các viện nghiên cứu trí tuệ nhân tạo, công nghệ tổng hợp giọng nói Neural TTS đã đạt bước tiến ngoạn mục. Giờ đây, các mô hình học sâu có khả năng mô phỏng ngữ điệu, hơi thở và nhịp điệu của con người với độ chân thực lên tới 98%."
  },
  {
    id: "literature-vi",
    title: "📖 Đoạn văn truyền cảm hứng",
    category: "Văn học",
    text: "Mỗi sớm mai thức dậy là một món quà vô giá của cuộc sống. Hãy hít một hơi thật sâu, mỉm cười với những thử thách phía trước và bước đi bằng trọn vẹn niềm tin. Thành công không nằm ở điểm đến, mà nằm ở sự kiên trì trên từng chặng đường bạn đi qua."
  },
  {
    id: "commercial-vi",
    title: "🎙️ Lời thoại Quảng cáo sản phẩm",
    category: "Quảng cáo",
    text: "Bạn đang tìm kiếm giải pháp tối ưu cho trải nghiệm âm thanh của mình? Đừng bỏ lỡ chương trình ưu đãi đặc biệt hôm nay: Giảm ngay 30% cho tất cả các thiết bị thông minh thế hệ mới. Đặt hàng ngay bây giờ để nhận quà tặng độc quyền!"
  },
  {
    id: "announcement-vi",
    title: "📢 Thông báo nhà ga / Sân bay",
    category: "Thông báo",
    text: "Kính thưa quý hành khách, chuyến bay mang số hiệu VN 256 khởi hành từ Hà Nội đi Đà Nẵng đã bắt đầu mở cửa lên máy bay tại cổng số 8. Xin mời tất cả hành khách có thẻ lên tàu chuẩn bị hành lý và tiến về cửa số 8. Xin trân trọng cảm ơn!"
  },
  {
    id: "english-intro",
    title: "🇺🇸 English: Natural Conversation",
    category: "English",
    text: "Hello and welcome! This is a state-of-the-art text to speech application designed to turn your written thoughts into lifelike speech. Feel free to adjust the pitch, rate, and volume controls to achieve the perfect listening experience for your audience."
  },
  {
    id: "english-quote",
    title: "🌟 English: Steve Jobs Inspiration",
    category: "English",
    text: "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma, which is living with the results of other people's thinking. Have the courage to follow your heart and intuition. They somehow already know what you truly want to become."
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SAMPLE_TEMPLATES };
}

