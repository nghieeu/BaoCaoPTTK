# RestMan API

API chạy cùng máy chủ với giao diện. Mọi dữ liệu nghiệp vụ cần đăng nhập.

## Quy ước

- Request và response: JSON, UTF-8.
- Các request ghi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) phải có `Content-Type: application/json` và `X-RestMan-Request: 1`.
- Trình duyệt gửi cookie `restman_session` tự động. Cookie có `HttpOnly`, `SameSite=Strict`, hết hạn sau 12 giờ. Server lưu SHA-256 của token, không lưu token thô.
- Các thao tác ghi chỉ chấp nhận Origin cùng máy chủ; không bật CORS.
- Lỗi có dạng `{ "error": "Thông báo tiếng Việt" }`.
- Mã trạng thái: `400` dữ liệu sai, `401` chưa đăng nhập, `403` thiếu quyền, `404` không tìm thấy, `409` xung đột, `413` vượt 64 KB, `429` quá nhiều yêu cầu đăng nhập.
- Giá sản phẩm và hóa đơn là số nguyên đồng Việt Nam. Backend bỏ qua giá, tổng tiền, tên món, vai trò và chủ sở hữu do client tự thêm vào các request nghiệp vụ.
- Thời gian đặt bàn và ngày thanh toán sử dụng múi giờ `Asia/Bangkok` (UTC+7).

## Xác thực

| Method | Endpoint | Body / kết quả |
| --- | --- | --- |
| POST | `/api/auth/login` | `{username,password}` → `{user}` và cookie phiên |
| POST | `/api/auth/register` | `{username,password,name,phone}` → tạo khách hàng, `{user}` và cookie |
| GET | `/api/auth/me` | `{user}`; `user: null` khi chưa đăng nhập |
| POST | `/api/auth/logout` | `{}` → vô hiệu phiên hiện tại |
| POST | `/api/auth/password` | `{currentPassword,password}` → đổi mật khẩu và vô hiệu tất cả phiên |

User công khai có các trường `id`, `username`, `name`, `role`, `customer` (mã khách hàng). Client không nhận password hash hoặc token từ JSON.

Tên đăng nhập có 3–40 ký tự chữ ASCII, số, dấu chấm, gạch dưới, gạch ngang. Mật khẩu từ 10 đến 128 ký tự. Khách hàng đăng ký chỉ được tạo vai trò `customer`, không thể tự đăng ký nhân viên. Số điện thoại khách hàng gồm 10 số, bắt đầu bằng 0, không trùng.

