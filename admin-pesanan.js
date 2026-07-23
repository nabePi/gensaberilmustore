(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var searchInput = document.getElementById('searchInput');
  var statusFilter = document.getElementById('statusFilter');
  var tableEl = document.getElementById('ordersTable');
  var emptyEl = document.getElementById('ordersEmpty');
  var countEl = document.getElementById('orderCount');

  function render() {
    var query = (searchInput.value || '').toLowerCase();
    var status = statusFilter.value;
    var orders = A.allOrders();

    var filtered = orders.filter(function(o) {
      if (status && o.status !== status) return false;
      if (query) {
        var id = (o.id || '').toLowerCase();
        var email = (o.userEmail || '').toLowerCase();
        var name = (o.recipient && o.recipient.name ? o.recipient.name.toLowerCase() : '');
        var phone = (o.recipient && o.recipient.phone ? o.recipient.phone.toLowerCase() : '');
        var posName = (o.customerName || '').toLowerCase();
        var posPhone = (o.customerPhone || '').toLowerCase();
        var matches = id.indexOf(query) !== -1 || email.indexOf(query) !== -1 || name.indexOf(query) !== -1 || phone.indexOf(query) !== -1 || posName.indexOf(query) !== -1 || posPhone.indexOf(query) !== -1;
        if (!matches) return false;
      }
      return true;
    });

    filtered.sort(function(a, b) { return b.id > a.id ? 1 : -1; });
    countEl.textContent = filtered.length + ' pesanan';

    if (filtered.length === 0) {
      tableEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>ID Pesanan</th><th>Pelanggan</th><th>Items</th><th>Total</th><th>Status</th><th>Tanggal</th><th>Aksi</th>' +
      '</tr></thead><tbody>';

    filtered.forEach(function(o) {
      var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
      var itemCount = (o.items || []).length;
      var itemNames = (o.items || []).slice(0, 2).map(function(it) { return it.title; }).join(', ');
      if (itemCount > 2) itemNames += ' +' + (itemCount - 2) + ' lainnya';

      var isPos = o.isPos || o.source === 'pos';
      var customerLabel = isPos ? A.escapeHtml(o.customerName || 'Pelanggan POS') : A.escapeHtml(o.userEmail || '-');
      var customerSub = isPos ? (o.customerPhone ? A.escapeHtml(o.customerPhone) : '') : (o.recipient ? A.escapeHtml(o.recipient.name || '') : '');
      var posBadge = isPos ? '<span class="admin-tag admin-tag--blue">POS</span>' : '';

      html += '<tr>' +
        '<td><strong>#' + A.escapeHtml(o.id) + '</strong>' + posBadge + '</td>' +
        '<td><div class="admin-cell-main">' + customerLabel + '</div>' +
          (customerSub ? '<div class="admin-cell-sub">' + customerSub + '</div>' : '') + '</td>' +
        '<td><div class="admin-cell-main">' + A.escapeHtml(itemNames || '-') + '</div><div class="admin-cell-sub">' + itemCount + ' item</div></td>' +
        '<td><strong>' + A.escapeHtml(o.total || '-') + '</strong></td>' +
        '<td><span class="order-status ' + meta.cls + '">' + meta.label + '</span></td>' +
        '<td>' + A.shortDate(o.date) + '</td>' +
        '<td><div class="admin-actions">' +
          '<button type="button" class="btn btn-outline btn-sm view-btn" data-id="' + A.escapeHtml(o.id) + '">Detail</button>' +
          '<button type="button" class="btn btn-text btn-sm delete-btn" data-id="' + A.escapeHtml(o.id) + '">Hapus</button>' +
        '</div></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    tableEl.innerHTML = html;

    tableEl.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { showDetail(btn.dataset.id); });
    });
    tableEl.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (confirm('Hapus pesanan #' + btn.dataset.id + '?')) {
          A.deleteOrder(btn.dataset.id);
          A.showToast('Pesanan dihapus');
          render();
        }
      });
    });
  }

  function showDetail(id) {
    var orders = A.allOrders();
    var o = orders.find(function(ORD) { return ORD.id === id; });
    if (!o) return;

    var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
    document.getElementById('modalTitle').textContent = 'Pesanan #' + o.id;

    var itemsHTML = (o.items || []).map(function(it) {
      return '<div class="admin-detail-item">' +
        '<img src="' + A.escapeHtml(it.image) + '" alt="" class="admin-detail-thumb">' +
        '<div class="admin-detail-item-info">' +
          '<p class="admin-detail-item-title">' + A.escapeHtml(it.title) + '</p>' +
          '<p class="admin-detail-item-qty">' + (it.qty || 1) + ' x ' + A.rupiah(it.finalPrice) + '</p>' +
        '</div>' +
        '<strong class="admin-detail-item-sub">' + A.rupiah((it.qty || 1) * (it.finalPrice || 0)) + '</strong>' +
      '</div>';
    }).join('');

    var recipientHTML = '';
    if (o.recipient) {
      recipientHTML = '<div class="admin-detail-section">' +
        '<h4>Informasi Penerima</h4>' +
        '<div class="admin-detail-grid">' +
          '<div><span class="admin-detail-label">Nama</span><span class="admin-detail-value">' + A.escapeHtml(o.recipient.name || '-') + '</span></div>' +
          '<div><span class="admin-detail-label">Telepon</span><span class="admin-detail-value">' + A.escapeHtml(o.recipient.phone || '-') + '</span></div>' +
          '<div><span class="admin-detail-label">Email</span><span class="admin-detail-value">' + A.escapeHtml(o.recipient.email || '-') + '</span></div>' +
          '<div class="admin-detail-full"><span class="admin-detail-label">Alamat</span><span class="admin-detail-value">' + A.escapeHtml(o.recipient.address || '-') + '</span></div>' +
          (o.recipient.note ? '<div class="admin-detail-full"><span class="admin-detail-label">Catatan</span><span class="admin-detail-value">' + A.escapeHtml(o.recipient.note) + '</span></div>' : '') +
        '</div></div>';
    }

    var isPos = o.isPos || o.source === 'pos';
    var summaryHTML = '<div class="admin-detail-section">' +
      '<h4>Ringkasan</h4>' +
      '<div class="admin-detail-grid">' +
        '<div><span class="admin-detail-label">Status</span><span class="order-status ' + meta.cls + '">' + meta.label + '</span></div>' +
        '<div><span class="admin-detail-label">Tanggal</span><span class="admin-detail-value">' + A.escapeHtml(o.date || '-') + '</span></div>' +
        '<div><span class="admin-detail-label">Total</span><span class="admin-detail-value" style="font-size:18px;font-weight:700;color:var(--orange);">' + A.escapeHtml(o.total || '-') + '</span></div>' +
        (isPos ? '<div><span class="admin-detail-label">Sumber</span><span class="admin-tag admin-tag--blue">POS</span></div>' : '') +
        (isPos && o.paymentMethod ? '<div><span class="admin-detail-label">Pembayaran</span><span class="admin-detail-value">' + A.escapeHtml(o.paymentMethod) + '</span></div>' : '') +
      '</div></div>';

    var customerHTML = '';
    if (isPos) {
      customerHTML = '<div class="admin-detail-section">' +
        '<h4>Informasi Pelanggan</h4>' +
        '<div class="admin-detail-grid">' +
          '<div><span class="admin-detail-label">Nama</span><span class="admin-detail-value">' + A.escapeHtml(o.customerName || '-') + '</span></div>' +
          '<div><span class="admin-detail-label">Telepon</span><span class="admin-detail-value">' + A.escapeHtml(o.customerPhone || '-') + '</span></div>' +
          (o.notes ? '<div class="admin-detail-full"><span class="admin-detail-label">Catatan</span><span class="admin-detail-value">' + A.escapeHtml(o.notes) + '</span></div>' : '') +
        '</div></div>';
    }

    var body = summaryHTML + customerHTML +
      '<div class="admin-detail-section">' +
        '<h4>Item yang Dipesan</h4>' +
        '<div class="admin-detail-items">' + itemsHTML + '</div>' +
      '</div>' +
      (isPos ? '' : recipientHTML);

    document.getElementById('modalBody').innerHTML = body;

    var statusOpts = Object.keys(A.STATUS_META).map(function(k) {
      return '<option value="' + k + '"' + (o.status === k ? ' selected' : '') + '>' + A.STATUS_META[k].label + '</option>';
    }).join('');

    document.getElementById('modalActions').innerHTML =
      '<div class="admin-modal-status">' +
        '<label>Ubah Status:</label>' +
        '<select class="member-filter" id="statusSelect">' + statusOpts + '</select>' +
      '</div>' +
      '<div class="admin-modal-btns">' +
        '<button type="button" class="btn btn-outline" data-close="orderModal">Tutup</button>' +
        '<button type="button" class="btn btn-solid" id="saveStatusBtn">Simpan Status</button>' +
      '</div>';

    document.getElementById('saveStatusBtn').addEventListener('click', function() {
      var newStatus = document.getElementById('statusSelect').value;
      A.updateOrderStatus(o.id, newStatus);
      A.showToast('Status pesanan diperbarui');
      A.closeModal('orderModal');
      render();
    });

    A.openModal('orderModal');
  }

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });

  searchInput.addEventListener('input', render);
  statusFilter.addEventListener('change', render);

  document.getElementById('exportBtn').addEventListener('click', function() {
    var orders = A.allOrders();
    var csv = 'ID,Sumber,Pelanggan,Penerima,Telepon,Total,Status,Tanggal\n';
    orders.forEach(function(o) {
      var meta = A.STATUS_META[o.status] || {};
      var isPos = o.isPos || o.source === 'pos';
      var source = isPos ? 'POS' : 'Online';
      var customer = isPos ? (o.customerName || 'Pelanggan POS') : (o.userEmail || '');
      var recipientName = isPos ? '' : (o.recipient && o.recipient.name || '');
      var recipientPhone = isPos ? (o.customerPhone || '') : (o.recipient && o.recipient.phone || '');
      csv += '"' + (o.id || '') + '","' + source + '","' + customer + '","' + recipientName + '","' + recipientPhone + '","' + (o.total || '') + '","' + (meta.label || o.status) + '","' + (o.date || '') + '"\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'pesanan-export.csv'; a.click();
    URL.revokeObjectURL(url);
    A.showToast('CSV berhasil didownload');
  });

  render();
})();
