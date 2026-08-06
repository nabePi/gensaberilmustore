(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var CATEGORY_NAMES = {
    new: 'Buku Baru', bestseller: 'Bestseller', intl: 'Intl Bestseller',
    keislaman: 'Keislaman', klasik: 'Klasik & Rekomendasi', lainnya: 'Lainnya', custom: 'Custom'
  };

  var CATEGORY_MAP = {};

  var cart = [];
  var products = [];
  var searchInput = document.getElementById('posSearch');
  var categoryFilter = document.getElementById('posCategory');
  var productGrid = document.getElementById('posProductGrid');
  var productEmpty = document.getElementById('posProductEmpty');
  var cartBody = document.getElementById('posCartBody');
  var cartTotal = document.getElementById('posCartTotal');
  var checkoutBtn = document.getElementById('posCheckoutBtn');
  var clearCartBtn = document.getElementById('posClearCart');
  var posCount = document.getElementById('posCount');
  var paymentMethod = document.getElementById('posPaymentMethod');
  var customerName = document.getElementById('posCustomerName');
  var customerPhone = document.getElementById('posCustomerPhone');
  var notes = document.getElementById('posNotes');
  var historyTable = document.getElementById('posHistoryTable');
  var historyEmpty = document.getElementById('posHistoryEmpty');
  var clearHistoryBtn = document.getElementById('posClearHistoryBtn');

  function buildCategoryMap() {
    CATEGORY_MAP = {};
    if (typeof newBooks !== 'undefined') newBooks.forEach(function(p) { CATEGORY_MAP[p.id] = 'new'; });
    if (typeof bestseller !== 'undefined') bestseller.forEach(function(p) { CATEGORY_MAP[p.id] = 'bestseller'; });
    if (typeof intlBestseller !== 'undefined') intlBestseller.forEach(function(p) { CATEGORY_MAP[p.id] = 'intl'; });
    if (typeof keislaman !== 'undefined') keislaman.forEach(function(p) { CATEGORY_MAP[p.id] = 'keislaman'; });
    if (typeof klasik !== 'undefined') klasik.forEach(function(p) { CATEGORY_MAP[p.id] = 'klasik'; });
    if (typeof lainnya !== 'undefined') lainnya.forEach(function(p) { CATEGORY_MAP[p.id] = 'lainnya'; });
    A.customProducts().forEach(function(p) { CATEGORY_MAP[p.id] = 'custom'; });
  }

  function availableStock(p) {
    if (p.stock != null) return p.stock;
    return 100;
  }

  function addToCart(id) {
    var p = A.findProduct(id);
    if (!p) return;
    var existing = cart.find(function(item) { return item.id === id; });
    var stock = availableStock(p);
    if (existing) {
      if (existing.qty >= stock) {
        A.showToast('Stok produk tidak mencukupi');
        return;
      }
      existing.qty += 1;
      existing.subtotal = existing.qty * existing.finalPrice;
    } else {
      if (stock < 1) {
        A.showToast('Produk tidak tersedia');
        return;
      }
      cart.push({ id: p.id, title: p.title, author: p.author, image: p.image, finalPrice: p.finalPrice || p.price, qty: 1, subtotal: p.finalPrice || p.price });
    }
    renderCart();
    renderProducts();
  }

  function updateQty(id, delta) {
    var p = A.findProduct(id);
    if (!p) return;
    var item = cart.find(function(i) { return i.id === id; });
    if (!item) return;
    var newQty = item.qty + delta;
    var stock = availableStock(p);
    if (newQty > stock) {
      A.showToast('Stok produk tidak mencukupi');
      return;
    }
    if (newQty < 1) {
      cart = cart.filter(function(i) { return i.id !== id; });
    } else {
      item.qty = newQty;
      item.subtotal = item.qty * item.finalPrice;
    }
    renderCart();
    renderProducts();
  }

  function removeFromCart(id) {
    cart = cart.filter(function(i) { return i.id !== id; });
    renderCart();
    renderProducts();
  }

  function clearCart() {
    cart = [];
    customerName.value = '';
    customerPhone.value = '';
    notes.value = '';
    paymentMethod.value = 'Tunai';
    renderCart();
    renderProducts();
  }

  function cartTotalAmount() {
    return cart.reduce(function(sum, item) { return sum + item.subtotal; }, 0);
  }

  function renderCart() {
    if (cart.length === 0) {
      cartBody.innerHTML = '<div class="pos-cart-empty">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12zM6 6L5 3M10 12h.01M14 12h.01M20 21H6a2 2 0 01-2-2v-2h14v2a2 2 0 002 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<p>Keranjang masih kosong.<br>Pilih produk dari katalog.</p>' +
      '</div>';
      checkoutBtn.disabled = true;
    } else {
      var html = '<div class="pos-cart-items">';
      cart.forEach(function(item) {
        html += '<div class="pos-cart-item">' +
          '<img src="' + A.escapeHtml(item.image || '') + '" alt="" class="pos-cart-item-img">' +
          '<div class="pos-cart-item-info">' +
            '<p class="pos-cart-item-title">' + A.escapeHtml(item.title) + '</p>' +
            '<p class="pos-cart-item-price">' + A.rupiah(item.finalPrice) + '</p>' +
          '</div>' +
          '<div class="pos-qty-control">' +
            '<button type="button" class="pos-qty-btn" data-id="' + A.escapeHtml(item.id) + '" data-delta="-1">-</button>' +
            '<span class="pos-qty-value">' + item.qty + '</span>' +
            '<button type="button" class="pos-qty-btn" data-id="' + A.escapeHtml(item.id) + '" data-delta="1">+</button>' +
          '</div>' +
          '<strong class="pos-cart-item-subtotal">' + A.rupiah(item.subtotal) + '</strong>' +
          '<button type="button" class="pos-cart-item-remove" data-id="' + A.escapeHtml(item.id) + '" aria-label="Hapus">&times;</button>' +
        '</div>';
      });
      html += '</div>';
      cartBody.innerHTML = html;

      cartBody.querySelectorAll('.pos-qty-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { updateQty(btn.dataset.id, parseInt(btn.dataset.delta, 10)); });
      });
      cartBody.querySelectorAll('.pos-cart-item-remove').forEach(function(btn) {
        btn.addEventListener('click', function() { removeFromCart(btn.dataset.id); });
      });
      checkoutBtn.disabled = false;
    }
    cartTotal.textContent = A.rupiah(cartTotalAmount());
    posCount.textContent = cart.length + ' item';
  }

  function renderProducts() {
    buildCategoryMap();
    products = A.allProducts();
    var query = (searchInput.value || '').toLowerCase();
    var cat = categoryFilter.value;

    var filtered = products.filter(function(p) {
      if (cat && CATEGORY_MAP[p.id] !== cat) return false;
      if (query) {
        var title = (p.title || '').toLowerCase();
        var author = (p.author || '').toLowerCase();
        if (title.indexOf(query) === -1 && author.indexOf(query) === -1) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      productGrid.innerHTML = '';
      productEmpty.style.display = '';
      return;
    }
    productEmpty.style.display = 'none';

    var html = '';
    filtered.forEach(function(p) {
      var stock = availableStock(p);
      var inCart = cart.find(function(i) { return i.id === p.id; });
      var cartQty = inCart ? inCart.qty : 0;
      var outOfStock = stock < 1 || (cartQty >= stock && stock > 0);
      var catName = CATEGORY_NAMES[CATEGORY_MAP[p.id]] || '';
      html += '<div class="pos-product-card' + (outOfStock ? ' pos-product-card--disabled' : '') + '" data-id="' + A.escapeHtml(p.id) + '">' +
        '<div class="pos-product-card-img-wrap">' +
          '<img src="' + A.escapeHtml(p.image || '') + '" alt="" class="pos-product-card-img">' +
          (catName ? '<span class="pos-product-card-cat">' + A.escapeHtml(catName) + '</span>' : '') +
        '</div>' +
        '<div class="pos-product-card-body">' +
          '<p class="pos-product-card-title">' + A.escapeHtml(p.title) + '</p>' +
          '<p class="pos-product-card-author">' + A.escapeHtml(p.author || '') + '</p>' +
          '<div class="pos-product-card-foot">' +
            '<strong class="pos-product-card-price">' + A.rupiah(p.finalPrice || p.price) + '</strong>' +
            '<span class="pos-product-card-stock">' + (stock < 10 ? 'Stok: ' + stock : '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    });
    productGrid.innerHTML = html;

    productGrid.querySelectorAll('.pos-product-card').forEach(function(card) {
      card.addEventListener('click', function() {
        if (card.classList.contains('pos-product-card--disabled')) return;
        addToCart(card.dataset.id);
      });
    });
  }

  function renderHistory() {
    var orders = A.allOrders().filter(function(o) { return o.isPos || o.source === 'pos'; });
    orders.sort(function(a, b) { return b.id > a.id ? 1 : -1; });

    if (orders.length === 0) {
      historyTable.innerHTML = '';
      historyEmpty.style.display = '';
      return;
    }
    historyEmpty.style.display = 'none';

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>ID</th><th>Pelanggan</th><th>Items</th><th>Total</th><th>Pembayaran</th><th>Tanggal</th><th>Aksi</th>' +
      '</tr></thead><tbody>';
    orders.forEach(function(o) {
      var itemCount = (o.items || []).length;
      var itemNames = (o.items || []).slice(0, 2).map(function(it) { return it.title; }).join(', ');
      if (itemCount > 2) itemNames += ' +' + (itemCount - 2) + ' lainnya';
      html += '<tr>' +
        '<td><strong>#' + A.escapeHtml(o.id) + '</strong><span class="admin-tag admin-tag--blue">POS</span></td>' +
        '<td><div class="admin-cell-main">' + A.escapeHtml(o.customerName || 'Pelanggan POS') + '</div>' +
          (o.customerPhone ? '<div class="admin-cell-sub">' + A.escapeHtml(o.customerPhone) + '</div>' : '') + '</td>' +
        '<td><div class="admin-cell-main">' + A.escapeHtml(itemNames || '-') + '</div><div class="admin-cell-sub">' + itemCount + ' item</div></td>' +
        '<td><strong>' + A.escapeHtml(o.total || '-') + '</strong></td>' +
        '<td>' + A.escapeHtml(o.paymentMethod || '-') + '</td>' +
        '<td>' + A.shortDate(o.date) + '</td>' +
        '<td><div class="admin-actions">' +
          '<button type="button" class="btn btn-outline btn-sm receipt-btn" data-id="' + A.escapeHtml(o.id) + '">Struk</button>' +
        '</div></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    historyTable.innerHTML = html;

    historyTable.querySelectorAll('.receipt-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { showReceipt(btn.dataset.id); });
    });
  }

  function buildReceiptHTML(o) {
    var settings = A.getSettings();
    var itemsHTML = (o.items || []).map(function(it) {
      return '<div class="pos-receipt-row">' +
        '<span>' + A.escapeHtml(it.title) + ' x' + (it.qty || 1) + '</span>' +
        '<span>' + A.rupiah((it.qty || 1) * (it.finalPrice || 0)) + '</span>' +
      '</div>';
    }).join('');

    return '<div class="pos-receipt-header">' +
        '<h3>' + A.escapeHtml(settings.storeName || 'GenSa Berilmu') + '</h3>' +
        '<p>' + A.escapeHtml(settings.storePhone || '') + '</p>' +
      '</div>' +
      '<div class="pos-receipt-divider"></div>' +
      '<div class="pos-receipt-row">' +
        '<span>ID</span><span>#' + A.escapeHtml(o.id) + '</span>' +
      '</div>' +
      '<div class="pos-receipt-row">' +
        '<span>Tanggal</span><span>' + A.escapeHtml(o.date || '') + '</span>' +
      '</div>' +
      '<div class="pos-receipt-row">' +
        '<span>Pelanggan</span><span>' + A.escapeHtml(o.customerName || 'Pelanggan POS') + '</span>' +
      '</div>' +
      '<div class="pos-receipt-divider"></div>' +
      itemsHTML +
      '<div class="pos-receipt-divider"></div>' +
      '<div class="pos-receipt-row pos-receipt-row--total">' +
        '<span>TOTAL</span><span>' + A.escapeHtml(o.total || '') + '</span>' +
      '</div>' +
      '<div class="pos-receipt-row">' +
        '<span>Pembayaran</span><span>' + A.escapeHtml(o.paymentMethod || '-') + '</span>' +
      '</div>' +
      (o.notes ? '<div class="pos-receipt-notes">' + A.escapeHtml(o.notes) + '</div>' : '') +
      '<div class="pos-receipt-footer">' +
        '<p>Terima kasih atas pembeliannya</p>' +
      '</div>';
  }

  function showReceipt(id) {
    var orders = A.allOrders();
    var o = orders.find(function(ORD) { return ORD.id === id; });
    if (!o) return;
    document.getElementById('posReceiptContent').innerHTML = buildReceiptHTML(o);
    A.openModal('posReceiptModal');
  }

  function checkout() {
    if (cart.length === 0) return;

    var total = cartTotalAmount();
    var order = {
      id: A.generateId(),
      source: 'pos',
      isPos: true,
      status: 'completed',
      date: A.nowStr(),
      createdAt: A.nowStr(),
      updatedAt: A.nowStr(),
      items: cart.map(function(item) { return { id: item.id, title: item.title, image: item.image, finalPrice: item.finalPrice, qty: item.qty, subtotal: item.subtotal }; }),
      subtotal: total,
      total: A.rupiah(total),
      paymentMethod: paymentMethod.value,
      customerName: customerName.value.trim(),
      customerPhone: customerPhone.value.trim(),
      notes: notes.value.trim()
    };

    var orders = A.allOrders();
    orders.unshift(order);
    A.saveOrders(orders);

    cart.forEach(function(item) {
      var p = A.findProduct(item.id);
      if (p && p.id.startsWith('custom_') && p.stock != null) {
        var updated = { stock: Math.max(0, p.stock - item.qty) };
        A.updateCustomProduct(p.id, updated);
      }
    });

    A.showToast('Transaksi POS berhasil disimpan');
    document.getElementById('posReceiptContent').innerHTML = buildReceiptHTML(order);
    A.openModal('posReceiptModal');
    clearCart();
    renderHistory();
  }

  searchInput.addEventListener('input', renderProducts);
  categoryFilter.addEventListener('change', renderProducts);
  clearCartBtn.addEventListener('click', function() {
    if (cart.length === 0) return;
    if (confirm('Kosongkan keranjang?')) clearCart();
  });
  checkoutBtn.addEventListener('click', checkout);
  clearHistoryBtn.addEventListener('click', function() {
    if (!confirm('Hapus semua riwayat transaksi POS?')) return;
    var orders = A.allOrders().filter(function(o) { return !o.isPos && o.source !== 'pos'; });
    A.saveOrders(orders);
    A.showToast('Riwayat POS dihapus');
    renderHistory();
  });

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });
  document.getElementById('posPrintBtn').addEventListener('click', function() {
    window.print();
  });

  renderProducts();
  renderCart();
  renderHistory();
})();