## Tra cứu và đồng bộ

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/api/health` | Công khai; kiểm tra kết nối SQLite |
| GET | `/api/bootstrap` | Mọi tài khoản; chỉ nhận dữ liệu được vai trò cho phép |
| GET | `/api/foods?q=bò&category=Món chính` | Đã đăng nhập; tìm tên chứa từ khóa, không phân biệt hoa thường |
| GET | `/api/foods/:id` | Đã đăng nhập; chi tiết món |
| GET | `/api/reports?from=2026-11-01&to=2026-11-30` | `manager`; doanh thu, khách hàng, món/combo, nguyên liệu, nhà cung cấp |
| GET | `/api/customers/:id/invoices?from=2026-11-01&to=2026-11-30` | `manager`; từng lần gọi món / hóa đơn của khách |
| GET | `/api/invoices/:id` | `manager`, `sales`; hóa đơn và chi tiết món |

`bootstrap` trả về `{user,data}`. `data` có `foods`, `combos`, `customers`, `suppliers`, `ingredients`, `imports`, `tables`, `bookings`, `invoices`. Bộ sưu tập ngoài phạm vi vai trò là mảng rỗng. Khách hàng chỉ nhận thông tin khách hàng và đặt bàn thuộc tài khoản của mình; không nhận hóa đơn, thông tin khách khác hay dữ liệu kho. Nhân viên kho không nhận dữ liệu khách hàng/hóa đơn.

`reports` tổng hợp bằng SQL và lọc ngày bao gồm cả ngày bắt đầu và kết thúc. Doanh thu tổng gồm khách vãng lai; danh sách khách hàng theo doanh thu chỉ gồm khách có mã khách hàng. Báo cáo nhà cung cấp và nguyên liệu thống kê các phiếu nhập, đồng thời hiển thị tồn kho hiện tại.

## Danh mục

| Method | Endpoint | Quyền | Body |
| --- | --- | --- | --- |
| POST / PUT | `/api/foods` / `/api/foods/:id` | `manager` | `{name,category,price,icon,desc,ingredients,available}` |
| POST / PUT | `/api/combos` / `/api/combos/:id` | `manager` | `{name,price,foods:[foodId,...]}` |
| DELETE | `/api/combos/:id` | `manager` | `{}` |
| POST / PUT | `/api/suppliers` / `/api/suppliers/:id` | `warehouse` | `{name,phone,address}` |
| POST | `/api/ingredients` | `warehouse` | `{name,unit,min}` |
| POST | `/api/imports` | `warehouse` | `{supplier,ingredient,qty,price,date}` |
| POST | `/api/customers` | `sales` | `{name,phone}` |

Tạo mới trả `{id}` với status 201; cập nhật trả `{id}` với status 200. Combo cần ít nhất 2 món khác nhau. Xóa combo là xóa mềm; hóa đơn cũ giữ nguyên tên và giá tại thời điểm gọi món. Phiếu nhập và tăng tồn kho cùng nằm trong một transaction.

## Đặt bàn

| Method | Endpoint | Quyền | Body |
| --- | --- | --- | --- |
| POST | `/api/bookings` | `customer` | `{name,phone,date,time,guests,table,note,items:[{id,qty}]}` |
| PATCH | `/api/bookings/:id/status` | `sales` hoặc khách sở hữu | `{status}` |
| POST | `/api/bookings/:id/check-in` | `sales` | `{}` |

Giờ đến từ 09:00 đến 21:00, phải ở tương lai. Bàn phải đủ chỗ. Hai đặt bàn cùng bàn cách nhau dưới 120 phút bị từ chối, trừ đặt bàn đã hủy. Việc kiểm tra và ghi lịch nằm trong transaction khóa ghi SQLite để chống hai yêu cầu đồng thời.

Trạng thái: `Chờ xác nhận` → `Đã xác nhận` → `Đã nhận khách`. Có thể chuyển hai trạng thái đầu sang `Đã hủy`. Khách chỉ được hủy đặt bàn của mình trước giờ đến. Chỉ nhân viên bán hàng được xác nhận hoặc nhận khách. Nhận khách chuyển các món đã đặt vào một lượt phục vụ tại bàn, chỉ khi bàn đang trống.

## Phục vụ bàn và thanh toán

| Method | Endpoint | Body |
| --- | --- | --- |
| POST | `/api/tables/:id/receive` | `{customer: customerId hoặc "walkin"}` |
| POST | `/api/tables/:id/items` | `{orderId,version,id: productId,qty}` |
| POST | `/api/tables/:id/remove` | `{orderId,version,id: productId}` |
| POST | `/api/tables/:id/release` | `{orderId,version}` |
| POST | `/api/tables/:id/pay` | `{orderId,version,method}` |

Tất cả endpoint trên yêu cầu vai trò `sales`. Lấy `orderId` và `version` từ bàn trong `bootstrap`. Mỗi thay đổi món làm tăng `version`. Nếu nhân viên khác đã thay đổi dữ liệu, API trả 409, giao diện phải tải lại. Không được trả bàn khi còn món chưa thanh toán.

Backend lấy giá món/combo từ database, lưu giá vào chi tiết lượt phục vụ và tính tổng từ các chi tiết đó. Hóa đơn lưu snapshot tên, giá và số lượng. Thay đổi thực đơn sau này không thay đổi hóa đơn lịch sử.

Thanh toán (`Tiền mặt`, `Chuyển khoản`, `Thẻ ngân hàng`) ghi hóa đơn, chi tiết và đóng lượt phục vụ trong một transaction. Gửi lại thanh toán với cùng `orderId` trả lại hóa đơn cũ, kể cả khi bàn đã nhận khách mới. Mỗi lượt phục vụ có tối đa một hóa đơn. Đây là xác nhận nhận tiền thủ công của nhân viên; chưa tích hợp ngân hàng hay cổng thanh toán.
