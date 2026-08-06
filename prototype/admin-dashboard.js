(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var orders = A.allOrders();
  var members = A.allMembers();
  var products = A.allProducts();
  var affiliateData = A.allAffiliateData();

  var totalRevenue = 0;
  var pendingCount = 0;
  var completedCount = 0;
  orders.forEach(function(o) {
    var amount = parseInt(String(o.total || '').replace(/[^0-9]/g, ''), 10) || 0;
    if (o.status === 'completed' || o.status === 'paid' || o.status === 'shipping') totalRevenue += amount;
    if (o.status === 'pending') pendingCount++;
    if (o.status === 'completed') completedCount++;
  });

  var totalAffiliateCommission = 0;
  var totalAffiliateMembers = 0;
  Object.keys(affiliateData).forEach(function(email) {
    var a = affiliateData[email];
    if (a && a.commission) { totalAffiliateCommission += a.commission; totalAffiliateMembers++; }
  });

  var statsHTML = '' +
    '<div class="admin-stat-card">' +
      '<div class="admin-stat-icon admin-stat-icon--orange"><svg viewBox="0 0 24 24"><path d="M9 11H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-4M9 11V5a2 2 0 012-2h2a2 2 0 012 2v6M9 11h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="admin-stat-info">' +
        '<p class="admin-stat-value">' + orders.length + '</p>' +
        '<p class="admin-stat-label">Total Pesanan</p>' +
      '</div>' +
    '</div>' +
    '<div class="admin-stat-card">' +
      '<div class="admin-stat-icon admin-stat-icon--green"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="admin-stat-info">' +
        '<p class="admin-stat-value">' + A.rupiah(totalRevenue) + '</p>' +
        '<p class="admin-stat-label">Total Pendapatan</p>' +
      '</div>' +
    '</div>' +
    '<div class="admin-stat-card">' +
      '<div class="admin-stat-icon admin-stat-icon--yellow"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="admin-stat-info">' +
        '<p class="admin-stat-value">' + pendingCount + '</p>' +
        '<p class="admin-stat-label">Menunggu Bayar</p>' +
      '</div>' +
    '</div>' +
    '<div class="admin-stat-card">' +
      '<div class="admin-stat-icon admin-stat-icon--blue"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="admin-stat-info">' +
        '<p class="admin-stat-value">' + members.length + '</p>' +
        '<p class="admin-stat-label">Total Member</p>' +
      '</div>' +
    '</div>';

  document.getElementById('dashboardStats').innerHTML = statsHTML;

  var recent = orders.slice().sort(function(a, b) { return b.id > a.id ? 1 : -1; }).slice(0, 5);
  var container = document.getElementById('recentOrders');
  var emptyEl = document.getElementById('recentOrdersEmpty');

  if (recent.length === 0) {
    container.style.display = 'none';
    emptyEl.style.display = '';
  } else {
    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>ID Pesanan</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Tanggal</th>' +
      '</tr></thead><tbody>';
    recent.forEach(function(o) {
      var meta = A.STATUS_META[o.status] || A.STATUS_META.pending;
      html += '<tr>' +
        '<td><strong>#' + A.escapeHtml(o.id) + '</strong></td>' +
        '<td>' + A.escapeHtml(o.userEmail || '-') + '</td>' +
        '<td>' + A.escapeHtml(o.total || '-') + '</td>' +
        '<td><span class="order-status ' + meta.cls + '">' + meta.label + '</span></td>' +
        '<td>' + A.shortDate(o.date) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }
})();
