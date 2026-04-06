/// <reference lib="dom" />

console.log('POS client loaded');

const MENU_EMOJI = {
  makanan: ['🍛', '🍜', '🍗', '🍚', '🥘', '🍲', '🥩', '🍖', '🌮', '🍔'],
  minuman: ['🥤', '🧃', '☕', '🍵', '🥛', '🧊', '🍹', '🥝', '🍋', '🫖'],
};

function getMenuEmoji(category, index) {
  const list = MENU_EMOJI[category] ?? ['🍽️'];
  return list[index % list.length] ?? '🍽️';
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `pos-toast pos-toast-${type}`;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

const state = {
  currentOrderId: null,
  currentUserId: 0,
  selectedTableId: null,
  currentTableNumber: null,
  isServerOrder: false,
  orderType: null,
  guestCount: 1,
  currentTotal: 0,
  paymentConfirmed: false,
};

function setCurrentUserId(userId) {
  state.currentUserId = userId;
}

function startDineIn() {
  state.orderType = 'dine-in';
  document.getElementById('order-type-selection').style.display = 'none';
  document.getElementById('pos-tables').style.display = 'block';
  document.getElementById('cart-title').textContent = 'Pilih Meja';
  document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
  showResetOrderTypeButton();
}

function startTakeaway() {
  state.orderType = 'takeaway';
  document.getElementById('order-type-selection').style.display = 'none';
  document.getElementById('pos-tables').style.display = 'none';
  document.getElementById('cart-title').textContent = 'Takeaway';
  document.getElementById('cart-meta').style.display = 'flex';
  document.getElementById('guest-count').value = '1';
  document.getElementById('order-type').value = 'takeaway';
  document.getElementById('cart-footer').style.display = 'block';
  document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Tambahkan menu</div>';
  showResetOrderTypeButton();
}

function showResetOrderTypeButton() {
  let btn = document.getElementById('reset-order-type-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'reset-order-type-btn';
    btn.className = 'pos-btn';
    btn.style.marginLeft = '8px';
    btn.style.fontSize = '11px';
    btn.style.padding = '4px 8px';
    btn.textContent = '↻ Ubah Tipe';
    btn.onclick = resetOrderType;
    const headerRight = document.querySelector('.pos-header-right');
    if (headerRight) headerRight.appendChild(btn);
  }
  btn.style.display = 'inline-block';
}

function resetOrderType() {
  state.orderType = null;
  state.selectedTableId = null;
  state.currentTableNumber = null;
  document.getElementById('order-type-selection').style.display = 'flex';
  document.getElementById('pos-tables').style.display = 'none';
  document.getElementById('cart-title').textContent = 'Pilih Jenis Pesanan';
  document.getElementById('cart-meta').style.display = 'none';
  document.getElementById('cart-footer').style.display = 'none';
  document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih Dine-in atau Takeaway</div>';
  document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
  const resetBtn = document.getElementById('reset-order-type-btn');
  if (resetBtn) resetBtn.style.display = 'none';
  clearCart();
}

function saveCart(cart) { localStorage.setItem('pos-cart', JSON.stringify(cart)); }
function loadCart() { try { return JSON.parse(localStorage.getItem('pos-cart')); } catch { return null; } }
function clearCart() { localStorage.removeItem('pos-cart'); }
function getCart() {
  const c = loadCart();
  return c && c.tableId === state.selectedTableId ? c : null;
}

function addToCartLocal(id, name, price, event) {
  let c = getCart();
  if (!c) c = { tableId: state.orderType === 'takeaway' ? null : state.selectedTableId, tableNumber: state.orderType === 'takeaway' ? null : state.currentTableNumber, items: [], orderType: state.orderType, guestCount: state.guestCount };
  const exist = c.items.find(i => i.menuId === id);
  if (exist) exist.quantity += 1;
  else c.items.push({ menuId: id, name, price, quantity: 1, notes: '' });
  saveCart(c);
  renderCart();
  const row = event.target.closest('tr');
  if (row) { row.classList.add('added'); setTimeout(() => row.classList.remove('added'), 200); }
  toast(name + ' ditambahkan');
}

function removeItem(id) {
  let c = getCart();
  if (!c) return;
  c.items = c.items.filter(i => i.menuId !== id);
  if (c.items.length === 0) clearCart();
  else saveCart(c);
  renderCart();
}

function qtyChange(id, delta) {
  let c = getCart();
  if (!c) return;
  const item = c.items.find(i => i.menuId === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) { removeItem(id); return; }
  saveCart(c);
  renderCart();
}

function editItemNotes(id) {
  let c = getCart();
  if (!c) return;
  const item = c.items.find(i => i.menuId === id);
  if (!item) return;
  const notes = prompt('Catatan untuk ' + item.name + ':', item.notes || '');
  if (notes !== null) {
    item.notes = notes;
    saveCart(c);
    renderCart();
  }
}

function renderCart() {
  const c = getCart();
  const itemsEl = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const meta = document.getElementById('cart-meta');

  if (!c || c.items.length === 0) {
    itemsEl.innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
    footer.style.display = 'none';
    meta.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  meta.style.display = 'flex';
  document.getElementById('guest-count').value = c.guestCount || 1;
  document.getElementById('order-type').value = c.orderType || 'dine-in';

  let html = '';
  c.items.forEach(item => {
    const notesHtml = item.notes ? '<div class="pos-cart-item-notes">' + item.notes + '</div>' : '';
    html += '<div class="pos-cart-item">' +
      '<div class="pos-cart-item-info"><div class="pos-cart-item-name">' + item.name + '</div>' +
      notesHtml +
      '<div class="pos-cart-item-qty"><button onclick="qtyChange(' + item.menuId + ',-1)">-</button><span>x' + item.quantity + '</span><button onclick="qtyChange(' + item.menuId + ',1)">+</button></div></div>' +
      '<div class="pos-cart-item-price">' + (item.price * item.quantity).toLocaleString('id-ID') + '</div>' +
      '<button class="pos-cart-item-notes-btn" onclick="editItemNotes(' + item.menuId + ')" title="Tambah catatan">📝</button>' +
      '<button class="pos-cart-item-remove" onclick="removeItem(' + item.menuId + ')">&times;</button></div>';
  });
  itemsEl.innerHTML = html;

  const subtotal = c.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const disc = parseInt(document.getElementById('discount-input').value) || 0;
  const discType = document.getElementById('discount-type').value;
  let discAmt = discType === 'percentage' ? Math.round(subtotal * disc / 100) : disc;
  if (discAmt > subtotal) discAmt = subtotal;
  const total = subtotal + tax - discAmt;

  document.getElementById('summary-subtotal').textContent = subtotal.toLocaleString('id-ID');
  document.getElementById('summary-tax').textContent = tax.toLocaleString('id-ID');
  document.getElementById('summary-total').textContent = total.toLocaleString('id-ID');
  state.currentTotal = total;
}

function filterCategory(cat, btn) {
  document.querySelectorAll('.pos-category').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const search = document.querySelector('.pos-search').value.toLowerCase();
  document.querySelectorAll('#menu-table-body tr').forEach(row => {
    const matchCat = cat === 'all' || row.dataset.category === cat;
    const matchSearch = !search || row.dataset.name.includes(search);
    row.style.display = (matchCat && matchSearch) ? '' : 'none';
  });
}

function searchMenu(query) {
  const active = document.querySelector('.pos-category.active');
  const cat = active?.textContent?.includes('Makanan') ? 'makanan' : active?.textContent?.includes('Minuman') ? 'minuman' : 'all';
  document.querySelectorAll('#menu-table-body tr').forEach(row => {
    const matchCat = cat === 'all' || row.dataset.category === cat;
    const matchSearch = !query || row.dataset.name.includes(query.toLowerCase());
    row.style.display = (matchCat && matchSearch) ? '' : 'none';
  });
}

function addToCart(id, name, price, event) {
  if (!state.orderType) { toast('Pilih dulu: Dine-in atau Takeaway', 'warning'); return; }
  if (state.orderType === 'dine-in' && !state.selectedTableId) { toast('Pilih meja terlebih dahulu!', 'warning'); return; }
  if (state.isServerOrder && state.currentOrderId) { addToCartServer(id); }
  else { addToCartLocal(id, name, price, event); }
}

async function addToCartServer(menuId) {
  const res = await fetch('/api/orders/' + state.currentOrderId + '/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menuId, quantity: 1 }) });
  if (res.ok) {
    const data = await res.json();
    renderServerCart(data.order, data.items);
    toast('Item ditambahkan');
  }
}

async function selectTable(id, num, status) {
  if (state.orderType === 'takeaway') return;
  if (state.selectedTableId === id) return;

  document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
  document.querySelector('[data-id="' + id + '"]').classList.add('selected');
  state.selectedTableId = id;
  state.currentTableNumber = num;
  state.currentOrderId = null;
  state.isServerOrder = false;

  document.getElementById('btn-kosongkan').style.display = 'none';
  document.getElementById('btn-transfer').style.display = 'none';

  if (status === 'occupied') {
    const res = await fetch('/api/orders/table/' + id);
    const data = await res.json();
    state.currentOrderId = data.order ? data.order.id : null;
    state.isServerOrder = !!data.order;
    document.getElementById('cart-title').textContent = 'Meja ' + num;
    
    // Show Kosongkan Meja button if table is occupied (even without active order)
    document.getElementById('btn-kosongkan').style.display = 'inline';
    
    if (data.order) {
      document.getElementById('btn-transfer').style.display = 'inline';
      renderServerCart(data.order, data.items, true);
    } else {
      // Table is occupied but has no order - show empty cart state but still allow kosongkan
      document.getElementById('btn-transfer').style.display = 'none';
      document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Meja ' + num + ' - Tambahkan menu</div>';
      document.getElementById('cart-meta').style.display = 'none';
      document.getElementById('cart-footer').style.display = 'block';
    }
    return;
  }

  const local = loadCart();
  if (local && local.tableId === id) {
    document.getElementById('cart-title').textContent = 'Meja ' + num;
    if (local.items.length > 0) {
      document.getElementById('btn-transfer').style.display = 'inline';
      document.getElementById('btn-kosongkan').style.display = 'inline';
    }
    renderCart();
    return;
  }

  clearCart();
  state.orderType = 'dine-in';
  state.guestCount = 1;
  document.getElementById('cart-title').textContent = 'Meja ' + num;
  document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Meja ' + num + ' - Tambahkan menu</div>';
  document.getElementById('cart-footer').style.display = 'none';
  document.getElementById('cart-meta').style.display = 'none';
}

async function addTable() {
  const num = prompt('Nomor Meja:');
  if (!num) return;
  await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: parseInt(num) }) });
  location.reload();
}

