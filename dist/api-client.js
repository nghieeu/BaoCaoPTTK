// API transport and UI actions. Business rules and persistent data live on the server.
let writing = false;
let searchSequence = 0;
let searchTimer;

function responseError(response, path, detail) {
  const error = new Error(`${detail} (${path}, HTTP ${response.status}). Hãy chạy node server.cjs trong thư mục restman và mở localhost:3000. Live Server chỉ phục vụ giao diện, không chạy backend.`);
  error.status = response.status;
  error.code = 'INVALID_API_RESPONSE';
  return error;
}

async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-RestMan-Request': '1' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    const error = new Error('Không kết nối được máy chủ. Hãy kiểm tra RestMan đang chạy.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }
  // Handle authentication even when an intermediary returned an invalid body.
  if (response.status === 401 && session) {
    session = null;
    cart = [];
    closeModal();
    render();
  }
  let text;
  try { text = await response.text(); }
  catch { throw responseError(response, '/api' + path, 'Không đọc được toàn bộ phản hồi từ máy chủ'); }
  if (!text.trim()) {
    if (response.ok && [204, 205].includes(response.status)) return null;
    throw responseError(response, '/api' + path, 'Máy chủ trả về phản hồi rỗng');
  }
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json' && !/^application\/[a-z0-9.+-]+\+json$/.test(contentType)) {
    throw responseError(response, '/api' + path, 'Máy chủ không trả về dữ liệu JSON');
  }
  let data;
  try { data = JSON.parse(text); }
  catch { throw responseError(response, '/api' + path, 'Dữ liệu JSON từ máy chủ bị thiếu hoặc không hợp lệ'); }
  if (data === null || typeof data !== 'object') {
    throw responseError(response, '/api' + path, 'Dữ liệu từ máy chủ không đúng định dạng API');
  }
  if (!response.ok) {
    const error = new Error(typeof data.error === 'string' ? data.error : 'Không thể hoàn tất yêu cầu.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function showBackendHelp(message) {
  $('#app').innerHTML = `<section class="loginform" role="alert">
    <h1>Cần kết nối backend RestMan</h1>
    <p>${esc(message)}</p>
    <p>Mở terminal trong thư mục <code>restman</code>, chạy:</p>
    <pre><code>node server.cjs</code></pre>
    <p>Sau đó mở <code>localhost:3000</code> bằng trình duyệt. Bạn cũng có thể nhấp đúp <code>MO-RESTMAN.cmd</code> để khởi động.</p>
    <p>Đăng nhập và tạo tài khoản cần backend; Live Server ở cổng 5500 chỉ hiển thị các file giao diện.</p>
    <button class="primary" onclick="initialize()">Kiểm tra kết nối lại</button>
  </section>`;
}

async function syncData() {
  const current = session?.id;
  const [snapshot, reports] = await Promise.all([
    api('/bootstrap'),
    session?.role === 'manager' ? api(`/reports?from=${from}&to=${to}`) : null,
  ]);
  if (!session || current !== session.id) return;
  db = snapshot.data;
  session = snapshot.user;
  analytics = reports;
  searchResults = null;
}

async function action(work) {
  if (writing) return;
  writing = true;
  try { return await work(); }
  catch (error) {
    if (error.status === 409 && session) {
      try { await syncData(); render(); closeModal(); } catch { /* Keep the original error. */ }
    }
    toast(error.message);
  } finally { writing = false; }
}

async function reloadView() {
  try {
    await syncData();
    if (selectedCustomer) detailInvoices = await api(`/customers/${selectedCustomer}/invoices?from=${from}&to=${to}`);
    render();
    toast('Đã tải dữ liệu mới nhất từ máy chủ.');
  } catch (error) { toast(error.message); }
}

async function go(next) {
  page = next;
  keyword = '';
  category = 'Tất cả';
  selectedCustomer = null;
  searchResults = null;
  try { await syncData(); render(); }
  catch (error) { toast(error.message); }
}

function loginView() {
  return `<div class="login"><section class="loginhero">
    <div class="brand"><span class="logo">♧</span>RestMan<small>RESTAURANT MANAGEMENT</small></div>
    <div class="topnote" style="margin-top:65px;color:#a9c5b3">MỘT KHÔNG GIAN. MỌI VẬN HÀNH.</div>
    <h1>Chăm chút từng món ăn.<br>Thảnh thơi từng vận hành.</h1>
    <p>Từ căn bếp đến bàn ăn, RestMan kết nối mọi trải nghiệm trong nhà hàng của bạn.</p>
    <p style="margin-top:60px;font-size:11px">✦ Quản lý tinh gọn &nbsp; · &nbsp; Phục vụ tận tâm</p>
    </section><section class="loginform"><div class="topnote">CHÀO MỪNG ĐẾN VỚI RESTMAN</div>
    <h1 style="margin-top:18px">Một ngày làm việc tốt lành.</h1>
    <p class="sub">Đăng nhập để bắt đầu không gian làm việc của bạn.</p>
    <form onsubmit="event.preventDefault();login()">
      <label>Tên đăng nhập<input id="username" required maxlength="40" autocomplete="username" placeholder="Nhập tên đăng nhập"></label>
      <label>Mật khẩu<input id="password" type="password" required maxlength="128" autocomplete="current-password" placeholder="Nhập mật khẩu"></label>
      <button class="primary">Đăng nhập &nbsp; →</button>
    </form>
    <div class="demo">Khách hàng mới? <button class="link" onclick="registerForm()">Tạo tài khoản</button>
      <p>Thông tin đăng nhập được xác thực trên máy chủ.<br>Dữ liệu nhà hàng được lưu trong SQLite.</p>
    </div></section></div>`;
}

async function login() {
  const credentials = { username: val('username'), password: val('password') };
  return action(async () => {
    const response = await api('/auth/login', 'POST', credentials);
    session = response.user;
    page = navs[session.role][0][0];
    cart = [];
    selectedCustomer = null;
    keyword = '';
    await syncData();
    render();
  });
}

async function logout() {
  return action(async () => {
    await api('/auth/logout', 'POST', {});
    session = null;
    cart = [];
    analytics = null;
    closeModal();
    render();
  });
}

function registerForm() {
  modal('Tạo tài khoản khách hàng', `<form onsubmit="event.preventDefault();register()"><div class="formgrid">
    <label class="full">Họ tên<input id="rname" required maxlength="80" autocomplete="name"></label>
    <label>Số điện thoại<input id="rphone" required pattern="0[0-9]{9}" autocomplete="tel"></label>
    <label>Tên đăng nhập<input id="rusername" required minlength="3" maxlength="40" pattern="[a-zA-Z0-9_.-]{3,40}" autocomplete="username"></label>
    <label class="full">Mật khẩu (10–128 ký tự)<input id="rpassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label>
    </div><div class="actions"><button class="primary">Tạo tài khoản</button></div></form>`);
}

async function register() {
  const body = { name: val('rname'), phone: val('rphone'), username: val('rusername'), password: val('rpassword') };
  return action(async () => {
    const response = await api('/auth/register', 'POST', body);
    session = response.user;
    page = 'menu';
    cart = [];
    await syncData();
    closeModal();
    render();
    toast('Tạo tài khoản thành công.');
  });
}

function passwordForm() {
  modal('Đổi mật khẩu', `<form onsubmit="event.preventDefault();changePassword()"><div class="formgrid">
    <label class="full">Mật khẩu hiện tại<input id="oldpassword" type="password" required maxlength="128" autocomplete="current-password"></label>
    <label class="full">Mật khẩu mới (10–128 ký tự)<input id="newpassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label>
    </div><p class="sub" style="margin-top:15px">Đổi mật khẩu sẽ đăng xuất tất cả phiên đang sử dụng tài khoản.</p>
    <div class="actions"><button class="primary">Lưu mật khẩu mới</button></div></form>`);
}

async function changePassword() {
  const body = { currentPassword: val('oldpassword'), password: val('newpassword') };
  return action(async () => {
    await api('/auth/password', 'POST', body);
    session = null;
    cart = [];
    closeModal();
    render();
    toast('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
  });
}

async function applyDates() {
  const start = val('from'), end = val('to');
  if (!start || !end || start > end) return toast('Khoảng thời gian thống kê không hợp lệ.');
  try {
    const data = await api(`/reports?from=${start}&to=${end}`);
    from = start;
    to = end;
    analytics = data;
    render();
  } catch (error) { toast(error.message); }
}

function reportRows() { return analytics?.customers || []; }

function reportTable() {
  if (report === 'customers') {
    const rows = reportRows().filter(c => matches(c.name + ' ' + c.phone));
    return table(['STT', 'Khách hàng', 'Số điện thoại', 'Hạng thành viên', 'Lượt gọi món', 'Tổng doanh thu', ''], rows.map((c, i) => `<tr>
      <td class="muted">${String(i + 1).padStart(2, '0')}</td>
      <td><div class="person"><span class="avatar">${esc(initials(c.name))}</span><div><strong>${esc(c.name)}</strong><small>RM-${esc(c.id.toUpperCase())}</small></div></div></td>
      <td>${esc(c.phone)}</td><td><span class="badge ${c.tier === 'Vàng' ? 'gold' : ''}">${esc(c.tier)}</span></td>
      <td>${c.count} lần</td><td class="money">${money(c.total)}</td>
      <td><button class="link" onclick="openCustomer('${c.id}')">Xem chi tiết &nbsp; →</button></td></tr>`).join('')) +
      `<div class="foot"><span>Hiển thị ${rows.length} khách hàng · Doanh thu giảm dần</span><span>Tổng: <b class="money">${money(rows.reduce((s, c) => s + c.total, 0))}</b></span></div>`;
  }
  if (report === 'foods') return table(['Món ăn / Combo', 'Danh mục', 'Đã bán', 'Doanh thu'], (analytics?.foods || []).filter(f => matches(f.name)).map(f => `<tr><td>${esc(f.name)}</td><td>${esc(f.category)}</td><td>${f.qty}</td><td class="money">${money(f.revenue)}</td></tr>`).join(''));
  if (report === 'ingredients') return table(['Nguyên liệu', 'Đơn vị', 'Tồn hiện tại', 'Nhập trong kỳ', 'Giá trị nhập trong kỳ'], (analytics?.ingredients || []).filter(i => matches(i.name)).map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.unit)}</td><td>${i.stock}</td><td>${i.imported}</td><td>${money(i.value)}</td></tr>`).join(''));
  return table(['Nhà cung cấp', 'Điện thoại', 'Số lần nhập trong kỳ', 'Giá trị nhập trong kỳ'], (analytics?.suppliers || []).filter(s => matches(s.name)).map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone)}</td><td>${s.count}</td><td class="money">${money(s.value)}</td></tr>`).join(''));
}

