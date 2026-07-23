(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var searchInput = document.getElementById('searchInput');
  var tableEl = document.getElementById('membersTable');
  var emptyEl = document.getElementById('membersEmpty');
  var countEl = document.getElementById('memberCount');

  function render() {
    var query = (searchInput.value || '').toLowerCase();
    var orders = A.allOrders();
    var profiles = A.allProfiles();
    var affiliateData = A.allAffiliateData();

    var emailSet = {};
    orders.forEach(function(o) { if (o.userEmail) emailSet[o.userEmail] = true; });
    Object.keys(profiles).forEach(function(e) { emailSet[e] = true; });
    Object.keys(affiliateData).forEach(function(e) { emailSet[e] = true; });

    var members = Object.keys(emailSet).map(function(email) {
      var orderCount = orders.filter(function(o) { return o.userEmail === email; }).length;
      var totalSpent = 0;
      orders.forEach(function(o) {
        if (o.userEmail === email) {
          totalSpent += parseInt(String(o.total || '').replace(/[^0-9]/g, ''), 10) || 0;
        }
      });
      var profile = profiles[email] || {};
      var affiliate = affiliateData[email] || {};
      return {
        email: email,
        name: profile.name || email.split('@')[0],
        phone: profile.phone || '',
        photo: profile.photo || '',
        orderCount: orderCount,
        totalSpent: totalSpent,
        isAffiliate: !!affiliate.commission,
        affiliateCommission: affiliate.commission || 0,
        affiliateConversions: affiliate.conversions || 0
      };
    });

    if (query) {
      members = members.filter(function(m) {
        return m.email.toLowerCase().indexOf(query) !== -1 || m.name.toLowerCase().indexOf(query) !== -1;
      });
    }

    members.sort(function(a, b) { return b.totalSpent - a.totalSpent; });
    countEl.textContent = members.length + ' member';

    if (members.length === 0) {
      tableEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Member</th><th>Telepon</th><th>Pesanan</th><th>Total Belanja</th><th>Afiliasi</th><th>Aksi</th>' +
      '</tr></thead><tbody>';

    members.forEach(function(m) {
      var avatarHTML = m.photo
        ? '<img src="' + A.escapeHtml(m.photo) + '" alt="" class="admin-avatar admin-avatar--photo">'
        : '<div class="admin-avatar">' + A.escapeHtml(m.name.charAt(0).toUpperCase()) + '</div>';

      html += '<tr>' +
        '<td><div class="admin-user-cell">' + avatarHTML +
          '<div><div class="admin-cell-main">' + A.escapeHtml(m.name) + '</div><div class="admin-cell-sub">' + A.escapeHtml(m.email) + '</div></div></div></td>' +
        '<td>' + A.escapeHtml(m.phone || '-') + '</td>' +
        '<td><strong>' + m.orderCount + '</strong> pesanan</td>' +
        '<td><strong>' + A.rupiah(m.totalSpent) + '</strong></td>' +
        '<td>' + (m.isAffiliate ? '<span class="admin-tag admin-tag--green">Aktif</span> <span class="admin-cell-sub">' + m.affiliateConversions + ' konversi</span>' : '<span class="admin-cell-sub">-</span>') + '</td>' +
        '<td><button type="button" class="btn btn-outline btn-sm detail-btn" data-email="' + A.escapeHtml(m.email) + '">Detail</button></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    tableEl.innerHTML = html;

    tableEl.querySelectorAll('.detail-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { showDetail(btn.dataset.email); });
    });
  }

  function showDetail(email) {
    var orders = A.allOrders().filter(function(o) { return o.userEmail === email; });
    var profiles = A.allProfiles();
    var profile = profiles[email] || {};
    var affiliateData = A.allAffiliateData();
    var affiliate = affiliateData[email] || {};
    var recipients = A.allRecipients().filter(function(r) { return r.userEmail === email; });

    var totalSpent = 0;
    orders.forEach(function(o) {
      totalSpent += parseInt(String(o.total || '').replace(/[^0-9]/g, ''), 10) || 0;
    });

    var ordersHTML = orders.length > 0
      ? orders.map(function(o) {
          var meta = A.STATUS_META[o.status] || {};
          return '<div class="admin-detail-row"><span>#' + A.escapeHtml(o.id) + '</span><span>' + (meta.label || o.status) + '</span><span>' + A.escapeHtml(o.total || '-') + '</span><span>' + A.shortDate(o.date) + '</span></div>';
        }).join('')
      : '<p class="admin-cell-sub">Belum ada pesanan.</p>';

    var recipientsHTML = recipients.length > 0
      ? recipients.map(function(r) {
          return '<div class="admin-detail-row"><span>' + A.escapeHtml(r.name || '-') + '</span><span>' + A.escapeHtml(r.phone || '-') + '</span><span>' + A.escapeHtml(r.address || '-') + '</span></div>';
        }).join('')
      : '<p class="admin-cell-sub">Belum ada data penerima.</p>';

    document.getElementById('memberModalBody').innerHTML =
      '<div class="admin-detail-section">' +
        '<div class="admin-detail-grid">' +
          '<div class="admin-detail-full"><span class="admin-detail-label">Email</span><span class="admin-detail-value">' + A.escapeHtml(email) + '</span></div>' +
          '<div><span class="admin-detail-label">Nama</span><span class="admin-detail-value">' + A.escapeHtml(profile.name || '-') + '</span></div>' +
          '<div><span class="admin-detail-label">Telepon</span><span class="admin-detail-value">' + A.escapeHtml(profile.phone || '-') + '</span></div>' +
          '<div><span class="admin-detail-label">WhatsApp</span><span class="admin-detail-value">' + A.escapeHtml(profile.whatsapp || profile.phone || '-') + '</span></div>' +
          '<div><span class="admin-detail-label">Total Belanja</span><span class="admin-detail-value" style="font-weight:700;color:var(--orange);">' + A.rupiah(totalSpent) + '</span></div>' +
          '<div><span class="admin-detail-label">Pesanan</span><span class="admin-detail-value">' + orders.length + ' pesanan</span></div>' +
          '<div><span class="admin-detail-label">Afiliasi</span><span class="admin-detail-value">' + (affiliate.commission ? A.rupiah(affiliate.commission) + ' komisi (' + (affiliate.conversions || 0) + ' konversi)' : 'Tidak aktif') + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-detail-section"><h4>Riwayat Pesanan</h4>' + ordersHTML + '</div>' +
      '<div class="admin-detail-section"><h4>Data Penerima</h4>' + recipientsHTML + '</div>';

    A.openModal('memberModal');
  }

  document.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', function() { A.closeModal(el.dataset.close); });
  });

  searchInput.addEventListener('input', render);
  render();
})();