async function kosongkanMeja() {
  if (!state.selectedTableId) { toast('Pilih meja dulu', 'warning'); return; }
  if (!confirm('Kosongkan meja ini? (Semua pesanan akan dibatalkan)')) return;
  if (state.currentOrderId) {
    await fetch('/api/orders/' + state.currentOrderId + '/cancel', { method: 'POST' });
  }
  await fetch('/api/tables/' + state.selectedTableId, { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ status: 'available' }) 
  });
  toast('Meja dikosongkan');
  location.reload();
}

function renderServerCart(order, items, readOnly = false) {
  document.getElementById('cart-meta').style.display = 'flex';
  document.getElementById('cart-footer').style.display = 'block';

  let html = '';
  items.forEach(item => {
    const qtyControls = readOnly 
      ? '<span class="pos-cart-item-qty-readonly">x' + item.quantity + '</span>'
      : '<div class="pos-cart-item-qty"><button onclick="updateServerQty(' + item.id + ',-1)">-</button><span>x' + item.quantity + '</span><button onclick="updateServerQty(' + item.id + ',1)">+</button></div>';
    const removeBtn = readOnly ? '' : '<button class="pos-cart-item-remove" onclick="removeServerItem(' + item.id + ')">&times;</button>';
    
    html += '<div class="pos-cart-item">' +
      '<div class="pos-cart-item-info"><div class="pos-cart-item-name">' + (item.menuName || 'Item') + '</div>' +
      qtyControls + '</div>' +
      '<div class="pos-cart-item-price">' + (item.priceAtOrder * item.quantity).toLocaleString('id-ID') + '</div>' +
      removeBtn + '</div>';
  });
  
  if (readOnly) {
    html += '<div class="pos-cart-readonly-notice">Pesanan lama - tidak dapat diedit</div>';
  }
  
  document.getElementById('cart-items').innerHTML = html;

  document.getElementById('summary-subtotal').textContent = (order.subtotal || 0).toLocaleString('id-ID');
  document.getElementById('summary-tax').textContent = (order.tax || 0).toLocaleString('id-ID');
  document.getElementById('summary-total').textContent = (order.total || 0).toLocaleString('id-ID');
}

