// shared across all member pages: auth guard, sidebar, helpers
(function() {
  'use strict';

  const USER_KEY = 'gensaberilmu_user';
  const ORDERS_KEY = 'gensaberilmu_orders';
  const RECIPIENTS_KEY = 'gensaberilmu_recipients';
  const AFFILIATE_KEY = 'gensaberilmu_affiliate';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function rupiah(n) { return 'Rp ' + (n || 0).toLocaleString('id-ID'); }

  function encodeWhatsApp(phone) {
    let p = (phone || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  const STATUS_META = {
    pending:   { label: 'Menunggu Pembayaran', cls: 'status-pending' },
    paid:      { label: 'Lunas',                cls: 'status-paid' },
    shipping:  { label: 'Dikirim',               cls: 'status-shipping' },
    completed: { label: 'Selesai',               cls: 'status-completed' },
    cancelled: { label: 'Dibatalkan',            cls: 'status-cancelled' }
  };

  function allProducts() {
    const sources = [typeof newBooks !== 'undefined' ? newBooks : null,
                      typeof bestseller !== 'undefined' ? bestseller : null,
                      typeof intlBestseller !== 'undefined' ? intlBestseller : null,
                      typeof keislaman !== 'undefined' ? keislaman : null,
                      typeof klasik !== 'undefined' ? klasik : null,
                      typeof lainnya !== 'undefined' ? lainnya : null];
    const seen = {};
    const merged = [];
    sources.forEach(arr => {
      (arr || []).forEach(p => {
        if (p && p.id && !seen[p.id]) { seen[p.id] = true; merged.push(p); }
      });
    });
    return merged;
  }

  // ---------- bootstrap: auth guard ----------
  const user = read(USER_KEY, null);
  if (!user) {
    const here = location.href.split('/').pop();
    window.location.href = 'login.html?redirect=' + encodeURIComponent(here || 'member-dashboard.html');
    return;
  }

  const userCode = (user.email || 'member').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  function affiliateBase() {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'product.html';
  }
  function affiliateLink(p) {
    return affiliateBase() + '?id=' + encodeURIComponent(p.id) + '&ref=' + encodeURIComponent(userCode);
  }

  // ---------- header account button ----------
  const headerActions = document.getElementById('headerActions');
  if (headerActions) {
    headerActions.insertAdjacentHTML('beforeend',
      '<a href="member-dashboard.html" class="btn btn-outline member-account-btn">' +
        '<svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        escapeHtml(user.name || 'Akun') +
      '</a>'
    );
  }

  // ---------- sidebar profile + logout ----------
  const profile = document.getElementById('memberProfile');
  if (profile) {
    profile.innerHTML =
      '<div class="member-avatar">' + escapeHtml((user.name || user.email || '?').charAt(0).toUpperCase()) + '</div>' +
      '<div class="member-profile-info">' +
        '<p class="member-profile-name">' + escapeHtml(user.name || 'Member') + '</p>' +
        '<p class="member-profile-email">' + escapeHtml(user.email || '') + '</p>' +
      '</div>';
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('Keluar dari akun ini?')) {
        localStorage.removeItem(USER_KEY);
        window.location.href = 'index.html';
      }
    });
  }

  // ---------- order card HTML (+ bind actions) ----------
  function orderCardHTML(o) {
    const meta = STATUS_META[o.status] || STATUS_META.pending;
    const items = (o.items || []).map(it =>
      '<div class="order-item">' +
        '<img src="' + escapeHtml(it.image) + '" alt="">' +
        '<div class="order-item-info">' +
          '<p class="order-item-title">' + escapeHtml(it.title) + '</p>' +
          '<p class="order-item-qty">' + (it.qty || 1) + ' x ' + rupiah(it.finalPrice) + '</p>' +
        '</div>' +
      '</div>'
    ).join('');

    return '' +
      '<article class="order-card" data-id="' + escapeHtml(o.id) + '">' +
        '<div class="order-card-head">' +
          '<div>' +
            '<p class="order-id">#' + escapeHtml(o.id) + '</p>' +
            '<p class="order-date">' + escapeHtml(o.date) + '</p>' +
          '</div>' +
          '<span class="order-status ' + meta.cls + '">' + meta.label + '</span>' +
        '</div>' +
        '<div class="order-items">' + items + '</div>' +
        '<div class="order-card-foot">' +
          '<div class="order-total"><span>Total</span><strong>' + escapeHtml(o.total) + '</strong></div>' +
          '<div class="order-actions">' +
            (o.recipient
              ? '<a class="btn btn-outline btn-sm" href="https://wa.me/' + encodeWhatsApp(o.recipient.phone) + '" target="_blank" rel="noopener">Hubungi Penerima</a>'
              : '') +
            (o.status === 'pending'
              ? '<button type="button" class="btn btn-solid btn-sm order-pay-btn" data-id="' + escapeHtml(o.id) + '">Bayar Sekarang</button>'
              : '') +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function bindOrderActions(container) {
    if (!container) return;
    container.querySelectorAll('.order-pay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = 'checkout.html?order=' + encodeURIComponent(btn.dataset.id);
      });
    });
  }

  // ---------- stat card ----------
  function statCardHTML(label, value) {
    return '<div class="stat-card"><p class="stat-value">' + escapeHtml(String(value)) + '</p><p class="stat-label">' + escapeHtml(label) + '</p></div>';
  }

  // ---------- expose ----------
  window.MemberAPI = {
    user, userCode,
    keys: { USER_KEY, ORDERS_KEY, RECIPIENTS_KEY, AFFILIATE_KEY },
    read, write, escapeHtml, rupiah, encodeWhatsApp,
    STATUS_META, allProducts, affiliateLink,
    orderCardHTML, bindOrderActions, statCardHTML,
    myOrders: () => read(ORDERS_KEY, []).filter(o => o.userEmail === user.email),
    myRecipients: () => read(RECIPIENTS_KEY, []).filter(r => r.userEmail === user.email),
    myAffiliate: () => read(AFFILIATE_KEY, {})[user.email] || { clicks: 0, conversions: 0, commission: 0 },
    allOrders: () => read(ORDERS_KEY, []),
    allRecipients: () => read(RECIPIENTS_KEY, [])
  };
})();
