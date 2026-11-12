# RestMan — Backend và Database

Ứng dụng quản lý nhà hàng bằng giao diện HTML/CSS/JavaScript, backend Node.js và database SQLite. Toàn bộ code nằm trong các file của dự án, không phụ thuộc website triển khai trước đó, CDN, thư viện tải ngoài hay dịch vụ database riêng.

## Chạy ứng dụng

Cần **Node.js 24 trở lên**. Không cần `npm install`.

Trong thư mục `restman`, chạy:

```sh
node server.cjs
```

Sau đó mở `localhost:3000` bằng trình duyệt. Trên Windows có thể nhấp đúp `MO-RESTMAN.cmd`: script khởi động backend rồi mở trình duyệt. Giữ cửa sổ máy chủ mở trong khi sử dụng; nhấn Ctrl+C để dừng.

Không mở trực tiếp `dist/index.html`: phiên bản này cần backend. Dữ liệu lưu trong `data/restman.sqlite` và vẫn còn sau khi tắt trình duyệt hoặc khởi động lại máy chủ. Các trình duyệt cùng truy cập máy chủ dùng chung database. Nút ⟳ và việc chuyển trang tải dữ liệu mới nhất; giao diện chưa đồng bộ đẩy theo thời gian thực.

### Khi đăng nhập hoặc tạo tài khoản báo lỗi JSON

Live Server ở cổng 5500 chỉ phục vụ file HTML/CSS/JavaScript, không chạy API hoặc SQLite. Nếu mở giao diện bằng Live Server, các request đăng nhập/đăng ký có thể nhận lỗi 404/405 hoặc phản hồi rỗng thay vì JSON. Hãy chạy `node server.cjs` trong thư mục `restman` rồi mở `localhost:3000`; không dùng địa chỉ cổng 5500 để sử dụng ứng dụng. Nếu vừa cập nhật code, nhấn Ctrl+F5 để tải lại các file giao diện.

## Tài khoản khởi tạo

| Tên đăng nhập | Vai trò | Mật khẩu mặc định |
| --- | --- | --- |
| `manager` | Nhân viên quản lý | `RestMan@12345` |
| `warehouse` | Nhân viên kho | `RestMan@12345` |
| `sales` | Nhân viên bán hàng | `RestMan@12345` |
| `customer` | Khách hàng Nguyễn Minh Anh | `RestMan@12345` |

Đây là tài khoản dùng thử trên máy cục bộ. Đổi mật khẩu bằng nút ⚿ ở đầu trang. Có thể đăng ký thêm tài khoản khách hàng ngay tại màn hình đăng nhập. Vai trò được đọc từ database, không cho chọn vai trò khi đăng nhập hoặc tự đăng ký tài khoản nhân viên.

Nếu đặt biến môi trường `RESTMAN_INITIAL_PASSWORD` trước lần khởi tạo đầu tiên, các tài khoản ban đầu dùng mật khẩu đó. Thay đổi biến này sau khi database đã tồn tại không đặt lại mật khẩu.

## Chức năng đã kết nối backend

- Quản lý: thêm/sửa món ăn; tạo/sửa/xóa combo; thống kê khách hàng theo doanh thu, món/combo, nhập nguyên liệu, nhà cung cấp; lọc ngày; mở từng lần gọi món và hóa đơn; xuất CSV.
- Kho: quản lý thông tin nhà cung cấp; tạo nguyên liệu; nhập kho và cập nhật tồn; xem lịch sử và cảnh báo tồn thấp.
- Bán hàng: nhận khách, gọi món/combo, bỏ món, thanh toán tại bàn và ghi hóa đơn; làm thẻ thành viên; xác nhận đặt bàn/đặt món và nhận khách vào bàn.
- Khách hàng: tìm tên món chứa từ khóa, lọc danh mục, xem chi tiết; đặt bàn và món trước; chỉ xem/hủy đặt bàn của tài khoản mình.
- Xác thực: mật khẩu băm bằng scrypt và salt riêng; phiên cookie HttpOnly; đăng xuất; đổi mật khẩu và thu hồi các phiên cũ; kiểm tra quyền ở từng API.
- Kiểm tra nghiệp vụ: giá và tổng tiền tính từ database, chống trùng lịch bàn, kiểm tra số chỗ, chống ghi đè lượt phục vụ cũ, chống tạo hai hóa đơn khi gửi lại thanh toán.

