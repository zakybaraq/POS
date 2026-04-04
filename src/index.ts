import { Elysia } from 'elysia';
import { routes } from './routes';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const layoutHtml = existsSync(join(__dirname, 'views/layout.html')) 
  ? readFileSync(join(__dirname, 'views/layout.html'), 'utf-8')
  : `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurant POS</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  {{ content }}
</body>
</html>`;

function htmlResponse(content: string) {
  const html = layoutHtml.replace('{{ content }}', content);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

const authCheckScript = `
<script>
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login'; }
  else {
    fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => { if (data.error) window.location.href = '/login'; })
      .catch(() => window.location.href = '/login');
  }
</script>`;

const app = new Elysia()
  .use(routes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  
  .get('/login', () => {
    return htmlResponse(`
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 class="text-2xl font-bold text-center mb-6">Login POS</h1>
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" required class="w-full border rounded p-2">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Password</label>
              <input type="password" name="password" required class="w-full border rounded p-2">
            </div>
            <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Login</button>
          </form>
          <p class="mt-4 text-center text-sm">Belum punya akun? <a href="/register" class="text-blue-500">Register</a></p>
          <p class="mt-2 text-center text-sm"><a href="/forgot-password" class="text-gray-500">Lupa Password?</a></p>
        </div>
      </div>
      <script>
        document.getElementById('login-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
          });
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/';
          } else {
            alert(data.error || 'Login failed');
          }
        });
      </script>
    `);
  })
  
  .get('/register', () => {
    return htmlResponse(`
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 class="text-2xl font-bold text-center mb-6">Register POS</h1>
          <form id="register-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Nama</label>
              <input type="text" name="name" required class="w-full border rounded p-2">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" required class="w-full border rounded p-2">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Password</label>
              <input type="password" name="password" required class="w-full border rounded p-2">
            </div>
            <button type="submit" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">Register</button>
          </form>
          <p class="mt-4 text-center text-sm">Sudah punya akun? <a href="/login" class="text-blue-500">Login</a></p>
        </div>
      </div>
      <script>
        document.getElementById('register-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password') })
          });
          const data = await response.json();
          if (data.success) {
            alert('Registration successful! Please login.');
            window.location.href = '/login';
          } else {
            alert(data.error || 'Registration failed');
          }
        });
      </script>
    `);
  })
  
  .get('/forgot-password', () => {
    return htmlResponse(`
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 class="text-2xl font-bold text-center mb-6">Reset Password</h1>
          <form id="forgot-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" required class="w-full border rounded p-2">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Password Baru</label>
              <input type="password" name="newPassword" required class="w-full border rounded p-2">
            </div>
            <button type="submit" class="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">Reset Password</button>
          </form>
          <p class="mt-4 text-center text-sm"><a href="/login" class="text-blue-500">Kembali ke Login</a></p>
        </div>
      </div>
      <script>
        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.get('email'), newPassword: formData.get('newPassword') })
          });
          const data = await response.json();
          if (data.success) {
            alert('Password berhasil direset! Silakan login.');
            window.location.href = '/login';
          } else {
            alert(data.error || 'Reset password failed');
          }
        });
      </script>
    `);
  })
  
  .get('/', () => {
    return htmlResponse(authCheckScript + `
      <div class="container mx-auto p-4">
        <div id="content">
          <h1 class="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
      <script>
        const token = localStorage.getItem('token');
        fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
          .then(res => res.json())
          .then(data => {
            if (data.error) { window.location.href = '/login'; return; }
            const user = data.user;
            document.getElementById('content').innerHTML = 
              '<div class="flex justify-between items-center mb-4"><h1 class="text-2xl font-bold">Restaurant POS</h1><button onclick="logout()" class="bg-red-500 text-white px-4 py-2 rounded">Logout (' + user.name + ')</button></div>' +
              '<div class="grid grid-cols-3 gap-4">' +
              '<a href="/pos" class="bg-blue-500 text-white p-4 rounded text-center hover:bg-blue-600">POS</a>' +
              '<a href="/menu" class="bg-green-500 text-white p-4 rounded text-center hover:bg-green-600">Menu</a>' +
              '<a href="/tables" class="bg-purple-500 text-white p-4 rounded text-center hover:bg-purple-600">Tables</a>' +
              '<a href="/orders" class="bg-yellow-500 text-white p-4 rounded text-center hover:bg-yellow-600">Orders</a></div>';
          })
          .catch(() => window.location.href = '/login');
        function logout() {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      </script>
    `);
  })
  
  .get('/pos', async () => {
    const { getAllTables } = await import('./repositories/table');
    const { getAvailableMenus } = await import('./repositories/menu');
    const { getOrdersToday } = await import('./repositories/order');
    
    const tables = await getAllTables();
    const menus = await getAvailableMenus();
    const orders = await getOrdersToday();
    
    const todayTotal = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
    
    return htmlResponse(authCheckScript + `
      <div class="flex h-screen">
        <div class="w-32 bg-gray-800 p-4 text-white">
          <h2 class="text-lg font-bold mb-4">Meja</h2>
          <div class="grid grid-cols-2 gap-2" id="tables-grid">
            ${tables.map(t => `<button class="p-2 rounded ${t.status === 'available' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} table-btn" data-table-id="${t.id}">${t.tableNumber}</button>`).join('')}
          </div>
          <button class="mt-4 w-full bg-gray-600 p-2 rounded hover:bg-gray-500" onclick="addTable()">+ Tambah</button>
        </div>
        
        <div class="flex-1 p-4 overflow-auto">
          <div class="flex gap-2 mb-4">
            <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onclick="filterMenu('all')">Semua</button>
            <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="filterMenu('makanan')">Makanan</button>
            <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="filterMenu('minuman')">Minuman</button>
          </div>
          
          <div class="grid grid-cols-4 gap-4" id="menu-grid">
            ${menus.map(m => `<button class="p-4 bg-white rounded shadow hover:shadow-lg text-center menu-item" data-category="${m.category}" onclick="addToCart(${m.id}, '${m.name}', ${m.price})"><div class="font-bold">${m.name}</div><div class="text-green-600">${m.price.toLocaleString('id-ID')}</div></button>`).join('')}
          </div>
        </div>
        
        <div class="w-80 bg-white p-4 shadow-lg flex flex-col">
          <h2 class="text-lg font-bold mb-4 border-b pb-2">Cart</h2>
          <div id="cart-zone" class="flex-1 overflow-auto">
            <p class="text-gray-500 text-center mt-4">Pilih meja terlebih dahulu</p>
          </div>
        </div>
      </div>
      
      <script>
        let currentOrderId = null;
        
        function filterMenu(category) {
          document.querySelectorAll('.menu-item').forEach(item => {
            item.style.display = (category === 'all' || item.dataset.category === category) ? 'block' : 'none';
          });
        }
        
        async function addToCart(menuId, name, price) {
          if (!currentOrderId) { alert('Pilih meja terlebih dahulu!'); return; }
          const response = await fetch('/api/orders/' + currentOrderId + '/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuId, quantity: 1 })
          });
          if (response.ok) { const data = await response.json(); renderCart(data.order, data.items); }
        }
        
        function renderCart(order, items) {
          const cartZone = document.getElementById('cart-zone');
          if (!order || !items.length) { cartZone.innerHTML = '<p class="text-gray-500 text-center mt-4">Cart kosong</p>'; return; }
          
          let html = '<div class="space-y-2">';
          items.forEach(item => {
            html += '<div class="flex justify-between items-center border-b py-2"><div><div class="font-bold">' + (item.menuName || 'Item') + '</div><div class="text-sm text-gray-500">x' + item.quantity + '</div></div><div class="flex items-center gap-2"><span>' + (item.priceAtOrder * item.quantity).toLocaleString('id-ID') + '</span><button class="text-red-500" onclick="removeItem(' + item.id + ')">x</button></div></div>';
          });
          html += '</div>';
          
          const subtotal = order.subtotal || 0, tax = order.tax || 0, total = order.total || 0;
          html += '<div class="mt-4 border-t pt-4"><div class="flex justify-between"><span>Subtotal:</span><span>' + subtotal.toLocaleString('id-ID') + '</span></div><div class="flex justify-between"><span>Pajak (10%):</span><span>' + tax.toLocaleString('id-ID') + '</span></div><div class="flex justify-between font-bold text-lg"><span>Total:</span><span>' + total.toLocaleString('id-ID') + '</span></div></div>';
          html += '<div class="mt-4"><label class="block text-sm font-bold mb-1">Uang Diterima:</label><input type="number" id="amount-paid" class="w-full border rounded p-2" placeholder="0"><div class="mt-2 text-sm">Kembalian: <span id="change-due">0</span></div></div>';
          html += '<div class="mt-4 flex gap-2"><button onclick="cancelOrder()" class="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600">Batal</button><button onclick="processPayment()" class="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600">Bayar</button></div>';
          
          cartZone.innerHTML = html;
          document.getElementById('amount-paid').addEventListener('input', function() {
            const paid = parseInt(this.value) || 0;
            document.getElementById('change-due').textContent = (paid - total >= 0 ? paid - total : 'Kurang ' + (total - paid)).toLocaleString('id-ID');
          });
        }
        
        async function removeItem(itemId) {
          if (!currentOrderId) return;
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, { method: 'DELETE' });
          const response = await fetch('/api/orders/' + currentOrderId);
          const data = await response.json();
          if (data.order) renderCart(data.order, data.items);
        }
        
        async function processPayment() {
          const amount = parseInt(document.getElementById('amount-paid').value);
          if (!amount || amount <= 0) { alert('Masukkan jumlah uang yang dibayar!'); return; }
          const response = await fetch('/api/orders/' + currentOrderId + '/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPaid: amount })
          });
          const data = await response.json();
          if (data.error) { alert(data.error); }
          else { alert('Pembayaran berhasil!\\n\\n' + data.receipt); currentOrderId = null; document.getElementById('cart-zone').innerHTML = '<p class="text-gray-500 text-center mt-4">Pilih meja terlebih dahulu</p>'; location.reload(); }
        }
        
        async function cancelOrder() {
          if (!currentOrderId || !confirm('Batalkan pesanan?')) return;
          await fetch('/api/orders/' + currentOrderId + '/cancel', { method: 'POST' });
          currentOrderId = null;
          document.getElementById('cart-zone').innerHTML = '<p class="text-gray-500 text-center mt-4">Pilih meja terlebih dahulu</p>';
          location.reload();
        }
        
        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          location.reload();
        }
        
        document.addEventListener('click', function(e) {
          if (e.target.classList.contains('table-btn')) selectTable(e.target.dataset.tableId);
        });
        
        async function selectTable(tableId) {
          const response = await fetch('/api/tables/' + tableId);
          const table = await response.json();
          if (table.status === 'occupied') {
            const orderRes = await fetch('/api/orders/table/' + tableId);
            const orderData = await orderRes.json();
            if (orderData.order) { currentOrderId = orderData.order.id; renderCart(orderData.order, orderData.items); }
            return;
          }
          const token = localStorage.getItem('token');
          if (!token) { alert('Silakan login!'); window.location.href = '/login'; return; }
          const userRes = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
          const userData = await userRes.json();
          const createRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ tableId: parseInt(tableId), userId: userData.user.userId })
          });
          const newOrder = await createRes.json();
          currentOrderId = newOrder.id;
          renderCart(newOrder, []);
        }
      </script>
    `);
  })
  
  .get('/menu', async () => {
    const { getAllMenus } = await import('./repositories/menu');
    const menus = await getAllMenus();
    
    return htmlResponse(authCheckScript + `
      <div class="container mx-auto p-4">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">Menu Management</h1>
          <button onclick="showAddMenuModal()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">+ Tambah Menu</button>
        </div>
        
        <div class="mb-4">
          <button class="px-4 py-2 bg-blue-500 text-white rounded mr-2" onclick="filterMenus('all')">Semua</button>
          <button class="px-4 py-2 bg-gray-200 rounded mr-2" onclick="filterMenus('makanan')">Makanan</button>
          <button class="px-4 py-2 bg-gray-200 rounded" onclick="filterMenus('minuman')">Minuman</button>
        </div>
        
        <div class="bg-white rounded shadow overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100">
              <tr><th class="p-3 text-left">Nama</th><th class="p-3 text-left">Harga</th><th class="p-3 text-left">Kategori</th><th class="p-3 text-left">Status</th><th class="p-3 text-left">Aksi</th></tr>
            </thead>
            <tbody>
              ${menus.map(m => `
                <tr class="border-t menu-row" data-category="${m.category}">
                  <td class="p-3">${m.name}</td>
                  <td class="p-3">${m.price.toLocaleString('id-ID')}</td>
                  <td class="p-3"><span class="px-2 py-1 rounded text-sm ${m.category === 'makanan' ? 'bg-orange-100' : 'bg-blue-100'}">${m.category}</span></td>
                  <td class="p-3"><button onclick="toggleMenu(${m.id})" class="px-2 py-1 rounded text-sm ${m.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${m.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}</button></td>
                  <td class="p-3"><button onclick="editMenu(${m.id}, '${m.name}', ${m.price})" class="text-blue-500 mr-2">Edit</button><button onclick="deleteMenu(${m.id})" class="text-red-500">Hapus</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <script>
        function filterMenus(cat) {
          document.querySelectorAll('.menu-row').forEach(row => { row.style.display = (cat === 'all' || row.dataset.category === cat) ? '' : 'none'; });
        }
        async function toggleMenu(id) { await fetch('/api/menus/' + id + '/toggle', { method: 'PATCH' }); location.reload(); }
        async function deleteMenu(id) { if (!confirm('Hapus menu?')) return; await fetch('/api/menus/' + id, { method: 'DELETE' }); location.reload(); }
        function showAddMenuModal() {
          const name = prompt('Nama Menu:');
          if (!name) return;
          const price = parseInt(prompt('Harga:') || '0');
          if (price <= 0) { alert('Harga tidak valid'); return; }
          const category = prompt('Kategori (makanan/minuman):');
          if (category !== 'makanan' && category !== 'minuman') { alert('Kategori tidak valid'); return; }
          fetch('/api/menus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, category }) }).then(() => location.reload());
        }
        function editMenu(id, name, price) {
          const newName = prompt('Nama Menu:', name);
          if (!newName) return;
          const newPrice = parseInt(prompt('Harga:', price) || '0');
          if (newPrice <= 0) { alert('Harga tidak valid'); return; }
          fetch('/api/menus/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, price: newPrice }) }).then(() => location.reload());
        }
      </script>
    `);
  })
  
  .get('/tables', async () => {
    const { getAllTables } = await import('./repositories/table');
    const tables = await getAllTables();
    
    return htmlResponse(authCheckScript + `
      <div class="container mx-auto p-4">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">Table Management</h1>
          <button onclick="addTable()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">+ Tambah Meja</button>
        </div>
        
        <div class="grid grid-cols-4 gap-4">
          ${tables.map(t => `
            <div class="bg-white rounded shadow p-4 text-center">
              <div class="text-2xl font-bold mb-2">Meja ${t.tableNumber}</div>
              <div class="mb-2">
                <span class="px-2 py-1 rounded text-sm ${t.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${t.status === 'available' ? 'Tersedia' : 'Terisi'}</span>
              </div>
              <button onclick="deleteTable(${t.id})" class="text-red-500 text-sm">Hapus</button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <script>
        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          const res = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          const data = await res.json();
          if (data.error) { alert(data.error); return; }
          location.reload();
        }
        async function deleteTable(id) {
          if (!confirm('Hapus meja?')) return;
          await fetch('/api/tables/' + id, { method: 'DELETE' });
          location.reload();
        }
      </script>
    `);
  })
  
  .get('/orders', async () => {
    const { getOrdersTodayWithTables } = await import('./repositories/order');
    const { getUserById } = await import('./repositories/user');
    const orders = await getOrdersTodayWithTables();
    
    const ordersWithUser = await Promise.all(orders.map(async (o: any) => {
      const user = o.orders?.userId ? await getUserById(o.orders.userId) : null;
      return { ...o, userName: user?.name || 'Unknown' };
    }));
    
    const todayTotal = ordersWithUser.filter((o: any) => o.orders?.status === 'completed').reduce((sum: number, o: any) => sum + (o.orders?.total || 0), 0);
    
    return htmlResponse(authCheckScript + `
      <div class="container mx-auto p-4">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">Today's Orders</h1>
          <div class="text-xl font-bold">Total: Rp ${todayTotal.toLocaleString('id-ID')}</div>
        </div>
        
        <div class="space-y-4">
          ${ordersWithUser.length === 0 ? '<p class="text-gray-500">Belum ada pesanan hari ini</p>' : ''}
          ${ordersWithUser.map((o: any) => `
            <div class="bg-white rounded shadow p-4">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <span class="font-bold">Meja ${o.tables?.tableNumber || '-'}</span>
                  <span class="text-gray-500 ml-2">by ${o.userName}</span>
                </div>
                <span class="px-2 py-1 rounded text-sm ${o.orders?.status === 'completed' ? 'bg-green-100 text-green-800' : o.orders?.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${o.orders?.status === 'active' ? 'Aktif' : o.orders?.status === 'completed' ? 'Selesai' : 'Dibatal'}</span>
              </div>
              <div class="text-lg font-bold">Rp ${(o.orders?.total || 0).toLocaleString('id-ID')}</div>
              <div class="text-sm text-gray-500">${new Date(o.orders?.createdAt).toLocaleString('id-ID')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  })
  .listen(process.env.PORT || 3000);

console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);

export type App = typeof app;