async function updateServerQty(itemId, delta) {
  const span = document.querySelector('[onclick*="updateServerQty(' + itemId + '"]')?.parentElement?.querySelector('span');
  const qty = parseInt(span?.textContent?.replace('x', '') || '1') + delta;
  if (qty <= 0) { removeServerItem(itemId); return; }
  await fetch('/api/orders/' + state.currentOrderId + '/items/' + itemId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: qty }) });
  const res = await fetch('/api/orders/' + state.currentOrderId);
  const data = await res.json();
  if (data.order) renderServerCart(data.order, data.items);
}

async function removeServerItem(itemId) {
  await fetch('/api/orders/' + state.currentOrderId + '/items/' + itemId, { method: 'DELETE' });
  const res = await fetch('/api/orders/' + state.currentOrderId);
  const data = await res.json();
  if (data.order) renderServerCart(data.order, data.items);
}

function togglePayment() {
  const section = document.getElementById('payment-section');
  if (section.classList.contains('show')) {
    section.classList.remove('show');
  } else {
    if (!getCart() && !state.isServerOrder) { toast('Cart kosong!', 'warning'); return; }
    section.classList.add('show');
    document.getElementById('paid-input').value = '';
    document.getElementById('paid-amount').textContent = '0';
    document.getElementById('paid-change').textContent = '0';
    setTimeout(() => document.getElementById('paid-input').focus(), 100);
  }
}

