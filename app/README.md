# Kotoba Loop

App học từ vựng tiếng Nhật N2 bằng cách hiển thị và phát âm từng từ
liên tục theo một khoảng thời gian cố định.

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
- Tự động phát âm tiếng Nhật bằng Web Speech API của trình duyệt.
- Chọn giọng đọc và tốc độ đọc.
- Lọc theo chương, bài, nội dung tìm kiếm hoặc từ yêu thích.
- Chế độ tuần tự và ngẫu nhiên.
- Lưu cài đặt, từ yêu thích và số lần gặp bằng `localStorage`.
- Hỗ trợ bàn phím và giao diện mobile.
- Service worker giúp dùng lại app khi mất mạng sau lần tải đầu.
