(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var CATEGORY_NAMES = {
    new: 'Buku Baru', bestseller: 'Bestseller', intl: 'Intl Bestseller',
    keislaman: 'Keislaman', klasik: 'Klasik & Rekomendasi', lainnya: 'Lainnya', custom: 'Custom'
  };

  var CATEGORY_MAP = {};
  if (typeof newBooks !== 'undefined') newBooks.forEach(function(p) { CATEGORY_MAP[p.id] = 'new'; });
  if (typeof bestseller !== 'undefined') bestseller.forEach(function(p) { CATEGORY_MAP[p.id] = 'bestseller'; });
  if (typeof intlBestseller !== 'undefined') intlBestseller.forEach(function(p) { CATEGORY_MAP[p.id] = 'intl'; });
  if (typeof keislaman !== 'undefined') keislaman.forEach(function(p) { CATEGORY_MAP[p.id] = 'keislaman'; });
  if (typeof klasik !== 'undefined') klasik.forEach(function(p) { CATEGORY_MAP[p.id] = 'klasik'; });
  if (typeof lainnya !== 'undefined') lainnya.forEach(function(p) { CATEGORY_MAP[p.id] = 'lainnya'; });
  A.customProducts().forEach(function(p) { CATEGORY_MAP[p.id] = 'custom'; });

  var searchInput = document.getElementById('searchInput');
  var categoryFilter = document.getElementById('categoryFilter');
  var stockFilter = document.getElementById('stockFilter');
  var tableEl = document.getElementById('productsTable');
  var emptyEl = document.getElementById('productsEmpty');
  var countEl = document.getElementById('productCount');

  function render() {
    var query = (searchInput.value || '').toLowerCase();
    var cat = categoryFilter.value;
    var stock = stockFilter.value;
    var products = A.allProducts();

    var filtered = products.filter(function(p) {
      if (cat && CATEGORY_MAP[p.id] !== cat) return false;
      if (stock) {
        var s = p.stock != null ? p.stock : 100;
        if (stock === 'outofstock' && s > 0) return false;
        if (stock === 'lowstock' && (s === 0 || s >= 10)) return false;
        if (stock === 'instock' && s === 0) return false;
      }
      if (query) {
        var title = (p.title || '').toLowerCase();
        var author = (p.author || '').toLowerCase();
        if (title.indexOf(query) === -1 && author.indexOf(query) === -1) return false;
      }
      return true;
    });

    countEl.textContent = filtered.length + ' produk';

    if (filtered.length === 0) {
      tableEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Gambar</th><th>Nama Produk</th><th>Penulis</th><th>Harga</th><th>Stok</th><th>Kategori</th><th>Aksi</th>' +
      '</tr></thead><tbody>';

    filtered.forEach(function(p) {
      var catName = CATEGORY_NAMES[CATEGORY_MAP[p.id]] || '-';
      var stockVal = p.stock != null ? p.stock : 100;
      var stockCls = stockVal === 0 ? 'admin-stock--out' : stockVal < 10 ? 'admin-stock--low' : '';
      var isCustom = CATEGORY_MAP[p.id] === 'custom';

      html += '<tr>' +
        '<td><img src="' + A.escapeHtml(p.image || '') + '" alt="" class="admin-table-thumb"></td>' +
        '<td><div class="admin-cell-main">' + A.escapeHtml(p.title) + '</div>' +
          (p.discount ? '<div class="admin-cell-sub">Diskon ' + p.discount + '%</div>' : '') + '</td>' +
        '<td>' + A.escapeHtml(p.author || '-') + '</td>' +
        '<td><strong>' + A.rupiah(p.finalPrice || p.price) + '</strong>' +
          (p.discount ? '<div class="admin-cell-sub"><del>' + A.rupiah(p.price) + '</del></div>' : '') + '</td>' +
        '<td><span class="' + stockCls + '">' + stockVal + '</span></td>' +
        '<td><span class="admin-tag">' + catName + '</span></td>' +
        '<td><div class="admin-actions">' +
          (isCustom ? '<button type="button" class="btn btn-outline btn-sm edit-btn" data-id="' + A.escapeHtml(p.id) + '">Edit</button>' +
          '<button type="button" class="btn btn-text btn-sm delete-btn" data-id="' + A.escapeHtml(p.id) + '">Hapus</button>' :
          '<button type="button" class="btn btn-outline btn-sm view-btn" data-id="' + A.escapeHtml(p.id) + '">Lihat</button>') +
        '</div></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    tableEl.innerHTML = html;

    tableEl.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { viewProduct(btn.dataset.id); });
    });
    tableEl.querySelectorAll('.edit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { editProduct(btn.dataset.id); });
    });
    tableEl.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (confirm('Hapus produk ini?')) {
          A.deleteCustomProduct(btn.dataset.id);
          A.showToast('Produk dihapus');
          render();
        }
      });
    });
  }

  function viewProduct(id) {
    var p = A.findProduct(id);
    if (!p) return;
    var stockVal = p.stock != null ? p.stock : 100;
    document.getElementById('modalTitle').textContent = p.title;

    document.getElementById('modalBody').innerHTML =
      '<div class="admin-detail-section">' +
        '<div class="admin-product-detail">' +
          '<img src="' + A.escapeHtml(p.image || '') + '" alt="" class="admin-product-detail-img">' +
          '<div class="admin-product-detail-info">' +
            '<div class="admin-detail-grid">' +
              '<div class="admin-detail-full"><span class="admin-detail-label">Judul</span><span class="admin-detail-value">' + A.escapeHtml(p.title) + '</span></div>' +
              '<div><span class="admin-detail-label">Penulis</span><span class="admin-detail-value">' + A.escapeHtml(p.author || '-') + '</span></div>' +
              '<div><span class="admin-detail-label">Kategori</span><span class="admin-detail-value">' + (CATEGORY_NAMES[CATEGORY_MAP[p.id]] || '-') + '</span></div>' +
              '<div><span class="admin-detail-label">Harga Asli</span><span class="admin-detail-value">' + A.rupiah(p.price) + '</span></div>' +
              '<div><span class="admin-detail-label">Diskon</span><span class="admin-detail-value">' + (p.discount || 0) + '%</span></div>' +
              '<div><span class="admin-detail-label">Harga Final</span><span class="admin-detail-value" style="font-weight:700;color:var(--orange);">' + A.rupiah(p.finalPrice || p.price) + '</span></div>' +
              '<div><span class="admin-detail-label">Stok</span><span class="admin-detail-value">' + stockVal + '</span></div>' +
              '<div><span class="admin-detail-label">ID</span><span class="admin-detail-value" style="font-family:monospace;font-size:13px;">' + A.escapeHtml(p.id) + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('modalActions').innerHTML =
      '<button type="button" class="btn btn-outline" data-close="productModal">Tutup</button>';

    A.openModal('productModal');
  }

  function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = 'Tambah Produk';
    document.getElementById('productStock').value = '100';
    document.getElementById('productDiscount').value = '0';
  }

  function editProduct(id) {
    var p = A.findProduct(id);
    if (!p) return;
    resetForm();
    document.getElementById('productModalTitle').textContent = 'Edit Produk';
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.title || '';
    document.getElementById('productAuthor').value = p.author || '';
    document.getElementById('productPrice').value = p.price || '';
    document.getElementById('productDiscount').value = p.discount || 0;
    document.getElementById('productStock').value = p.stock != null ? p.stock : 100;
    document.getElementById('productCategory').value = CATEGORY_MAP[p.id] || 'new';
    document.getElementById('productImage').value = p.image || '';
    document.getElementById('productDesc').value = p.description || '';
    A.openModal('productModal');
  }

  document.getElementById('addProductBtn').addEventListener('click', function() {
    resetForm();
    A.openModal('productModal');
  });

  document.getElementById('saveProductBtn').addEventListener('click', function() {
    var name = document.getElementById('productName').value.trim();
    var author = document.getElementById('productAuthor').value.trim();
    var price = parseInt(document.getElementById('productPrice').value, 10) || 0;
    var discount = parseInt(document.getElementById('productDiscount').value, 10) || 0;
    var stock = parseInt(document.getElementById('productStock').value, 10) || 0;
    var category = document.getElementById('productCategory').value;
    var image = document.getElementById('productImage').value.trim();
    var desc = document.getElementById('productDesc').value.trim();
    var id = document.getElementById('productId').value;

    if (!name || !author) {
      A.showToast('Nama produk dan penulis wajib diisi');
      return;
    }

    var finalPrice = Math.round(price * (1 - discount / 100));
    var data = { title: name, author: author, price: price, discount: discount, finalPrice: finalPrice, stock: stock, category: category, image: image, description: desc };

    if (id) {
      A.updateCustomProduct(id, data);
      A.showToast('Produk berhasil diperbarui');
    } else {
      A.addCustomProduct(data);
      A.showToast('Produk baru berhasil ditambahkan');
    }

    A.closeModal('productModal');
    render();
  });

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });

  searchInput.addEventListener('input', render);
  categoryFilter.addEventListener('change', render);
  stockFilter.addEventListener('change', render);

  render();
})();
