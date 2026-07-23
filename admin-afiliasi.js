(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var affiliateData = A.allAffiliateData();
  var affiliateProducts = A.allAffiliateProducts();
  var affiliateConfig = A.getAffiliateConfig();

  var totalCommission = 0;
  var totalClicks = 0;
  var totalConversions = 0;
  var activeCount = 0;

  Object.keys(affiliateData).forEach(function(email) {
    var a = affiliateData[email];
    if (a && a.commission) { totalCommission += a.commission; activeCount++; }
    if (a) { totalClicks += a.clicks || 0; totalConversions += a.conversions || 0; }
  });

  var statsHTML = '' +
    '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--green"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + activeCount + '</p><p class="admin-stat-label">Afiliasi Aktif</p></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--orange"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + A.rupiah(totalCommission) + '</p><p class="admin-stat-label">Total Komisi</p></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--blue"><svg viewBox="0 0 24 24"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + totalClicks.toLocaleString() + '</p><p class="admin-stat-label">Total Klik</p></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon admin-stat-icon--yellow"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="admin-stat-info"><p class="admin-stat-value">' + totalConversions + '</p><p class="admin-stat-label">Total Konversi</p></div></div>';

  document.getElementById('affiliateStats').innerHTML = statsHTML;
  document.getElementById('affiliateCount').textContent = activeCount + ' aktif';

  var affiliates = Object.keys(affiliateData).map(function(email) {
    var a = affiliateData[email] || {};
    var selected = affiliateProducts[email] || {};
    var selectedCount = Object.keys(selected).filter(function(k) { return selected[k]; }).length;
    return { email: email, clicks: a.clicks || 0, conversions: a.conversions || 0, commission: a.commission || 0, selectedCount: selectedCount };
  }).filter(function(a) { return a.clicks > 0 || a.conversions > 0 || a.commission > 0; });

  affiliates.sort(function(a, b) { return b.commission - a.commission; });

  var tableEl = document.getElementById('affiliateTable');
  var emptyEl = document.getElementById('affiliateEmpty');

  if (affiliates.length === 0) {
    emptyEl.style.display = '';
  } else {
    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Email</th><th>Produk Dipilih</th><th>Klik</th><th>Konversi</th><th>Komisi</th><th>CTR</th>' +
      '</tr></thead><tbody>';
    affiliates.forEach(function(a) {
      var ctr = a.clicks > 0 ? (a.conversions / a.clicks * 100).toFixed(1) + '%' : '-';
      html += '<tr>' +
        '<td><strong>' + A.escapeHtml(a.email) + '</strong></td>' +
        '<td>' + a.selectedCount + ' produk</td>' +
        '<td>' + a.clicks + '</td>' +
        '<td>' + a.conversions + '</td>' +
        '<td><strong style="color:#16a34a;">' + A.rupiah(a.commission) + '</strong></td>' +
        '<td>' + ctr + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    tableEl.innerHTML = html;
  }

  renderCommissionTable();
  renderAffiliateProductTable();

  function renderCommissionTable() {
    var commTableEl = document.getElementById('commissionTable');
    var config = A.getAffiliateConfig();
    var products = A.allProducts();
    var eligibleProducts = products.filter(function(p) {
      if (config[p.id] && config[p.id].enabled) return true;
      if (A.AFFILIATE_COMMISSION_RATES[p.id] != null) return true;
      return false;
    });

    if (eligibleProducts.length === 0) {
      commTableEl.innerHTML = '<p class="admin-cell-sub">Tidak ada produk afiliasi.</p>';
      return;
    }

    var chtml = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Produk</th><th>Harga</th><th>Tingkat Komisi</th><th>Komisi/Sale</th><th>Sumber</th>' +
      '</tr></thead><tbody>';
    eligibleProducts.forEach(function(p) {
      var rate = A.getEffectiveCommissionRate(p.id);
      if (rate == null) return;
      var comm = Math.round((p.finalPrice || p.price) * rate / 100);
      var source = config[p.id] ? '<span class="admin-tag admin-tag--green">Custom</span>' : '<span class="admin-tag">Default</span>';
      chtml += '<tr>' +
        '<td><strong>' + A.escapeHtml(p.title) + '</strong><div class="admin-cell-sub">' + A.escapeHtml(p.author || '') + '</div></td>' +
        '<td>' + A.rupiah(p.finalPrice || p.price) + '</td>' +
        '<td><span class="admin-tag admin-tag--green">' + rate + '%</span></td>' +
        '<td><strong style="color:#16a34a;">' + A.rupiah(comm) + '</strong></td>' +
        '<td>' + source + '</td>' +
      '</tr>';
    });
    chtml += '</tbody></table></div>';
    commTableEl.innerHTML = chtml;
  }

  function renderAffiliateProductTable() {
    var config = A.getAffiliateConfig();
    var products = A.allProducts();
    var container = document.getElementById('affiliateProductTable');
    var emptyEl2 = document.getElementById('affiliateProductEmpty');

    var allWithConfig = products.map(function(p) {
      var cfg = config[p.id];
      var defaultRate = A.AFFILIATE_COMMISSION_RATES[p.id];
      var rate = cfg && cfg.enabled ? cfg.rate : (defaultRate != null ? defaultRate : null);
      var enabled = cfg ? cfg.enabled : (defaultRate != null);
      var isCustom = !!cfg;
      return { product: p, rate: rate, enabled: enabled, isCustom: isCustom };
    }).filter(function(item) {
      return item.rate !== null || item.isCustom;
    });

    if (allWithConfig.length === 0) {
      container.innerHTML = '';
      emptyEl2.style.display = '';
      return;
    }
    emptyEl2.style.display = 'none';

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Gambar</th><th>Produk</th><th>Harga</th><th>Komisi</th><th>Status</th><th>Aksi</th>' +
      '</tr></thead><tbody>';

    allWithConfig.forEach(function(item) {
      var p = item.product;
      var comm = item.rate ? Math.round((p.finalPrice || p.price) * item.rate / 100) : 0;
      var statusHTML = item.enabled
        ? '<span class="admin-tag admin-tag--green">Aktif</span>'
        : '<span class="admin-tag admin-tag--red">Nonaktif</span>';

      html += '<tr>' +
        '<td><img src="' + A.escapeHtml(p.image || '') + '" alt="" class="admin-table-thumb"></td>' +
        '<td><div class="admin-cell-main">' + A.escapeHtml(p.title) + '</div><div class="admin-cell-sub">' + A.escapeHtml(p.author || '') + '</div></td>' +
        '<td>' + A.rupiah(p.finalPrice || p.price) + '</td>' +
        '<td><strong style="color:#16a34a;">' + (item.rate ? item.rate + '% (' + A.rupiah(comm) + ')' : '-') + '</strong></td>' +
        '<td>' + statusHTML + '</td>' +
        '<td><div class="admin-actions">' +
          '<button type="button" class="btn btn-outline btn-sm edit-aff-btn" data-id="' + A.escapeHtml(p.id) + '">Edit</button>' +
          (item.isCustom ? '<button type="button" class="btn btn-text btn-sm delete-aff-btn" data-id="' + A.escapeHtml(p.id) + '">Hapus</button>' : '') +
        '</div></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll('.edit-aff-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openEditModal(btn.dataset.id); });
    });
    container.querySelectorAll('.delete-aff-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (confirm('Hapus produk afiliasi ini?')) {
          A.removeAffiliateProduct(btn.dataset.id);
          A.showToast('Produk afiliasi dihapus');
          affiliateConfig = A.getAffiliateConfig();
          renderAffiliateProductTable();
          renderCommissionTable();
        }
      });
    });
  }

  function populateProductSelect(excludeId) {
    var config = A.getAffiliateConfig();
    var products = A.allProducts();
    var select = document.getElementById('affProductSelect');
    var html = '<option value="">-- Pilih Produk --</option>';
    products.forEach(function(p) {
      var isDefault = A.AFFILIATE_COMMISSION_RATES[p.id] != null;
      var isCustom = config[p.id];
      if (isDefault && !isCustom && p.id !== excludeId) return;
      if (excludeId && p.id === excludeId) {
        html += '<option value="' + A.escapeHtml(p.id) + '" selected>' + A.escapeHtml(p.title) + ' - ' + A.escapeHtml(p.author || '') + '</option>';
      } else if (!isDefault || isCustom) {
        html += '<option value="' + A.escapeHtml(p.id) + '">' + A.escapeHtml(p.title) + ' - ' + A.escapeHtml(p.author || '') + '</option>';
      }
    });
    select.innerHTML = html;
  }

  function resetForm() {
    document.getElementById('affProductForm').reset();
    document.getElementById('affProductId').value = '';
    document.getElementById('affProductModalTitle').textContent = 'Tambah Produk Afiliasi';
    document.getElementById('affProductEnabled').checked = true;
  }

  function openEditModal(productId) {
    resetForm();
    var config = A.getAffiliateConfig();
    var cfg = config[productId];
    var defaultRate = A.AFFILIATE_COMMISSION_RATES[productId];
    var p = A.findProduct(productId);

    document.getElementById('affProductModalTitle').textContent = 'Edit Produk Afiliasi';
    document.getElementById('affProductId').value = productId;

    populateProductSelect(productId);
    document.getElementById('affProductSelect').value = productId;
    document.getElementById('affProductSelect').disabled = true;
    document.getElementById('affProductRate').value = cfg ? cfg.rate : (defaultRate || 10);
    document.getElementById('affProductEnabled').checked = cfg ? cfg.enabled : true;

    A.openModal('affiliateProductModal');
  }

  document.getElementById('addAffiliateProductBtn').addEventListener('click', function() {
    resetForm();
    populateProductSelect(null);
    document.getElementById('affProductSelect').disabled = false;
    A.openModal('affiliateProductModal');
  });

  document.getElementById('saveAffProductBtn').addEventListener('click', function() {
    var productId = document.getElementById('affProductSelect').value;
    var rate = parseInt(document.getElementById('affProductRate').value, 10);
    var enabled = document.getElementById('affProductEnabled').checked;
    var existingId = document.getElementById('affProductId').value;

    if (!productId) {
      A.showToast('Pilih produk terlebih dahulu');
      return;
    }
    if (!rate || rate < 1 || rate > 50) {
      A.showToast('Komisi harus antara 1-50%');
      return;
    }

    if (existingId && existingId !== productId) {
      A.removeAffiliateProduct(existingId);
    }

    A.setAffiliateProduct(productId, rate, enabled);
    A.showToast('Produk afiliasi berhasil disimpan');
    A.closeModal('affiliateProductModal');
    affiliateConfig = A.getAffiliateConfig();
    renderAffiliateProductTable();
    renderCommissionTable();
  });

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });
})();
