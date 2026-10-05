# LiveQR Landing — liveqr.me

Landing page marketing cho **LiveQR** (nền tảng donate VietQR non-custodial cho streamer Việt).
HTML/CSS/JS thuần — không build tool, không dependency.

| File | Vai trò |
|---|---|
| `index.html` | Toàn bộ nội dung trang (tiếng Việt) |
| `styles.css` | Design system (brand token đồng bộ với app: `#0b0d13`, tím `#9b7cff`, xanh `#5ee5a2`, DM Sans + Space Grotesk) |
| `demo.js` | Demo tương tác: donate → alert overlay, hàng đợi, TTS, đọc bình luận TikTok Live (chỉ phát âm thanh), kiểm duyệt tiếng Việt |
| `script.js` | Menu mobile, FAQ accordion, scroll-reveal, header |
| `huong-dan/index.html` | Trang hub danh sách tất cả bài hướng dẫn |
| `favicon.svg`, `robots.txt`, `sitemap.xml`, `og-image.png`, `llms.txt` | Meta/SEO — `og-image.png` là ảnh share 1200×630, `llms.txt` là bản tóm tắt cho AI crawler (ChatGPT, Claude, Perplexity), `robots.txt` cho phép rõ ràng các AI bot |

## Xem local

```bash
cd liveqr-landing
python3 -m http.server 4173
# mở http://localhost:4173
```

(Mở thẳng `index.html` cũng chạy, nhưng nên qua HTTP để đúng môi trường deploy.)

## Deploy lên Cloudflare Pages → liveqr.me

1. Đẩy repo này lên GitHub (repo riêng, ví dụ `liveqr-landing`).
2. Vào [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo.
3. Cấu hình build:
   - **Framework preset**: `None`
   - **Build command**: *(để trống)*
   - **Build output directory**: `/`
4. **Save and Deploy**. Sau deploy xong sẽ có URL `*.pages.dev`.
5. Vào **Custom domains** của project → **Set up a custom domain** → nhập `liveqr.me`.
   DNS liveqr.me đang quản lý ở Cloudflare nên bản ghi CNAME sẽ được tự thêm, HTTPS tự cấp.

## Chỉnh sửa nội dung thường gặp

- **Số Zalo / điện thoại**: tìm & thay `84394675935` (link `zalo.me`) và `0394675935` (`tel:`) trong `index.html`.
- **Mức phí**: khi chốt số cụ thể, sửa cột "LiveQR" trong bảng so sánh (section `#compare`) và section `#pricing`.
- **Dữ liệu đối thủ**: các số liệu WeScan/Zypage/PlayerDuo/Unghotoi/Gank cập nhật tháng 9/2026 — nên kiểm tra lại trước các chiến dịch lớn; nguồn ghi trong footnote của bảng.
- **Từ khóa kiểm duyệt trong demo**: mảng `BAD_TOKENS` / `BAD_PHRASES` trong `demo.js`.
- **Tên & bình luận TikTok giả lập trong demo**: mảng `TT_NAMES` / `TT_COMMENTS` trong `demo.js`.
- **Demo để 4 quà tặng tiêu biểu** (mảng `GIFTS` trong `demo.js`) — catalog đầy đủ 7 quà nằm trong app. Widget tương tác (vòng quay, bình chọn) không có trong demo nhưng vẫn là tính năng của app.

## Ghi chú

- Bảng so sánh dùng số liệu **công khai** của các nền tảng (website chính thức, hướng dẫn dùng, thỏa luận cộng đồng) — có footnote ghi nguồn & thời điểm; cần giữ disclaimer để tránh tranh chấp.
- Demo hoàn toàn client-side: không gọi API, không thu thập dữ liệu người xem.
- **TTS trong demo là giả lập** (hiệu ứng chữ chạy + trạng thái "đang đọc" + âm thanh WebAudio) — không dùng Web Speech API; độ dài mỗi lượt đọc tính theo độ dài lời nhắn/bình luận. Trên app thật TTS là giọng đọc tiếng Việt thật.
- Demo đọc bình luận TikTok cũng là giả lập: bình luận **không hiện lên overlay** (đúng như app thật — chỉ phát âm thanh), overlay chỉ có badge "đang đọc" kèm số bình luận đang chờ; bình luận vi phạm từ điển kiểm duyệt sẽ bị chặn giống donate.
- Trình duyệt chỉ cho phát âm sau lần click đầu tiên của người dùng (chính sách autoplay) — nút **Donate ngay** / **Gửi bình luận** chính là cú click mở khoá đó.
