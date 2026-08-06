(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var COLUMNS = ['pending', 'paid', 'packed', 'shipping', 'completed', 'cancelled'];
  var COLUMN_TITLES = {
    pending: 'Menunggu Pembayaran',
    paid: 'Lunas - Perlu Dikemas',
    packed: 'Dikemas - Siap Dikirim',
    shipping: 'Dikirim',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };

  var container = document.getElementById('boardContainer');
  var searchInput = document.getElementById('boardSearch');
  var sourceFilter = document.getElementById('boardSource');

  function parseAmount(total) {
    return parseInt(String(total || '').replace(/[^0-9]/g, ''), 10) || 0;
  }

  function getFilteredOrders() {
    var query = (searchInput.value || '').toLowerCase();
    var source = sourceFilter.value;
    return A.allOrders().filter(function(o) {
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
    });
  }

  function groupByStatus(orders) {
    var groups = {};
    COLUMNS.forEach(function(s) { groups[s] = []; });
    orders.forEach(function(o) {
      var status = o.status || 'pending';
      if (groups[status]) groups[status].push(o);
    });
    return groups;
  }

  function cardHTML(o) {
    var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
    var isPos = o.isPos || o.source === 'pos';
    var itemCount = (o.items || []).length;
    var customer = isPos ? (o.customerName || 'Pelanggan POS') : (o.userEmail || '-');
    var amount = parseAmount(o.total);

    var actions = '';
    var nextMap = { pending: 'paid', paid: 'packed', packed: 'shipping', shipping: 'completed' };
    var nextLabelMap = { pending: 'Bayar', paid: 'Kemas', packed: 'Kirim', shipping: 'Selesai' };
    var nextStatus = nextMap[o.status];
    if (nextStatus) {
      actions += '<button type="button" class="board-card-action" data-id="' + A.escapeHtml(o.id) + '" data-next="' + nextStatus + '">' + nextLabelMap[o.status] + '</button>';
    }

    return '<article class="board-card' + (isPos ? ' board-card--pos' : '') + '" draggable="true" data-id="' + A.escapeHtml(o.id) + '" data-status="' + A.escapeHtml(o.status) + '">' +
      '<div class="board-card-head">' +
        '<span class="board-card-id">#' + A.escapeHtml(o.id) + '</span>' +
        '<span class="order-status ' + meta.cls + '">' + meta.label + '</span>' +
      '</div>' +
      '<p class="board-card-customer">' + A.escapeHtml(customer) + '</p>' +
      '<div class="board-card-items">' + itemCount + ' item · ' + A.rupiah(amount) + '</div>' +
      '<div class="board-card-foot">' +
        '<span class="board-card-date">' + A.shortDate(o.date) + '</span>' +
        (isPos ? '<span class="admin-tag admin-tag--blue">POS</span>' : '') +
      '</div>' +
      '<div class="board-card-actions">' + actions + '</div>' +
    '</article>';
  }

  function render() {
    var orders = getFilteredOrders();
    var groups = groupByStatus(orders);

    var html = '';
    COLUMNS.forEach(function(status) {
      var meta = A.STATUS_META[status] || {};
      var count = groups[status].length;
      html += '<div class="board-column" data-status="' + status + '">' +
        '<div class="board-column-head">' +
          '<span class="board-column-title">' + COLUMN_TITLES[status] + '</span>' +
          '<span class="board-column-count">' + count + '</span>' +
        '</div>' +
        '<div class="board-column-body">' +
          groups[status].map(function(o) { return cardHTML(o); }).join('') +
        '</div>' +
      '</div>';
    });

    container.innerHTML = html;
    bindEvents();
  }

  function moveOrder(id, newStatus) {
    A.updateOrderStatus(id, newStatus);
    A.showToast('Status diperbarui: ' + (A.STATUS_META[newStatus] || {}).label);
    render();
  }

  function showDetail(id) {
    var o = A.allOrders().find(function(ord) { return ord.id === id; });
    if (!o) return;
    var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
    var isPos = o.isPos || o.source === 'pos';

    document.getElementById('boardModalTitle').textContent = 'Pesanan #' + o.id;

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
      '<div class="admin-detail-section"><h4>Item</h4><div class="admin-detail-items">' + itemsHTML + '</div></div>';

    document.getElementById('boardModalBody').innerHTML = bodyHTML;

    var statusOpts = Object.keys(A.STATUS_META).map(function(k) {
      return '<option value="' + k + '"' + (o.status === k ? ' selected' : '') + '>' + A.STATUS_META[k].label + '</option>';
    }).join('');

    document.getElementById('boardModalActions').innerHTML =
      '<div class="admin-modal-status">' +
        '<label>Ubah Status:</label>' +
        '<select class="member-filter" id="boardStatusSelect">' + statusOpts + '</select>' +
      '</div>' +
      '<div class="admin-modal-btns">' +
        '<button type="button" class="btn btn-outline" data-close="boardDetailModal">Tutup</button>' +
        '<button type="button" class="btn btn-solid" id="boardSaveStatusBtn">Simpan</button>' +
      '</div>';

    document.getElementById('boardSaveStatusBtn').addEventListener('click', function() {
      var newStatus = document.getElementById('boardStatusSelect').value;
      moveOrder(o.id, newStatus);
      A.closeModal('boardDetailModal');
    });

    A.openModal('boardDetailModal');
  }

  function bindEvents() {
    var draggedId = null;
    var draggedCard = null;

    container.querySelectorAll('.board-card').forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        draggedId = card.dataset.id;
        draggedCard = card;
        card.classList.add('board-card--dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function() {
        card.classList.remove('board-card--dragging');
        draggedId = null;
        draggedCard = null;
        container.querySelectorAll('.board-column-body').forEach(function(b) { b.classList.remove('board-column-body--over'); });
      });
      card.addEventListener('click', function(e) {
        if (e.target.classList.contains('board-card-action')) return;
        showDetail(card.dataset.id);
      });
    });

    container.querySelectorAll('.board-card-action').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        moveOrder(btn.dataset.id, btn.dataset.next);
      });
    });

    container.querySelectorAll('.board-column-body').forEach(function(body) {
      body.addEventListener('dragover', function(e) {
        e.preventDefault();
        body.classList.add('board-column-body--over');
      });
      body.addEventListener('dragleave', function() {
        body.classList.remove('board-column-body--over');
      });
      body.addEventListener('drop', function(e) {
        e.preventDefault();
        body.classList.remove('board-column-body--over');
        if (!draggedId) return;
        var newStatus = body.parentElement.dataset.status;
        var oldStatus = draggedCard ? draggedCard.dataset.status : null;
        if (newStatus && newStatus !== oldStatus) {
          moveOrder(draggedId, newStatus);
        }
      });
    });
  }

  searchInput.addEventListener('input', render);
  sourceFilter.addEventListener('change', render);

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });

  render();
})();
