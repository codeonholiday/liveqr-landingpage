# LiveQR Landing — liveqr.me

Landing page marketing cho **LiveQR** (nền tảng donate VietQR non-custodial cho streamer Việt).
HTML/CSS/JS thuần — không build tool, không dependency.

| File | Vai trò |
|---|---|
| `public/index.html` | Toàn bộ nội dung trang (tiếng Việt) |
| `public/styles.css` | Design system (brand token đồng bộ với app: `#0b0d13`, tím `#9b7cff`, xanh `#5ee5a2`, DM Sans + Space Grotesk) |
| `public/demo.js` | Demo tương tác: donate → alert overlay, hàng đợi, TTS, đọc bình luận TikTok Live (chỉ phát âm thanh), kiểm duyệt tiếng Việt |
| `public/script.js` | Menu mobile, FAQ accordion, scroll-reveal, header |
| `public/huong-dan/index.html` | Trang hub danh sách tất cả bài hướng dẫn |
| `public/favicon.svg`, `public/robots.txt`, `public/sitemap.xml`, `public/og-image.png`, `public/llms.txt` | Meta/SEO — `og-image.png` là ảnh share 1200×630, `llms.txt` là bản tóm tắt cho AI crawler (ChatGPT, Claude, Perplexity), `robots.txt` cho phép rõ ràng các AI bot |
| `worker.js` | Worker Cloudflare: proxy `/@<streamer>` và `/_next/*` → `app.liveqr.me`, còn lại serve static |
| `wrangler.jsonc` | Cấu hình deploy Cloudflare Workers (static assets trong `public/`) |

## Xem local

```bash
cd liveqr-landing
python3 -m http.server 4173 --directory public
# mở http://localhost:4173
```

(Mở thẳng `public/index.html` cũng chạy, nhưng nên qua HTTP để đúng môi trường deploy.)

## Deploy lên Cloudflare Workers → liveqr.me

Repo này deploy qua **Cloudflare Workers Builds** (git integration) — cấu trúc kiểu Workers static assets,
không còn là Pages (Cloudflare đã migrate Pages → Workers, Pages Functions cũ không deploy được nữa):

- `public/` — toàn bộ static site
- `worker.js` + `wrangler.jsonc` — Worker proxy trang donate + binding assets (`ASSETS`)
  (thay cho `functions/_middleware.js`, `_redirects`, `_routes.json` của Pages cũ)

Pipeline: push lên `main` → Cloudflare chạy `wrangler deploy` theo `wrangler.jsonc`
(project `liveqr-landingpage`, custom domain `liveqr.me` gắn sẵn trên project).

Chạy thử môi trường production local (bao gồm cả proxy `/@streamer`):

```bash
npx wrangler dev --port 8799
# mở http://localhost:8799
```

## Chỉnh sửa nội dung thường gặp

- **Số Zalo / điện thoại**: tìm & thay `84394675935` (link `zalo.me`) và `0394675935` (`tel:`) trong `index.html`.
- **Mức phí**: khi chốt số cụ thể, sửa cột "LiveQR" trong bảng so sánh (section `#compare`) và section `#pricing`.
- **Dữ liệu đối thủ**: các số liệu WeScan/Zypage/PlayerDuo/Unghotoi/Gank cập nhật tháng 9/2026 — nên kiểm tra lại trước các chiến dịch lớn; nguồn ghi trong footnote của bảng.
- **Từ khóa kiểm duyệt trong demo**: mảng `BAD_TOKENS` / `BAD_PHRASES` trong `demo.js`.
- **Tên & bình luận TikTok giả lập trong demo**: mảng `TT_NAMES` / `TT_COMMENTS` trong `demo.js`.
- **Demo để 4 quà tặng tiêu biểu** (mảng `GIFTS` trong `demo.js`) — catalog đầy đủ 7 quà nằm trong app. Widget tương tác (vòng quay, bình chọn) không có trong demo nhưng vẫn là tính năng của app.
- **Video demo game (section `#games`)**: cả 2 thẻ game đều gắn clip thật từ TikTok Live (video dọc 9:16 — video chính `contain` ở giữa + `.game-video-bg` làm nền blur), host trên `media.liveqr.me`: thẻ Đua ngựa 3D dùng `https://media.liveqr.me/dua-ngua-3d.webm`, thẻ Ai thông minh hơn lớp 5 dùng `https://media.liveqr.me/quiz-lop5.webm`. Để thay clip khác: đổi `src` của cả 2 phần tử video trong thẻ tương ứng về cùng 1 file (placeholder CSS tự ẩn khi video tải xong, autoplay muted khi cuộn tới, có nút bật tiếng).

## Ghi chú

- Bảng so sánh dùng số liệu **công khai** của các nền tảng (website chính thức, hướng dẫn dùng, thỏa luận cộng đồng) — có footnote ghi nguồn & thời điểm; cần giữ disclaimer để tránh tranh chấp.
- Demo hoàn toàn client-side: không gọi API, không thu thập dữ liệu người xem.
- **TTS trong demo là giả lập** (hiệu ứng chữ chạy + trạng thái "đang đọc" + âm thanh WebAudio) — không dùng Web Speech API; độ dài mỗi lượt đọc tính theo độ dài lời nhắn/bình luận. Trên app thật TTS là giọng đọc tiếng Việt thật.
- Demo đọc bình luận TikTok cũng là giả lập: bình luận **không hiện lên overlay** (đúng như app thật — chỉ phát âm thanh), overlay chỉ có badge "đang đọc" kèm số bình luận đang chờ; bình luận vi phạm từ điển kiểm duyệt sẽ bị chặn giống donate.
- Trình duyệt chỉ cho phát âm sau lần click đầu tiên của người dùng (chính sách autoplay) — nút **Donate ngay** / **Gửi bình luận** chính là cú click mở khoá đó.