Database demo gồm thực đơn, 12 bàn, khách hàng, nhà cung cấp, tồn kho và 30 hóa đơn tháng 11/2026. Dữ liệu `localStorage` của bản giao diện cũ không tự nhập vào database mới.

## Cấu trúc mã nguồn

```text
restman/
├── dist/
│   ├── index.html            Trang web
│   ├── style.css             Định dạng giao diện
│   ├── app.js                Các màn hình và form
│   └── api-client.js         Gọi API và xử lý thao tác trên giao diện
├── backend/
│   ├── api.cjs               HTTP API, giới hạn request và xác thực
│   ├── auth.cjs              Mật khẩu, cookie, phiên và phân quyền
│   ├── database.cjs          Mở SQLite, schema và khởi tạo dữ liệu
│   ├── repository.cjs        Truy vấn dữ liệu và báo cáo SQL
│   ├── service.cjs           Nghiệp vụ và transaction
│   ├── validation.cjs        Kiểm tra dữ liệu đầu vào
│   └── seed.cjs              Dữ liệu mẫu
├── database/
│   ├── schema.sql            Schema 15 bảng, khóa ngoại và index
│   └── README.md             Bảng, quan hệ và hướng dẫn sao lưu
├── data/
│   └── restman.sqlite        Database đã khởi tạo, tự tạo nếu chưa có
├── scripts/
│   └── database.cjs          Lệnh init / info / backup
├── tests/
│   ├── api.test.cjs          Kiểm thử HTTP, bảo mật, transaction, lưu dữ liệu
│   ├── api-client.test.cjs   Kiểm thử phản hồi rỗng, sai JSON và lỗi Live Server
│   ├── helpers/view.cjs     Môi trường chạy giao diện dùng trong kiểm thử
│   └── frontend.test.cjs     Kiểm thử giao diện gọi API thật
├── docs/
│   └── API.md                Đặc tả API, request, quyền và trạng thái
├── server.cjs                Máy chủ API và file giao diện
├── check.cjs                 Lệnh kiểm tra tương thích bản cũ
├── package.json              Lệnh npm; không có thư viện ngoài
├── MO-RESTMAN.cmd            Khởi động trên Windows
└── .env.example              Mẫu cấu hình tùy chọn
```

`.openai` là cấu hình website tĩnh của bản cũ, không dùng để chạy backend Node.js/SQLite này. Không cần tải hoặc xuất bản ứng dụng để chạy cục bộ.

## Lệnh database và kiểm thử

```sh
npm run db:init
npm run db:info
npm run db:backup
npm test
```

Cũng có thể chạy `node check.cjs` để kiểm tra. Các bài kiểm tra dùng database tạm, không thay đổi `data/restman.sqlite`. Kiểm tra giao diện dùng môi trường DOM mô phỏng với request HTTP thật, chưa thay cho kiểm thử trình bày trực tiếp trên trình duyệt.

## Cấu hình tùy chọn

Sao chép `.env.example` thành `.env` rồi chạy:

```sh
node --env-file=.env server.cjs
```

Mặc định máy chủ chỉ nghe ở `127.0.0.1:3000`. Biến `RESTMAN_DB` đổi vị trí database. Đặt `RESTMAN_DEMO_DATA=0` trước khi khởi tạo database mới để chỉ tạo bàn và 3 tài khoản nhân viên, không có thực đơn/hóa đơn/khách hàng mẫu. Bật `RESTMAN_SECURE_COOKIE=1` khi phục vụ qua HTTPS; có thể cấu hình `RESTMAN_ORIGIN` bằng origin thực tế nếu qua reverse proxy.

## Phạm vi hiện tại

Thanh toán là nhân viên xác nhận đã nhận tiền, chưa tích hợp cổng thanh toán. Chưa tự trừ nguyên liệu theo công thức món ăn. Tài khoản nhân viên ban đầu được tạo khi khởi tạo database; chưa có màn hình quản trị nhân sự hoặc khôi phục mật khẩu qua email. Database và tài khoản hoạt động trên máy chủ cục bộ này.