async function openCustomer(id) {
  try {
    detailInvoices = await api(`/customers/${id}/invoices?from=${from}&to=${to}`);
    selectedCustomer = id;
    render();
  } catch (error) { toast(error.message); }
}

async function invoice(id) {
  try {
    const result = await api('/invoices/' + id);
    db.invoices = db.invoices.filter(i => i.id !== id).concat(result);
    invoiceView(id);
  } catch (error) { toast(error.message); }
}

async function exportReport() {
  try {
    analytics = await api(`/reports?from=${from}&to=${to}`);
    let headers, rows;
    if (report === 'customers') {
      headers = ['Khách hàng', 'Điện thoại', 'Hạng', 'Lượt gọi', 'Doanh thu'];
      rows = analytics.customers.map(c => [c.name, c.phone, c.tier, c.count, c.total]);
    } else if (report === 'foods') {
      headers = ['Món ăn / Combo', 'Số lượng', 'Doanh thu'];
      rows = analytics.foods.map(f => [f.name, f.qty, f.revenue]);
    } else if (report === 'ingredients') {
      headers = ['Nguyên liệu', 'Đơn vị', 'Tồn hiện tại', 'Nhập trong kỳ', 'Giá trị nhập'];
      rows = analytics.ingredients.map(i => [i.name, i.unit, i.stock, i.imported, i.value]);
    } else {
      headers = ['Nhà cung cấp', 'Điện thoại', 'Số lần nhập', 'Giá trị nhập'];
      rows = analytics.suppliers.map(s => [s.name, s.phone, s.count, s.value]);
    }
    const cell = value => {
      let safe = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(safe)) safe = "'" + safe;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const csv = '\ufeff' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `RestMan-${report}-${from}-${to}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Đã xuất báo cáo CSV từ dữ liệu máy chủ.');
  } catch (error) { toast(error.message); }
}

function updateFoods() {
  clearTimeout(searchTimer);
  const sequence = ++searchSequence;
  searchTimer = setTimeout(async () => {
    try {
      const result = await api(`/foods?q=${encodeURIComponent(keyword)}${category !== 'Tất cả' ? '&category=' + encodeURIComponent(category) : ''}`);
      if (sequence !== searchSequence || page !== 'menu') return;
      searchResults = result;
      $('#foods').innerHTML = foodCards();
    } catch (error) { toast(error.message); }
  }, 200);
}

async function foodDetail(id) {
  try {
    const food = await api('/foods/' + id);
    db.foods = db.foods.filter(f => f.id !== id).concat(food);
    showFoodDetail(id);
  } catch (error) { toast(error.message); }
}

async function saveFood(id) {
  const body = { name: val('fname'), category: val('fcat'), price: +val('fprice'), desc: val('fdesc'), ingredients: val('fingredients'), icon: val('ficon'), available: val('favailable') === 'true' };
  return action(async () => {
    await api('/foods' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
    await syncData(); closeModal(); render(); toast('Đã lưu món ăn vào database.');
  });
}

async function saveCombo(id) {
  const body = { name: val('coname'), price: +val('coprice'), foods: [...document.querySelectorAll('[name=combofood]:checked')].map(x => x.value) };
  return action(async () => {
    await api('/combos' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
    await syncData(); closeModal(); render(); toast('Đã lưu combo.');
  });
}

function deleteCombo(id) {
  modal('Xóa combo', `<p>Bạn muốn xóa combo này khỏi thực đơn?</p><div class="actions"><button class="secondary" onclick="closeModal()">Hủy</button><button class="primary" onclick="confirmDeleteCombo('${id}')">Xác nhận xóa</button></div>`);
}

async function confirmDeleteCombo(id) {
  return action(async () => {
    await api('/combos/' + id, 'DELETE', {});
    await syncData(); closeModal(); render(); toast('Đã xóa combo. Hóa đơn cũ được giữ nguyên.');
  });
}

async function addIngredient() {
  const body = { name: val('iname'), unit: val('iunit'), min: +val('imin') };
  return action(async () => {
    await api('/ingredients', 'POST', body);
    await syncData(); closeModal(); render(); toast('Đã thêm nguyên liệu.');
  });
}

async function saveImport() {
  const body = { supplier: val('isupplier'), ingredient: val('iingredient'), qty: +val('iqty'), price: +val('iprice'), date: val('idate') };
  return action(async () => {
    await api('/imports', 'POST', body);
    await syncData(); closeModal(); render(); toast('Đã ghi phiếu nhập và cập nhật tồn kho.');
  });
}

async function saveSupplier(id) {
  const body = { name: val('sname'), phone: val('sphone'), address: val('saddress') };
  return action(async () => {
    await api('/suppliers' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
    await syncData(); closeModal(); render(); toast('Đã lưu nhà cung cấp.');
  });
}

async function saveMember() {
  const body = { name: val('mname'), phone: val('mphone') };
  return action(async () => {
    const member = await api('/customers', 'POST', body);
    await syncData(); closeModal(); render(); memberCard(member.id);
  });
}

function orderBody(tableId, extra = {}) {
  const t = db.tables.find(t => t.id === tableId);
  return { orderId: t.orderId, version: t.version, ...extra };
}

async function receiveGuest(id) {
  const body = { customer: val('tcustomer') };
  return action(async () => {
    await api(`/tables/${id}/receive`, 'POST', body);
    await syncData(); closeModal(); render(); tableDetail(id);
  });
}

async function addTableItem(id) {
  const body = orderBody(id, { id: val('tfood'), qty: +val('tqty') });
  return action(async () => {
    await api(`/tables/${id}/items`, 'POST', body);
    await syncData(); closeModal(); render(); tableDetail(id);
  });
}

async function removeItem(id, index) {
  const body = orderBody(id, { id: db.tables.find(t => t.id === id).items[index].id });
  return action(async () => {
    await api(`/tables/${id}/remove`, 'POST', body);
    await syncData(); closeModal(); render(); tableDetail(id);
  });
}

async function releaseTable(id) {
  const body = orderBody(id);
  return action(async () => {
    await api(`/tables/${id}/release`, 'POST', body);
    await syncData(); closeModal(); render();
  });
}

async function pay(id) {
  const body = orderBody(id, { method: val('pmethod') });
  return action(async () => {
    const result = await api(`/tables/${id}/pay`, 'POST', body);
    await syncData(); closeModal(); render(); invoiceView(result.id);
    toast('Đã ghi hóa đơn và thanh toán.');
  });
}

async function submitBooking() {
  const body = { name: val('bname'), phone: val('bphone'), date: val('bdate'), time: val('btime'), table: +val('btable'), guests: +val('bguests'), note: val('bnote'), items: cart.map(x => ({ id: x.id, qty: x.qty })) };
  return action(async () => {
    await api('/bookings', 'POST', body);
    cart = [];
    page = 'mybookings';
    await syncData(); render(); toast('Đã gửi yêu cầu. Vui lòng chờ nhân viên xác nhận.');
  });
}

async function bookingStatus(id, status) {
  return action(async () => {
    await api(`/bookings/${id}/status`, 'PATCH', { status });
    await syncData(); closeModal(); render(); toast('Đã cập nhật: ' + status);
  });
}

async function checkIn(id) {
  return action(async () => {
    const result = await api(`/bookings/${id}/check-in`, 'POST', {});
    page = 'tables';
    await syncData(); closeModal(); render(); tableDetail(result.table);
  });
}

async function initialize() {
  if (location.protocol === 'file:') {
    showBackendHelp('Bạn đang mở file HTML trực tiếp. Ứng dụng cần máy chủ để truy cập SQLite.');
    return;
  }
  try {
    const response = await api('/auth/me');
    if (!response || !Object.prototype.hasOwnProperty.call(response, 'user') || (response.user !== null && (!response.user.id || !Object.prototype.hasOwnProperty.call(roles, response.user.role)))) {
      const error = new Error('Máy chủ không trả về thông tin phiên đăng nhập hợp lệ.');
      error.code = 'INVALID_API_RESPONSE';
      throw error;
    }
    session = response.user;
    if (session) {
      page = navs[session.role][0][0];
      await syncData();
    }
    render();
  } catch (error) {
    if (['INVALID_API_RESPONSE', 'NETWORK_ERROR'].includes(error.code)) showBackendHelp(error.message);
    else { render(); toast(error.message); }
  }
}

$('#modal').addEventListener('click', event => {
  if (event.target === $('#modal')) {
    const rect = $('#modal').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
  }
});
initialize();
