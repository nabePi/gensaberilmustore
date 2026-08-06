(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var periodFilter = document.getElementById('periodFilter');

  function getFilteredOrders() {
    var period = periodFilter.value;
    var orders = A.allOrders();
    var now = new Date();

    if (period === 'today') {
      var today = now.toISOString().slice(0, 10);
      return orders.filter(function(o) { return o.date && o.date.indexOf(today) !== -1; });
    }
    if (period === 'week') {
      var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orders.filter(function(o) {
        if (!o.date) return false;
        return new Date(o.date) >= weekAgo;
      });
    }
    if (period === 'month') {
      var monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      return orders.filter(function(o) { return o.date && o.date.indexOf(monthStr) !== -1; });
    }
    return orders;
  }

  function render() {
    var orders = getFilteredOrders();

    var totalRevenue = 0;
    var statusCounts = { pending: 0, paid: 0, shipping: 0, completed: 0, cancelled: 0 };
    var productSales = {};
    var dailyCounts = {};

    orders.forEach(function(o) {
      var amount = parseInt(String(o.total || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (o.status !== 'cancelled') totalRevenue += amount;
      if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;

      (o.items || []).forEach(function(it) {
        var key = it.title || it.id || 'unknown';
        if (!productSales[key]) productSales[key] = { title: it.title, qty: 0, revenue: 0 };
        productSales[key].qty += it.qty || 1;
        productSales[key].revenue += (it.qty || 1) * (it.finalPrice || 0);
      });

      if (o.date) {
        var day = o.date.split(',')[1] ? o.date.split(',')[1].trim().split(' ').slice(0, 3).join(' ') : o.date;
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    });

    var avgOrder = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
    var completedRate = orders.length > 0 ? ((statusCounts.completed / orders.length) * 100).toFixed(1) + '%' : '-';

    var statsHTML = '' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--green"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + A.rupiah(totalRevenue) + '</p><p class="admin-stat-label">Total Pendapatan</p></div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--orange"><svg viewBox="0 0 24 24"><path d="M9 11H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-4M9 11V5a2 2 0 012-2h2a2 2 0 012 2v6M9 11h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + orders.length + '</p><p class="admin-stat-label">Total Pesanan</p></div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--blue"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + A.rupiah(avgOrder) + '</p><p class="admin-stat-label">Rata-rata per Pesanan</p></div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--yellow"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + completedRate + '</p><p class="admin-stat-label">Tingkat Selesai</p></div></div>';

    document.getElementById('reportStats').innerHTML = statsHTML;

    var statusHTML = '<div class="admin-status-grid">';
    Object.keys(statusCounts).forEach(function(s) {
      var meta = A.STATUS_META[s] || {};
      statusHTML += '<div class="admin-status-card">' +
        '<span class="order-status ' + (meta.cls || '') + '">' + (meta.label || s) + '</span>' +
        '<strong class="admin-status-count">' + statusCounts[s] + '</strong>' +
        '<span class="admin-cell-sub">pesanan</span>' +
      '</div>';
    });
    statusHTML += '</div>';
    document.getElementById('statusBreakdown').innerHTML = statusHTML;

    var topProducts = Object.keys(productSales).map(function(k) { return productSales[k]; });
    topProducts.sort(function(a, b) { return b.revenue - a.revenue; });
    topProducts = topProducts.slice(0, 10);

    var topEl = document.getElementById('topProducts');
    var topEmpty = document.getElementById('topProductsEmpty');

    if (topProducts.length === 0) {
      topEl.innerHTML = '';
      topEmpty.style.display = '';
    } else {
      topEmpty.style.display = 'none';
      var maxRevenue = topProducts[0].revenue;
      var thtml = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th>#</th><th>Produk</th><th>Terjual</th><th>Pendapatan</th><th></th>' +
        '</tr></thead><tbody>';
      topProducts.forEach(function(p, i) {
        var barWidth = maxRevenue > 0 ? (p.revenue / maxRevenue * 100) : 0;
        thtml += '<tr>' +
          '<td><strong>' + (i + 1) + '</strong></td>' +
          '<td><strong>' + A.escapeHtml(p.title) + '</strong></td>' +
          '<td>' + p.qty + ' unit</td>' +
          '<td><strong>' + A.rupiah(p.revenue) + '</strong></td>' +
          '<td><div class="admin-bar-wrap"><div class="admin-bar" style="width:' + barWidth + '%"></div></div></td>' +
        '</tr>';
      });
      thtml += '</tbody></table></div>';
      topEl.innerHTML = thtml;
    }

    var dailyKeys = Object.keys(dailyCounts);
    var dailyEl = document.getElementById('dailyChart');
    var dailyEmpty = document.getElementById('dailyChartEmpty');

    if (dailyKeys.length === 0) {
      dailyEl.innerHTML = '';
      dailyEmpty.style.display = '';
    } else {
      dailyEmpty.style.display = 'none';
      dailyKeys.sort();
      var maxDaily = Math.max.apply(null, Object.values(dailyCounts));
      var dhtml = '<div class="admin-daily-chart">';
      dailyKeys.forEach(function(day) {
        var count = dailyCounts[day];
        var pct = maxDaily > 0 ? (count / maxDaily * 100) : 0;
        dhtml += '<div class="admin-daily-bar">' +
          '<div class="admin-daily-col">' +
            '<div class="admin-daily-fill" style="height:' + Math.max(pct, 4) + '%"></div>' +
          '</div>' +
          '<p class="admin-daily-label">' + count + '</p>' +
          '<p class="admin-daily-day">' + A.escapeHtml(day) + '</p>' +
        '</div>';
      });
      dhtml += '</div>';
      dailyEl.innerHTML = dhtml;
    }
  }

  periodFilter.addEventListener('change', render);

  document.getElementById('exportReportBtn').addEventListener('click', function() {
    var orders = getFilteredOrders();
    var csv = 'ID,Pelanggan,Total,Status,Tanggal\n';
    orders.forEach(function(o) {
      var meta = A.STATUS_META[o.status] || {};
      csv += '"' + (o.id || '') + '","' + (o.userEmail || '') + '","' + (o.total || '') + '","' + (meta.label || o.status) + '","' + (o.date || '') + '"\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'laporan-penjualan.csv'; a.click();
    URL.revokeObjectURL(url);
    A.showToast('Laporan berhasil diexport');
  });

  render();
})();