function showPaymentConfirmation() {
  const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
  const paid = parseInt(document.getElementById('paid-input').value) || 0;
  
  if (paid < total) {
    toast('Uang kurang!', 'error');
    return;
  }

  const orderTypeLabel = state.orderType === 'dine-in' ? 'Dine-in' : 'Takeaway';
  const tableInfo = state.orderType === 'dine-in' ? `Meja ${state.currentTableNumber || '-'}` : 'Takeaway';
  const change = paid - total;
  
  document.getElementById('confirm-order-type').textContent = orderTypeLabel;
  document.getElementById('confirm-table-info').textContent = tableInfo;
  document.getElementById('confirm-total').textContent = total.toLocaleString('id-ID');
  document.getElementById('confirm-paid').textContent = paid.toLocaleString('id-ID');
  document.getElementById('confirm-change').textContent = change.toLocaleString('id-ID');
  
  document.getElementById('payment-confirm-modal').classList.add('show');
}

function closePaymentConfirm() {
  document.getElementById('payment-confirm-modal').classList.remove('show');
}

async function confirmPayment() {
  state.paymentConfirmed = true;
  closePaymentConfirm();
  
  const cancelBtn = document.querySelector('.pos-btn-danger');
  if (cancelBtn) {
    cancelBtn.disabled = true;
    cancelBtn.style.opacity = '0.5';
    cancelBtn.style.cursor = 'not-allowed';
    cancelBtn.textContent = 'Terbayar';
  }
  
  await processPayment();
}

