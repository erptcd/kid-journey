# Hành Trình Bé Giỏi (kid-journey)

Game 3D cho học sinh lớp 2: trả lời đúng câu hỏi để đón khách lên toa, rồi đi tàu qua các ga thật của Việt Nam.

**Chơi ngay:** https://erptcd.github.io/kid-journey/ (Chrome hoặc Edge, máy tính hoặc máy tính bảng)

## Có gì trong game

- **8 phương tiện:** Tàu hoả Bắc – Nam (19 ga, Hà Nội → Sài Gòn), Metro số 1 TP.HCM (14 ga, 3 ga đầu đi ngầm), Ô tô đón bạn, Taxi chở khách, Xe tải chở đặc sản, Xe cảnh sát, Xe cứu thương, Xe cứu hoả (đèn ưu tiên nhấp nháy, còi hú).
- **Âm thanh khi chạy:** tàu hoả xình xịch và tiếng bánh sắt qua mối ray, metro rít động cơ điện, ô tô/taxi/xe tải tiếng máy theo tốc độ, xe tải xả phanh hơi khi dừng, xe ưu tiên hú còi. Âm thanh tạo bằng WebAudio, không cần file.
- **Cảnh vật theo vùng:** phố cổ và Hồ Gươm, ruộng lúa và lũy tre, núi đá vôi Tràng An, Đại Nội Huế, cầu Rồng Đà Nẵng, tháp Chăm, biển miền Trung, thanh long, rừng cao su, nhà cao tầng Sài Gòn…
- **Đón khách đầy toa:** mỗi câu đúng thì một nhóm khách lên một toa. Đủ toa thì tàu kéo còi và chạy.
- **Câu thưởng:** dừng trước cầu sắt hoặc đường hầm, trả lời nhanh trong 25 giây để được thêm sao.
- **Chuỗi đúng:** đúng ngay lần đầu 3 câu liền thì chặng sau được tăng tốc.
- **Cửa hàng trang trí:** sao kiếm được sau mỗi vòng dùng để mua màu sơn và đồ gắn lên xe (cờ, bóng bay, đèn lồng, đèn nháy, ngôi sao, mèo, cún, bồn hoa, khói cầu vồng…). Mở ở menu hoặc màn về đích.
- **Khoá cho phụ huynh:** đang chơi không có nút đổi xe; muốn về menu phải giữ nút 🔒 trong 2 giây.
- **Sổ tem:** đến mỗi ga mới nhận một con tem (tên ga, tỉnh/thành, món ngon hoặc nơi nổi tiếng).
- **Bản đồ thu nhỏ:** chấm đỏ chạy trên bản đồ Việt Nam (tàu, ô tô, xe tải) hoặc sơ đồ tuyến Metro.
- **Toán 2 – Kết nối tri thức, học kì 1:** 26 dạng bài, chia 6 chủ đề. Bài có lời văn và bài thành phần phép tính: bé tự viết cả phép tính và kết quả (vd `55 − 33 = 22`). Phần Toán không đọc thành tiếng.
- **English – Cambridge Pre A1 Starters:** Look and write, How many?, What colour?, Listen and choose, Read and choose, Look and say (nói vào micro). Toàn bộ đề và lời nhắc bằng tiếng Anh.

Tiến độ (sao, tem, ga đã đi tới) được lưu riêng trên trình duyệt của từng máy.

## Sửa game

Mã nguồn nằm trong `src/`:

| File | Nội dung |
|---|---|
| `src/data.js` | Danh sách ga, tỉnh/thành, nơi nổi tiếng, cảnh vật mỗi vùng |
| `src/questions.js` | Ngân hàng câu hỏi Toán và English |
| `src/ui.js` | Bảng trả lời (bàn phím số, ô chữ, micro) |
| `src/models.js` | Tàu, metro, ô tô, xe tải, nhân vật |
| `src/scenery.js` | Cây cối, nhà cửa, công trình đặc trưng, cầu, hầm |
| `src/world.js` | Đường đi, dựng cảnh dần phía trước, máy quay |
| `src/game.js` | Menu, luồng chơi, sổ tem, câu thưởng, cửa hàng |
| `src/sound.js` | Âm thanh: hiệu ứng, tiếng máy chạy, còi |
| `src/decor.js` | Danh sách đồ trang trí, màu sơn, cách gắn lên xe |

Dựng lại `index.html` sau khi sửa (cần Node.js):

```
npm install
npm run build
copy dist\index.html index.html
git add . && git commit -m "Cập nhật" && git push
```

## Ghi công

- Thư viện 3D: [three.js](https://threejs.org) (MIT). Phông chữ: Baloo 2 (Google Fonts, OFL).
- Đường viền bản đồ Việt Nam: [world.geo.json](https://github.com/johan/world.geo.json) (dữ liệu Natural Earth).
- Hình minh hoạ từ vựng là emoji của hệ điều hành.
