(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var CATEGORY_NAMES = {
    new: 'Buku Baru', bestseller: 'Bestseller', intl: 'Intl Bestseller',
    keislaman: 'Keislaman', klasik: 'Klasik & Rekomendasi', lainnya: 'Lainnya', custom: 'Custom'
  };

  var MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  var CATEGORY_MAP = {};
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

  function parseAmount(total) {
    return parseInt(String(total || '').replace(/[^0-9]/g, ''), 10) || 0;
  }

  function parseOrderDate(o) {
    if (!o.date) return null;
    var d = new Date(o.date);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function getFilteredOrders() {
    var year = document.getElementById('reportYear').value;
    var month = document.getElementById('reportMonth').value;
    var source = document.getElementById('reportSource').value;
    var orders = A.allOrders();

    return orders.filter(function(o) {
      var d = parseOrderDate(o);
      if (!d) return false;
      if (year && d.getFullYear() !== parseInt(year, 10)) return false;
      if (month && (d.getMonth() + 1) !== parseInt(month, 10)) return false;
      if (source) {
        var isPos = o.isPos || o.source === 'pos';
        if (source === 'pos' && !isPos) return false;
        if (source === 'online' && isPos) return false;
      }
      return true;
    });
  }

  function populateYearFilter() {
    var orders = A.allOrders();
    var years = {};
    orders.forEach(function(o) {
      var d = parseOrderDate(o);
      if (d) years[d.getFullYear()] = true;
    });
    var select = document.getElementById('reportYear');
    var currentYear = new Date().getFullYear();
    years[currentYear] = true;
    years[currentYear - 1] = true;
    var sorted = Object.keys(years).map(Number).sort(function(a, b) { return b - a; });
    var html = '<option value="">Semua Tahun</option>';
    sorted.forEach(function(y) { html += '<option value="' + y + '">' + y + '</option>'; });
    select.innerHTML = html;
  }

  function render() {
    buildCategoryMap();
    var orders = getFilteredOrders();

    var totalRevenue = 0;
    var totalOrders = 0;
    var totalItems = 0;
    var sourceCounts = { online: { orders: 0, revenue: 0 }, pos: { orders: 0, revenue: 0 } };
    var monthlyRevenue = {};
    var categoryRevenue = {};
    var paymentCounts = {};
    var productSales = {};

    orders.forEach(function(o) {
      if (o.status === 'cancelled') return;
      var amount = parseAmount(o.total);
      totalRevenue += amount;
      totalOrders += 1;
      var isPos = o.isPos || o.source === 'pos';
      var sourceKey = isPos ? 'pos' : 'online';
      sourceCounts[sourceKey].orders += 1;
      sourceCounts[sourceKey].revenue += amount;

      var d = parseOrderDate(o);
      if (d) {
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!monthlyRevenue[key]) monthlyRevenue[key] = { key: key, year: d.getFullYear(), month: d.getMonth(), revenue: 0, orders: 0 };
        monthlyRevenue[key].revenue += amount;
        monthlyRevenue[key].orders += 1;
      }

      (o.items || []).forEach(function(it) {
        var qty = it.qty || 1;
        var itemRevenue = qty * (it.finalPrice || 0);
        totalItems += qty;

        var cat = CATEGORY_MAP[it.id] || 'lainnya';
        if (!categoryRevenue[cat]) categoryRevenue[cat] = { name: CATEGORY_NAMES[cat] || cat, revenue: 0, qty: 0 };
        categoryRevenue[cat].revenue += itemRevenue;
        categoryRevenue[cat].qty += qty;

        var pKey = it.title || it.id || 'unknown';
        if (!productSales[pKey]) productSales[pKey] = { title: it.title, qty: 0, revenue: 0 };
        productSales[pKey].qty += qty;
        productSales[pKey].revenue += itemRevenue;
      });

      var pay = o.paymentMethod || 'Tidak diketahui';
      if (!paymentCounts[pay]) paymentCounts[pay] = { name: pay, count: 0, revenue: 0 };
      paymentCounts[pay].count += 1;
      paymentCounts[pay].revenue += amount;
    });

    var avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    document.getElementById('reportStats').innerHTML = '' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--green"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + A.rupiah(totalRevenue) + '</p><p class="admin-stat-label">Total Pendapatan</p></div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--orange"><svg viewBox="0 0 24 24"><path d="M9 11H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-4M9 11V5a2 2 0 012-2h2a2 2 0 012 2v6M9 11h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + totalOrders + '</p><p class="admin-stat-label">Total Pesanan</p></div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--blue"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + A.rupiah(avgOrder) + '</p><p class="admin-stat-label">Rata-rata per Pesanan</p></div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--yellow"><svg viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + totalItems + '</p><p class="admin-stat-label">Total Unit Terjual</p></div></div>';

    renderMonthlyRevenue(monthlyRevenue);
    renderSourceComparison(sourceCounts);
    renderCategoryRevenue(categoryRevenue);
    renderPaymentBreakdown(paymentCounts);
    renderTopProducts(productSales);
  }

  function renderMonthlyRevenue(monthlyRevenue) {
    var chartEl = document.getElementById('monthlyRevenueChart');
    var tableEl = document.getElementById('monthlyRevenueTable');
    var emptyEl = document.getElementById('monthlyRevenueEmpty');

    var keys = Object.keys(monthlyRevenue).sort();
    if (keys.length === 0) {
      chartEl.innerHTML = '';
      tableEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var data = keys.map(function(k) { return monthlyRevenue[k]; });
    var maxRevenue = Math.max.apply(null, data.map(function(m) { return m.revenue; }));

    var chartHTML = '<div class="report-monthly-chart">';
    data.forEach(function(m) {
      var pct = maxRevenue > 0 ? (m.revenue / maxRevenue * 100) : 0;
      var label = MONTH_NAMES[m.month] + ' ' + m.year;
      chartHTML += '<div class="report-monthly-bar">' +
        '<div class="report-monthly-col">' +
          '<div class="report-monthly-fill" style="height:' + Math.max(pct, 4) + '%"></div>' +
        '</div>' +
        '<p class="report-monthly-value">' + A.rupiah(m.revenue) + '</p>' +
        '<p class="report-monthly-label">' + A.escapeHtml(label) + '</p>' +
      '</div>';
    });
    chartHTML += '</div>';
    chartEl.innerHTML = chartHTML;

    var tableHTML = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Bulan</th><th>Pesanan</th><th>Pendapatan</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(m) {
      tableHTML += '<tr>' +
        '<td><strong>' + A.escapeHtml(MONTH_NAMES[m.month] + ' ' + m.year) + '</strong></td>' +
        '<td>' + m.orders + ' pesanan</td>' +
        '<td><strong style="color:#16a34a;">' + A.rupiah(m.revenue) + '</strong></td>' +
      '</tr>';
    });
    tableHTML += '</tbody></table></div>';
    tableEl.innerHTML = tableHTML;
  }

  function renderSourceComparison(sourceCounts) {
    var totalRevenue = sourceCounts.online.revenue + sourceCounts.pos.revenue;
    var totalOrders = sourceCounts.online.orders + sourceCounts.pos.orders;

    var html = '<div class="report-compare-card">' +
      '<div class="report-compare-icon report-compare-icon--online"><svg viewBox="0 0 24 24"><path d="M3 15l9-10 9 10M5 13v6h5v-4h4v4h5v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="report-compare-info">' +
        '<p class="report-compare-label">Online</p>' +
        '<p class="report-compare-value">' + A.rupiah(sourceCounts.online.revenue) + '</p>' +
        '<p class="report-compare-sub">' + sourceCounts.online.orders + ' pesanan</p>' +
      '</div>' +
    '</div>' +
    '<div class="report-compare-card">' +
      '<div class="report-compare-icon report-compare-icon--pos"><svg viewBox="0 0 24 24"><path d="M5 6h14l-1 11H6L5 6zm2-3h10v3H7V3zm5 10a2 2 0 100-4 2 2 0 000 4zM4 18h16v2H4v-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="report-compare-info">' +
        '<p class="report-compare-label">POS</p>' +
        '<p class="report-compare-value">' + A.rupiah(sourceCounts.pos.revenue) + '</p>' +
        '<p class="report-compare-sub">' + sourceCounts.pos.orders + ' pesanan</p>' +
      '</div>' +
    '</div>';

    if (totalRevenue > 0) {
      var onlinePct = Math.round(sourceCounts.online.revenue / totalRevenue * 100);
      html += '<div class="report-compare-card report-compare-card--wide">' +
        '<p class="report-compare-label">Proporsi Pendapatan</p>' +
        '<div class="report-progress">' +
          '<div class="report-progress-bar" style="width:' + onlinePct + '%"></div>' +
        '</div>' +
        '<div class="report-progress-labels">' +
          '<span>Online ' + onlinePct + '%</span>' +
          '<span>POS ' + (100 - onlinePct) + '%</span>' +
        '</div>' +
      '</div>';
    }

    document.getElementById('sourceComparison').innerHTML = html;
  }

  function renderCategoryRevenue(categoryRevenue) {
    var el = document.getElementById('categoryRevenue');
    var emptyEl = document.getElementById('categoryRevenueEmpty');
    var cats = Object.keys(categoryRevenue).map(function(k) { return categoryRevenue[k]; });
    cats.sort(function(a, b) { return b.revenue - a.revenue; });

    if (cats.length === 0) {
      el.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var total = cats.reduce(function(sum, c) { return sum + c.revenue; }, 0);
    var maxRevenue = cats[0].revenue;

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Kategori</th><th>Unit Terjual</th><th>Pendapatan</th><th>Kontribusi</th>' +
      '</tr></thead><tbody>';
    cats.forEach(function(c) {
      var pct = total > 0 ? Math.round(c.revenue / total * 100) : 0;
      var barWidth = maxRevenue > 0 ? (c.revenue / maxRevenue * 100) : 0;
      html += '<tr>' +
        '<td><strong>' + A.escapeHtml(c.name) + '</strong></td>' +
        '<td>' + c.qty + ' unit</td>' +
        '<td><strong style="color:#16a34a;">' + A.rupiah(c.revenue) + '</strong></td>' +
        '<td><div class="report-bar-wrap"><div class="report-bar" style="width:' + barWidth + '%"></div><span>' + pct + '%</span></div></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  }

  function renderPaymentBreakdown(paymentCounts) {
    var el = document.getElementById('paymentBreakdown');
    var payments = Object.keys(paymentCounts).map(function(k) { return paymentCounts[k]; });
    payments.sort(function(a, b) { return b.revenue - a.revenue; });

    if (payments.length === 0) {
      el.innerHTML = '<p class="member-help">Belum ada data metode pembayaran.</p>';
      return;
    }

    var total = payments.reduce(function(sum, p) { return sum + p.revenue; }, 0);
    var html = '';
    payments.forEach(function(p) {
      var pct = total > 0 ? Math.round(p.revenue / total * 100) : 0;
      html += '<div class="report-payment-card">' +
        '<div class="report-payment-info">' +
          '<p class="report-payment-name">' + A.escapeHtml(p.name) + '</p>' +
          '<p class="report-payment-count">' + p.count + ' transaksi</p>' +
        '</div>' +
        '<div class="report-payment-amount">' +
          '<p class="report-payment-value">' + A.rupiah(p.revenue) + '</p>' +
          '<p class="report-payment-pct">' + pct + '%</p>' +
        '</div>' +
      '</div>';
    });
    el.innerHTML = html;
  }

  function renderTopProducts(productSales) {
    var el = document.getElementById('topProducts');
    var emptyEl = document.getElementById('topProductsEmpty');
    var products = Object.keys(productSales).map(function(k) { return productSales[k]; });
    products.sort(function(a, b) { return b.revenue - a.revenue; });
    products = products.slice(0, 10);

    if (products.length === 0) {
      el.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var maxRevenue = products[0].revenue;
    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>#</th><th>Produk</th><th>Terjual</th><th>Pendapatan</th><th></th>' +
      '</tr></thead><tbody>';
    products.forEach(function(p, i) {
      var barWidth = maxRevenue > 0 ? (p.revenue / maxRevenue * 100) : 0;
      html += '<tr>' +
        '<td><strong>' + (i + 1) + '</strong></td>' +
        '<td><strong>' + A.escapeHtml(p.title) + '</strong></td>' +
        '<td>' + p.qty + ' unit</td>' +
        '<td><strong>' + A.rupiah(p.revenue) + '</strong></td>' +
        '<td><div class="admin-bar-wrap"><div class="admin-bar" style="width:' + barWidth + '%"></div></div></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  }

  document.getElementById('reportYear').addEventListener('change', render);
  document.getElementById('reportMonth').addEventListener('change', render);
  document.getElementById('reportSource').addEventListener('change', render);

  document.getElementById('exportReportBtn').addEventListener('click', function() {
    var orders = getFilteredOrders();
    var csv = 'ID,Sumber,Pelanggan,Total,Metode Pembayaran,Status,Tanggal\n';
    orders.forEach(function(o) {
      var isPos = o.isPos || o.source === 'pos';
      var source = isPos ? 'POS' : 'Online';
      var customer = isPos ? (o.customerName || 'Pelanggan POS') : (o.userEmail || '');
      csv += '"' + (o.id || '') + '","' + source + '","' + customer + '","' + (o.total || '') + '","' + (o.paymentMethod || '') + '","' + (o.status || '') + '","' + (o.date || '') + '"\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'laporan-lengkap.csv'; a.click();
    URL.revokeObjectURL(url);
    A.showToast('Laporan lengkap berhasil diexport');
  });

  populateYearFilter();
  render();
})();