function updatePaid(val) {
  const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
  const paid = parseInt(val) || 0;
  document.getElementById('paid-amount').textContent = paid.toLocaleString('id-ID');
  const change = paid - total;
  const changeEl = document.getElementById('paid-change');
  changeEl.textContent = change >= 0 ? change.toLocaleString('id-ID') : 'Kurang ' + Math.abs(change).toLocaleString('id-ID');
  changeEl.style.color = change >= 0 ? 'var(--color-success)' : 'var(--color-error)';
}

function setPaid(amount) {
  const totalEl = document.getElementById('summary-total');
  const total = parseInt(totalEl.textContent.replace(/\./g, '')) || 0;
  let paid;
  if (amount === 'exact') {
    paid = total;
  } else {
    paid = amount;
  }
  const inputEl = document.getElementById('paid-input');
  inputEl.value = paid;
  updatePaid(String(paid));
}

async function processPayment() {
  const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
  const paid = parseInt(document.getElementById('paid-input').value) || 0;
  if (paid < total) { toast('Uang kurang!', 'error'); return; }

  try {
    let cart = getCart();
    if (!state.isServerOrder && !state.currentOrderId) {
      if (!cart) cart = { tableId: state.selectedTableId, tableNumber: state.currentTableNumber, items: [], orderType: state.orderType, guestCount: state.guestCount };
      localStorage.setItem('last-receipt', JSON.stringify({ ...cart, orderType: state.orderType }));
      
      const orderData = { userId: state.currentUserId, items: cart.items.map(i => ({ menuId: i.menuId, quantity: i.quantity, notes: i.notes || '' })), orderType: state.orderType };
      if (cart.tableId != null) orderData.tableId = cart.tableId;
      
      const res = await fetch('/api/orders/with-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
      const data = await res.json();
      if (data.error) { toast(data.error, 'error'); return; }
      state.currentOrderId = data.order.id;
      state.isServerOrder = true;
      clearCart();
    } else if (state.isServerOrder) {
      const stored = localStorage.getItem('last-receipt');
      if (stored) {
        cart = JSON.parse(stored);
      } else {
        cart = { tableId: state.selectedTableId, tableNumber: state.currentTableNumber, items: [], orderType: state.orderType, guestCount: state.guestCount };
      }
      cart.orderType = state.orderType;
      localStorage.setItem('last-receipt', JSON.stringify(cart));
    }

    const res = await fetch('/api/orders/' + state.currentOrderId + '/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPaid: paid }) });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); }
    else {
      toast('Pembayaran berhasil!');
      printReceipt();
      resetAfterPayment();
    }
  } catch (e) {
    console.error('Payment error:', e);
    toast('Payment failed: ' + e.message, 'error');
  }
}

function resetAfterPayment() {
  state.currentOrderId = null;
  state.isServerOrder = false;
  state.selectedTableId = null;
  state.currentTableNumber = null;
  state.orderType = null;
  state.paymentConfirmed = false;
  document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
  document.getElementById('cart-title').textContent = 'Pilih Jenis Pesanan';
  document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih Dine-in atau Takeaway</div>';
  document.getElementById('cart-footer').style.display = 'none';
  document.getElementById('cart-meta').style.display = 'none';
  document.getElementById('payment-section').classList.remove('show');
  document.getElementById('order-type-selection').style.display = 'flex';
  
  const cancelBtn = document.querySelector('.pos-btn-danger');
  if (cancelBtn) {
    cancelBtn.disabled = false;
    cancelBtn.style.opacity = '1';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.textContent = 'Batal';
  }
  
  const resetBtn = document.getElementById('reset-order-type-btn');
  if (resetBtn) resetBtn.style.display = 'none';
}

function printReceipt() {
  let cart = getCart();
  if ((!cart || cart.items.length === 0)) {
    const stored = localStorage.getItem('last-receipt');
    if (stored) cart = JSON.parse(stored);
  }
  if (!cart || cart.items.length === 0) { toast('Tidak ada data receipt!', 'warning'); return; }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const disc = parseInt(document.getElementById('discount-input').value) || 0;
  const discType = document.getElementById('discount-type').value;
  let discAmt = discType === 'percentage' ? Math.round(subtotal * disc / 100) : disc;
  if (discAmt > subtotal) discAmt = subtotal;
  const total = subtotal + tax - discAmt;
  const paid = parseInt(document.getElementById('paid-input').value) || total;
  const change = paid - total;

  const orderTypeLabel = cart.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN';
  const tableInfo = cart.orderType === 'takeaway' ? '-' : (cart.tableNumber || '-');
  const guestInfo = cart.orderType === 'takeaway' ? (cart.guestCount || 1) + ' pax' : (cart.guestCount || 1) + ' orang';

  const receiptHtml = '<div style="font-family:monospace;font-size:12px;padding:10px;max-width:300px;">' +
    '<div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">' +
    '<strong>RESTORAN</strong><br>Jl. Contoh No.123<br>Telp: 012-3456789</div>' +
    '<div style="margin-bottom:8px;font-weight:bold;padding:4px;background:#000;color:#fff;text-align:center;">' + orderTypeLabel + '</div>' +
    '<div style="margin-bottom:4px;">Meja: ' + tableInfo + ' | Tamu: ' + guestInfo + '</div>' +
    '<div style="margin-bottom:8px;">' + new Date().toLocaleString('id-ID') + '</div>' +
    '<div style="border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:8px;">' +
    cart.items.map(i => '<div style="display:flex;justify-content:space-between;"><span>' + i.quantity + 'x ' + i.name + '</span><span>' + (i.price * i.quantity).toLocaleString('id-ID') + '</span></div>' + (i.notes ? '<div style="font-size:10px;color:#666;margin-left:10px;">* ' + i.notes + '</div>' : '')).join('') +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>' + subtotal.toLocaleString('id-ID') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Pajak (10%)</span><span>' + tax.toLocaleString('id-ID') + '</span></div>' +
    (discAmt > 0 ? '<div style="display:flex;justify-content:space-between;"><span>Diskon</span><span>-' + discAmt.toLocaleString('id-ID') + '</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px dashed #000;padding-top:4px;margin-top:4px;"><span>TOTAL</span><span>' + total.toLocaleString('id-ID') + '</span></div>' +
    '<div style="margin-top:8px;padding-top:4px;border-top:1px dashed #000;">' +
    '<div style="display:flex;justify-content:space-between;"><span>Bayar</span><span>' + paid.toLocaleString('id-ID') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Kembali</span><span>' + change.toLocaleString('id-ID') + '</span></div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:12px;font-size:10px;">' +
    (cart.orderType === 'takeaway' ? 'Silakan mengambil pesanan di counter' : 'Terima kasih atas kunjungan Anda!') +
    '</div>' +
    '<div style="text-align:center;margin-top:8px;font-size:9px;color:#888;">No. Pesanan: ' + (state.currentOrderId || Math.floor(Math.random() * 10000)) + '</div>' +
    '</div>';

  const printWindow = window.open('', '', 'width=300,height=500');
  printWindow.document.write('<html><head><title>Struk</title></head><body>' + receiptHtml + '</body></html>');
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
}

function holdOrder() {
  const cart = getCart();
  if (!cart || cart.items.length === 0) { toast('Cart kosong!', 'warning'); return; }
  const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
  held.push({ ...cart, heldAt: new Date().toISOString() });
  localStorage.setItem('pos-held', JSON.stringify(held));
  clearCart();
  renderCart();
  updateHeldCount();
  toast('Pesanan dihold');
}

function showHeldOrders() {
  const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
  const list = document.getElementById('held-list');
  if (held.length === 0) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary)">Tidak ada pesanan hold</div>'; }
  else { list.innerHTML = held.map((h, i) => '<div class="pos-held-item" onclick="recallOrder(' + i + ')"><div><strong>Meja ' + h.tableNumber + '</strong><div style="font-size:11px;color:var(--color-text-secondary)">' + h.items.map(i => i.name + ' x' + i.quantity).join(', ') + '</div></div><div style="font-size:11px">' + new Date(h.heldAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '</div></div>').join(''); }
  document.getElementById('held-modal').classList.add('show');
}

function closeHeld() { document.getElementById('held-modal').classList.remove('show'); }

function recallOrder(index) {
  const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
  const order = held.splice(index, 1)[0];
  localStorage.setItem('pos-held', JSON.stringify(held));
  state.selectedTableId = order.tableId;
  state.currentTableNumber = order.tableNumber;
  state.orderType = order.orderType || 'dine-in';
  state.guestCount = order.guestCount || 1;
  saveCart(order);
  document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector('[data-id="' + order.tableId + '"]');
  if (btn) btn.classList.add('selected');
  document.getElementById('cart-title').textContent = 'Meja ' + order.tableNumber;
  renderCart();
  updateHeldCount();
  closeHeld();
  toast('Pesanan dipanggil');
}

function updateHeldCount() {
  const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
  document.getElementById('held-count').textContent = held.length;
}

function showTransfer() {
  if (!state.currentOrderId) return;
  document.getElementById('transfer-from').textContent = state.currentTableNumber;
  const targets = document.getElementById('transfer-targets');
  targets.innerHTML = '';
  document.querySelectorAll('.pos-table.available').forEach(btn => {
    const id = parseInt(btn.dataset.id);
    const num = parseInt(btn.textContent);
    const el = document.createElement('button');
    el.className = 'pos-table available';
    el.style.cssText = 'aspect-ratio:1;cursor:pointer;';
    el.textContent = num;
    el.onclick = () => transferTable(id, num);
    targets.appendChild(el);
  });
  document.getElementById('transfer-modal').classList.add('show');
}

function closeTransfer() { document.getElementById('transfer-modal').classList.remove('show'); }

async function transferTable(newId, newNum) {
  const res = await fetch('/api/orders/' + state.currentOrderId + '/transfer', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newTableId: newId }) });
  const data = await res.json();
  if (data.error) { toast(data.error, 'error'); return; }
  toast('Dipindah ke Meja ' + newNum);
  state.currentTableNumber = newNum;
  state.selectedTableId = newId;
  document.getElementById('cart-title').textContent = 'Meja ' + newNum;
  document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
  document.querySelector('[data-id="' + newId + '"]')?.classList.add('selected');
  closeTransfer();
}

