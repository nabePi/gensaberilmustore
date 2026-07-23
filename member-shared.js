// shared across all member pages: auth guard, sidebar, helpers
(function() {
  'use strict';

  const USER_KEY = 'gensaberilmu_user';
  const ORDERS_KEY = 'gensaberilmu_orders';
  const RECIPIENTS_KEY = 'gensaberilmu_recipients';
  const AFFILIATE_KEY = 'gensaberilmu_affiliate';
  const AFFILIATE_PRODUCTS_KEY = 'gensaberilmu_affiliate_products';
  const PROFILE_KEY = 'gensaberilmu_profile';
  const AFFILIATE_CONFIG_KEY = 'gensaberilmu_affiliate_config';

  // commission rates per product (percentage)
  const AFFILIATE_COMMISSION_RATES = {
    nb1: 10, nb2: 12, nb3: 15, nb4: 12, nb6: 10, nb7: 12, nb8: 15,
    bs1: 15, bs2: 12, bs3: 10, bs4: 10, bs5: 15, bs6: 12, bs7: 10,
    ib1: 12, ib2: 15, ib3: 12, ib4: 12, ib5: 15, ib6: 15, ib7: 12, ib8: 10,
    kk1: 12, kk2: 10, kk3: 10, kk4: 10, kk5: 10, kk6: 10, kk7: 10, kk8: 12,
    rk1: 10, rk3: 10, rk4: 15, rk5: 12, rk6: 10, rk7: 10, rk8: 10,
    ln2: 12, ln3: 15, ln4: 12, ln6: 10, ln7: 12, ln8: 15, ln9: 10
  };

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
    packed:    { label: 'Dikemas',              cls: 'status-packed' },
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
    const savedProfile = read(PROFILE_KEY, {})[user.email] || {};
    const photoHTML = savedProfile.photo
      ? '<img src="' + escapeHtml(savedProfile.photo) + '" alt="" class="member-avatar member-avatar--photo">'
      : '<div class="member-avatar">' + escapeHtml((user.name || user.email || '?').charAt(0).toUpperCase()) + '</div>';
    profile.innerHTML =
      photoHTML +
      '<div class="member-profile-info">' +
        '<p class="member-profile-name">' + escapeHtml(savedProfile.name || user.name || 'Member') + '</p>' +
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
  function affiliateProductsData() {
    return read(AFFILIATE_PRODUCTS_KEY, {})[user.email] || {};
  }

  function saveAffiliateProductsData(data) {
    const all = read(AFFILIATE_PRODUCTS_KEY, {});
    all[user.email] = data;
    write(AFFILIATE_PRODUCTS_KEY, all);
  }

  // Merge hardcoded rates with admin dynamic config (dynamic overrides hardcoded)
  function getEffectiveRates() {
    const config = read(AFFILIATE_CONFIG_KEY, {});
    const rates = { ...AFFILIATE_COMMISSION_RATES };
    Object.keys(config).forEach(id => {
      if (config[id] && config[id].enabled) {
        rates[id] = config[id].rate;
      } else {
        delete rates[id]; // admin disabled this product
      }
    });
    return rates;
  }

  function affiliateProducts() {
    const saved = affiliateProductsData();
    const rates = getEffectiveRates();
    return allProducts()
      .filter(p => rates[p.id] != null)
      .map(p => ({
        ...p,
        commissionRate: rates[p.id],
        commissionAmount: Math.round(p.finalPrice * rates[p.id] / 100),
        selected: !!saved[p.id],
        stats: saved[p.id] || { clicks: 0, conversions: 0, earned: 0 }
      }));
  }

  function selectedAffiliateProducts() {
    return affiliateProducts().filter(p => p.selected);
  }

  function affiliateSummary() {
    const selected = selectedAffiliateProducts();
    const totalCommission = selected.reduce((sum, p) => sum + (p.stats.earned || 0), 0);
    const totalClicks = selected.reduce((sum, p) => sum + (p.stats.clicks || 0), 0);
    const totalConversions = selected.reduce((sum, p) => sum + (p.stats.conversions || 0), 0);
    return { totalCommission, totalClicks, totalConversions, count: selected.length };
  }

  function myProfile() {
    return read(PROFILE_KEY, {})[user.email] || {
      name: user.name || '',
      email: user.email || '',
      phone: '',
      whatsapp: '',
      whatsappSame: true,
      photo: ''
    };
  }

  function saveProfile(data) {
    const all = read(PROFILE_KEY, {});
    all[user.email] = data;
    write(PROFILE_KEY, all);
    if (data.name && data.name !== user.name) {
      user.name = data.name;
      write(USER_KEY, user);
    }
  }

  window.MemberAPI = {
    user, userCode,
    keys: { USER_KEY, ORDERS_KEY, RECIPIENTS_KEY, AFFILIATE_KEY, AFFILIATE_PRODUCTS_KEY, AFFILIATE_CONFIG_KEY },
    read, write, escapeHtml, rupiah, encodeWhatsApp,
    STATUS_META, allProducts, affiliateLink,
    orderCardHTML, bindOrderActions, statCardHTML,
    myOrders: () => read(ORDERS_KEY, []).filter(o => o.userEmail === user.email),
    myRecipients: () => read(RECIPIENTS_KEY, []).filter(r => r.userEmail === user.email),
    myAffiliate: () => read(AFFILIATE_KEY, {})[user.email] || { clicks: 0, conversions: 0, commission: 0 },
    allOrders: () => read(ORDERS_KEY, []),
    allRecipients: () => read(RECIPIENTS_KEY, []),
    affiliateProductsData, saveAffiliateProductsData,
    affiliateProducts, selectedAffiliateProducts, affiliateSummary,
    myProfile, saveProfile, PROFILE_KEY
  };
})();
