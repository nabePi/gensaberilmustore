(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var searchInput = document.getElementById('searchInput');
  var statusFilter = document.getElementById('statusFilter');
  var sourceFilter = document.getElementById('sourceFilter');
  var tableEl = document.getElementById('fulfillmentTable');
  var emptyEl = document.getElementById('fulfillmentEmpty');
  var countEl = document.getElementById('fulfillmentCount');
  var selectAll = document.getElementById('selectAll');
  var selectedCountEl = document.getElementById('selectedCount');
  var bulkPackedBtn = document.getElementById('bulkPackedBtn');
  var bulkShippedBtn = document.getElementById('bulkShippedBtn');
  var bulkPrintBtn = document.getElementById('bulkPrintBtn');
  var selectedIds = new Set();

  function parseAmount(total) {
    return parseInt(String(total || '').replace(/[^0-9]/g, ''), 10) || 0;
  }

  function getFilteredOrders() {
    var query = (searchInput.value || '').toLowerCase();
    var statusValue = statusFilter.value;
    var source = sourceFilter.value;
    var allowedStatuses = statusValue ? statusValue.split(',') : null;
    var orders = A.allOrders();

    return orders.filter(function(o) {
      if (allowedStatuses && allowedStatuses.indexOf(o.status) === -1) return false;
      if (source) {
        var isPos = o.isPos || o.source === 'pos';
        if (source === 'pos' && !isPos) return false;
        if (source === 'online' && isPos) return false;
      }
      if (query) {
        var id = (o.id || '').toLowerCase();
        var email = (o.userEmail || '').toLowerCase();
        var name = (o.recipient && o.recipient.name ? o.recipient.name.toLowerCase() : '');
        var phone = (o.recipient && o.recipient.phone ? o.recipient.phone.toLowerCase() : '');
        var posName = (o.customerName || '').toLowerCase();
        var posPhone = (o.customerPhone || '').toLowerCase();
        var text = [id, email, name, phone, posName, posPhone].join(' ');
        if (text.indexOf(query) === -1) return false;
      }
      return true;
    }).sort(function(a, b) { return b.id > a.id ? 1 : -1; });
  }

  function updateBulkUI() {
    var count = selectedIds.size;
    selectedCountEl.textContent = count;
    bulkPackedBtn.disabled = count === 0;
    bulkShippedBtn.disabled = count === 0;
    bulkPrintBtn.disabled = count === 0;
  }

  function render() {
    var orders = getFilteredOrders();
    updateBulkUI();
    countEl.textContent = orders.length + ' pesanan';

    if (orders.length === 0) {
      tableEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th class="ff-col-check"><input type="checkbox" id="selectAllVisible"></th>' +
      '<th>ID / Sumber</th><th>Pelanggan</th><th>Items</th><th>Total</th><th>Status</th><th>Aksi</th>' +
      '</tr></thead><tbody>';

    orders.forEach(function(o) {
      var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
      var isPos = o.isPos || o.source === 'pos';
      var itemCount = (o.items || []).length;
      var customer = isPos ? (o.customerName || 'Pelanggan POS') : (o.userEmail || '-');
      var customerSub = isPos ? (o.customerPhone || '') : (o.recipient ? (o.recipient.name || o.recipient.phone || '') : '');
      var sourceBadge = isPos ? '<span class="admin-tag admin-tag--blue">POS</span>' : '<span class="admin-tag">Online</span>';
      var checked = selectedIds.has(o.id) ? ' checked' : '';

      html += '<tr>' +
        '<td class="ff-col-check"><input type="checkbox" class="ff-row-check" data-id="' + A.escapeHtml(o.id) + '"' + checked + '></td>' +
        '<td><strong>#' + A.escapeHtml(o.id) + '</strong><div>' + sourceBadge + '</div></td>' +
        '<td><div class="admin-cell-main">' + A.escapeHtml(customer) + '</div>' + (customerSub ? '<div class="admin-cell-sub">' + A.escapeHtml(customerSub) + '</div>' : '') + '</td>' +
        '<td><div class="admin-cell-main">' + itemCount + ' item</div><div class="admin-cell-sub"><button type="button" class="btn btn-text btn-sm view-items-btn" data-id="' + A.escapeHtml(o.id) + '">Lihat Item</button></div></td>' +
        '<td><strong>' + A.escapeHtml(o.total || '-') + '</strong></td>' +
        '<td><span class="order-status ' + meta.cls + '">' + meta.label + '</span></td>' +
        '<td><div class="admin-actions">' +
          '<button type="button" class="btn btn-outline btn-sm print-btn" data-id="' + A.escapeHtml(o.id) + '">Packing</button>' +
        '</div></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    tableEl.innerHTML = html;

    var selectAllVisible = document.getElementById('selectAllVisible');
    selectAllVisible.checked = orders.length > 0 && orders.every(function(o) { return selectedIds.has(o.id); });
    selectAll.checked = getFilteredOrders().length > 0 && getFilteredOrders().every(function(o) { return selectedIds.has(o.id); });

    selectAllVisible.addEventListener('change', function(e) {
      tableEl.querySelectorAll('.ff-row-check').forEach(function(cb) {
        cb.checked = e.target.checked;
        if (e.target.checked) selectedIds.add(cb.dataset.id);
        else selectedIds.delete(cb.dataset.id);
      });
      selectAll.checked = getFilteredOrders().length > 0 && getFilteredOrders().every(function(o) { return selectedIds.has(o.id); });
      updateBulkUI();
    });

    tableEl.querySelectorAll('.ff-row-check').forEach(function(cb) {
      cb.addEventListener('change', function() {
        if (cb.checked) selectedIds.add(cb.dataset.id);
        else selectedIds.delete(cb.dataset.id);
        selectAllVisible.checked = orders.length > 0 && orders.every(function(o) { return selectedIds.has(o.id); });
        selectAll.checked = getFilteredOrders().length > 0 && getFilteredOrders().every(function(o) { return selectedIds.has(o.id); });
        updateBulkUI();
      });
    });

    tableEl.querySelectorAll('.view-items-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        showDetail(btn.dataset.id);
      });
    });

    tableEl.querySelectorAll('.print-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        selectedIds.clear();
        selectedIds.add(btn.dataset.id);
        printPackingList();
      });
    });
  }

  function showDetail(id) {
    var o = A.allOrders().find(function(ord) { return ord.id === id; });
    if (!o) return;
    var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
    var isPos = o.isPos || o.source === 'pos';

    document.getElementById('modalTitle').textContent = 'Pesanan #' + o.id;

    var itemsHTML = (o.items || []).map(function(it) {
      return '<div class="admin-detail-item">' +
        '<img src="' + A.escapeHtml(it.image || '') + '" alt="" class="admin-detail-thumb">' +
        '<div class="admin-detail-item-info">' +
          '<p class="admin-detail-item-title">' + A.escapeHtml(it.title) + '</p>' +
          '<p class="admin-detail-item-qty">' + (it.qty || 1) + ' x ' + A.rupiah(it.finalPrice) + '</p>' +
        '</div>' +
        '<strong class="admin-detail-item-sub">' + A.rupiah((it.qty || 1) * (it.finalPrice || 0)) + '</strong>' +
      '</div>';
    }).join('');

    var bodyHTML = '<div class="admin-detail-section">' +
      '<h4>Ringkasan</h4>' +
      '<div class="admin-detail-grid">' +
        '<div><span class="admin-detail-label">Status</span><span class="order-status ' + meta.cls + '">' + meta.label + '</span></div>' +
        '<div><span class="admin-detail-label">Sumber</span><span class="admin-tag ' + (isPos ? 'admin-tag--blue' : '') + '">' + (isPos ? 'POS' : 'Online') + '</span></div>' +
        '<div><span class="admin-detail-label">Total</span><span class="admin-detail-value" style="font-weight:700;color:var(--orange);">' + A.escapeHtml(o.total || '-') + '</span></div>' +
        '<div><span class="admin-detail-label">Tanggal</span><span class="admin-detail-value">' + A.escapeHtml(o.date || '-') + '</span></div>' +
        (o.paymentMethod ? '<div><span class="admin-detail-label">Pembayaran</span><span class="admin-detail-value">' + A.escapeHtml(o.paymentMethod) + '</span></div>' : '') +
      '</div></div>' +
      '<div class="admin-detail-section"><h4>Item yang Dikemas</h4><div class="admin-detail-items">' + itemsHTML + '</div></div>';

    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalActions').innerHTML =
      '<button type="button" class="btn btn-outline" data-close="fulfillmentModal">Tutup</button>' +
      '<button type="button" class="btn btn-solid" id="modalPrintBtn">Cetak Packing List</button>';

    document.getElementById('modalPrintBtn').addEventListener('click', function() {
      selectedIds.clear();
      selectedIds.add(o.id);
      printPackingList();
    });

    A.openModal('fulfillmentModal');
  }

  function buildPackingListHTML(orders) {
    var settings = A.getSettings();
    var html = '<div class="packing-sheet">' +
      '<div class="packing-sheet-header">' +
        '<h2>' + A.escapeHtml(settings.storeName || 'GenSa Berilmu') + '</h2>' +
        '<p>' + A.escapeHtml(settings.storePhone || '') + '</p>' +
        '<p>Packing List - ' + A.nowStr() + '</p>' +
      '</div>';

    orders.forEach(function(o) {
      var isPos = o.isPos || o.source === 'pos';
      var customer = isPos ? (o.customerName || 'Pelanggan POS') : (o.userEmail || '-');
      var phone = isPos ? (o.customerPhone || '-') : (o.recipient ? (o.recipient.phone || '-') : '-');
      var address = (o.recipient && o.recipient.address) ? o.recipient.address : '-';

      html += '<div class="packing-sheet-order">' +
        '<div class="packing-sheet-order-head">' +
          '<div>' +
            '<h3>#' + A.escapeHtml(o.id) + '</h3>' +
            '<p>' + A.escapeHtml(customer) + ' · ' + A.escapeHtml(phone) + '</p>' +
            '<p class="packing-sheet-address">' + A.escapeHtml(address) + '</p>' +
          '</div>' +
          '<div class="packing-sheet-total">' + A.escapeHtml(o.total || '-') + '</div>' +
        '</div>' +
        '<table class="packing-sheet-table">' +
          '<thead><tr><th>No</th><th>Produk</th><th>Qty</th><th>Cek</th></tr></thead>' +
          '<tbody>';
      (o.items || []).forEach(function(it, idx) {
        html += '<tr>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td>' + A.escapeHtml(it.title) + '</td>' +
          '<td>' + (it.qty || 1) + '</td>' +
          '<td class="packing-check"></td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
    });

    html += '</div>';
    return html;
  }

  function printPackingList() {
    if (selectedIds.size === 0) return;
    var all = A.allOrders();
    var orders = all.filter(function(o) { return selectedIds.has(o.id); });
    if (orders.length === 0) return;

    var printArea = document.getElementById('packingPrintArea');
    printArea.innerHTML = buildPackingListHTML(orders);
    window.print();
    printArea.innerHTML = '';
  }

  function bulkUpdateStatus(status) {
    if (selectedIds.size === 0) return;
    var ids = Array.from(selectedIds);
    ids.forEach(function(id) { A.updateOrderStatus(id, status); });
    A.showToast(ids.length + ' pesanan ditandai ' + (A.STATUS_META[status] || {}).label);
    selectedIds.clear();
    render();
  }

  selectAll.addEventListener('change', function(e) {
    var orders = getFilteredOrders();
    orders.forEach(function(o) {
      if (e.target.checked) selectedIds.add(o.id);
      else selectedIds.delete(o.id);
    });
    updateBulkUI();
    render();
  });

  bulkPackedBtn.addEventListener('click', function() { bulkUpdateStatus('packed'); });
  bulkShippedBtn.addEventListener('click', function() { bulkUpdateStatus('shipping'); });
  bulkPrintBtn.addEventListener('click', printPackingList);

  document.getElementById('exportBtn').addEventListener('click', function() {
    var orders = getFilteredOrders();
    var csv = 'ID,Sumber,Pelanggan,Telepon,Items,Total,Status,Tanggal\n';
    orders.forEach(function(o) {
      var isPos = o.isPos || o.source === 'pos';
      var source = isPos ? 'POS' : 'Online';
      var customer = isPos ? (o.customerName || 'Pelanggan POS') : (o.userEmail || '');
      var phone = isPos ? (o.customerPhone || '') : (o.recipient ? (o.recipient.phone || '') : '');
      var itemCount = (o.items || []).length;
      var meta = A.STATUS_META[o.status] || {};
      csv += '"' + (o.id || '') + '","' + source + '","' + customer + '","' + phone + '","' + itemCount + '","' + (o.total || '') + '","' + (meta.label || o.status) + '","' + (o.date || '') + '"\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'fulfillment-export.csv'; a.click();
    URL.revokeObjectURL(url);
    A.showToast('CSV berhasil didownload');
  });

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });

  searchInput.addEventListener('input', render);
  statusFilter.addEventListener('change', render);
  sourceFilter.addEventListener('change', render);

  render();
})();