function cancelOrder() {
  if (!state.currentOrderId && !getCart()) { toast('Tidak ada pesanan', 'warning'); return; }
  if (state.isServerOrder && state.currentOrderId) {
    if (!confirm('Batalkan pesanan?')) return;
    fetch('/api/orders/' + state.currentOrderId + '/cancel', { method: 'POST' });
    toast('Pesanan dibatalkan');
  } else {
    clearCart();
    toast('Cart dikosongkan');
  }
  resetAfterPayment();
}

function initPOS(userId) {
  if (typeof currentUserId !== 'undefined') {
    setCurrentUserId(currentUserId);
  } else if (userId) {
    setCurrentUserId(userId);
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.querySelector('.pos-search').focus(); }
    if (e.ctrlKey && e.key === 'h') { e.preventDefault(); holdOrder(); }
    if (e.key === 'Escape') {
      state.selectedTableId = null;
      state.currentTableNumber = null;
      state.currentOrderId = null;
      state.isServerOrder = false;
      document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
      document.getElementById('cart-title').textContent = 'Pilih Meja';
      document.getElementById('btn-transfer').style.display = 'none';
      document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
      document.getElementById('cart-footer').style.display = 'none';
      document.getElementById('cart-meta').style.display = 'none';
      document.querySelectorAll('.pos-modal.show').forEach(m => m.classList.remove('show'));
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateHeldCount();
    const saved = loadCart();
    if (saved && saved.tableId) {
      const btn = document.querySelector('[data-id="' + saved.tableId + '"]');
      if (btn) {
        state.selectedTableId = saved.tableId;
        state.currentTableNumber = saved.tableNumber;
        btn.classList.add('selected');
        document.getElementById('cart-title').textContent = 'Meja ' + saved.tableNumber;
        document.getElementById('cart-meta').style.display = 'flex';
        renderCart();
      }
    }
  });
}

initPOS(null);