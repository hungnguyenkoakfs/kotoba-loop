# Kotoba Loop

App học từ vựng tiếng Nhật N2 và tiếng Anh TOEIC bằng cách hiển thị và
phát âm từng từ liên tục theo một khoảng thời gian cố định.

## Bản online

Mở app tại:

```text
https://hungnguyenkoakfs.github.io/kotoba-loop/
```

Trên điện thoại, mở URL bằng Chrome hoặc Safari rồi chọn **Thêm vào màn
hình chính**. Trên Chrome hoặc Edge máy tính, chọn **Cài đặt ứng dụng**
trong thanh địa chỉ hoặc menu trình duyệt.

## Chạy app

Từ thư mục `LearningKotoba`, chạy:

```powershell
python -m http.server 4173
```

Sau đó mở:

```text
http://127.0.0.1:4173/app/
```

Không mở trực tiếp `index.html` bằng `file://`, vì trình duyệt sẽ chặn
việc đọc tệp JSON.

## Tính năng

- Chạy/dừng vòng lặp, chuyển từ trước hoặc tiếp theo.
- Khoảng thời gian từ 3 đến 20 giây.
- Hai tab học riêng: tiếng Nhật N2 và tiếng Anh Hackers TOEIC.
- Tự động chọn giọng tiếng Nhật hoặc tiếng Anh bằng Web Speech API.
- Bộ tiếng Anh có nghĩa, từ loại, từ đồng nghĩa và câu ví dụ Anh–Việt.
- Chọn giọng đọc và tốc độ đọc.
- Lọc theo chương, bài, nội dung tìm kiếm hoặc từ yêu thích.
- Chế độ tuần tự và ngẫu nhiên.
- Lưu cài đặt, từ yêu thích và số lần gặp bằng `localStorage`.
- Hỗ trợ bàn phím và giao diện mobile.
- Service worker giúp dùng lại app khi mất mạng sau lần tải đầu.

## Tạo gói GitHub Pages

Từ thư mục `LearningKotoba`, chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-pages.ps1
```

Gói tĩnh sẽ được tạo trong thư mục `dist`. Nhánh xuất bản hiện dùng là
`gh-pages` của repository `hungnguyenkoakfs/kotoba-loop`.
