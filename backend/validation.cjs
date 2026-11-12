class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireValue(condition, message, status = 400) {
  if (!condition) throw new HttpError(status, message);
}

function text(value, label, max = 100, optional = false) {
  requireValue(typeof value === 'string', `${label} không hợp lệ.`);
  const result = value.trim();
  requireValue((optional || result.length > 0) && result.length <= max, `${label} phải có ${optional ? '0' : '1'}–${max} ký tự.`);
  requireValue(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result), `${label} chứa ký tự không hợp lệ.`);
  return result;
}

function number(value, label, min = 0, max = 1e9, integer = false) {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isSafeInteger(value)), `${label} không hợp lệ.`);
  return value;
}

function phone(value) {
  const result = text(value, 'Số điện thoại', 15);
  requireValue(/^0\d{9}$/.test(result), 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.');
  return result;
}

function username(value) {
  const result = text(value, 'Tên đăng nhập', 40).toLowerCase();
  requireValue(/^[a-z0-9_.-]{3,40}$/.test(result), 'Tên đăng nhập cần 3–40 ký tự chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.');
  return result;
}

function password(value) {
  requireValue(typeof value === 'string' && value.length >= 10 && value.length <= 128, 'Mật khẩu cần từ 10 đến 128 ký tự.');
  return value;
}

function date(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Ngày không hợp lệ.');
  const parsed = new Date(value + 'T00:00:00Z');
  requireValue(!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, 'Ngày không tồn tại.');
  return value;
}

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

module.exports = { HttpError, requireValue, text, number, phone, username, password, date, today };
