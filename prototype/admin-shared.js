(function() {
  'use strict';

  const ADMIN_KEY = 'gensaberilmu_admin';
  const USER_KEY = 'gensaberilmu_user';
  const ORDERS_KEY = 'gensaberilmu_orders';
  const RECIPIENTS_KEY = 'gensaberilmu_recipients';
  const AFFILIATE_KEY = 'gensaberilmu_affiliate';
  const AFFILIATE_PRODUCTS_KEY = 'gensaberilmu_affiliate_products';
  const PROFILE_KEY = 'gensaberilmu_profile';
  const PRODUCTS_KEY = 'gensaberilmu_products';
  const SETTINGS_KEY = 'gensaberilmu_settings';
  const AFFILIATE_CONFIG_KEY = 'gensaberilmu_affiliate_config';
  const HOME_CONFIG_KEY = 'gensaberilmu_home_config';
  const KIDS_CONFIG_KEY = 'gensaberilmu_kids_config';

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

  function formatDate(d) {
    if (!d) return '-';
    return d;
  }

  function shortDate(d) {
    if (!d) return '-';
    var parts = d.split(', ');
    return parts.length > 1 ? parts[1] : d;
  }

  function encodeWhatsApp(phone) {
    var p = (phone || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  function generateId() {
    return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  function nowStr() {
    var d = new Date();
    var months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() +
      ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  var STATUS_META = {
    pending:   { label: 'Menunggu Pembayaran', cls: 'status-pending' },
    paid:      { label: 'Lunas',                cls: 'status-paid' },
    packed:    { label: 'Dikemas',              cls: 'status-packed' },
    shipping:  { label: 'Dikirim',               cls: 'status-shipping' },
    completed: { label: 'Selesai',               cls: 'status-completed' },
    cancelled: { label: 'Dibatalkan',            cls: 'status-cancelled' }
  };

  var AFFILIATE_COMMISSION_RATES = {
    nb1: 10, nb2: 12, nb3: 15, nb4: 12, nb6: 10, nb7: 12, nb8: 15,
    bs1: 15, bs2: 12, bs3: 10, bs4: 10, bs5: 15, bs6: 12, bs7: 10,
    ib1: 12, ib2: 15, ib3: 12, ib4: 12, ib5: 15, ib6: 15, ib7: 12, ib8: 10,
    kk1: 12, kk2: 10, kk3: 10, kk4: 10, kk5: 10, kk6: 10, kk7: 10, kk8: 12,
    rk1: 10, rk3: 10, rk4: 15, rk5: 12, rk6: 10, rk7: 10, rk8: 10,
    ln2: 12, ln3: 15, ln4: 12, ln6: 10, ln7: 12, ln8: 15, ln9: 10
  };

  function allProducts() {
    var sources = [typeof newBooks !== 'undefined' ? newBooks : null,
                    typeof bestseller !== 'undefined' ? bestseller : null,
                    typeof intlBestseller !== 'undefined' ? intlBestseller : null,
                    typeof keislaman !== 'undefined' ? keislaman : null,
                    typeof klasik !== 'undefined' ? klasik : null,
                    typeof lainnya !== 'undefined' ? lainnya : null];
    var seen = {};
    var merged = [];
    sources.forEach(function(arr) {
      (arr || []).forEach(function(p) {
        if (p && p.id && !seen[p.id]) { seen[p.id] = true; merged.push(p); }
      });
    });
    var custom = read(PRODUCTS_KEY, []);
    custom.forEach(function(p) {
      if (p && p.id && !seen[p.id]) { seen[p.id] = true; merged.push(p); }
    });
    return merged;
  }

  function findProduct(id) {
    return allProducts().find(function(p) { return p.id === id; }) || null;
  }

  function allOrders() { return read(ORDERS_KEY, []); }
  function allMembers() { return read(USER_KEY + 's', []); }
  function allRecipients() { return read(RECIPIENTS_KEY, []); }
  function allAffiliateData() { return read(AFFILIATE_KEY, {}); }
  function allAffiliateProducts() { return read(AFFILIATE_PRODUCTS_KEY, {}); }
  function allProfiles() { return read(PROFILE_KEY, {}); }
  function customProducts() { return read(PRODUCTS_KEY, []); }

  function saveOrders(orders) { write(ORDERS_KEY, orders); }
  function saveCustomProducts(products) { write(PRODUCTS_KEY, products); }
  function saveSettings(s) { write(SETTINGS_KEY, s); }
  function getSettings() { return read(SETTINGS_KEY, { storeName: 'GenSa Berilmu', storeEmail: 'info@gensaberilmu.co.id', storePhone: '0812-3456-7890', bankName: 'BCA', bankAccount: '1234567890', bankName2: 'Mandiri', bankAccount2: '0987654321', shippingCost: 10000 }); }

  function deleteOrder(id) {
    var orders = allOrders();
    orders = orders.filter(function(o) { return o.id !== id; });
    saveOrders(orders);
  }

  function updateOrderStatus(id, status) {
    var orders = allOrders();
    orders.forEach(function(o) {
      if (o.id === id) { o.status = status; o.updatedAt = nowStr(); }
    });
    saveOrders(orders);
  }

  function addCustomProduct(product) {
    var products = customProducts();
    product.id = 'custom_' + Date.now().toString(36);
    product.createdAt = nowStr();
    products.push(product);
    saveCustomProducts(products);
    return product;
  }

  function updateCustomProduct(id, data) {
    var products = customProducts();
    products.forEach(function(p) {
      if (p.id === id) { Object.assign(p, data, { updatedAt: nowStr() }); }
    });
    saveCustomProducts(products);
  }

  function deleteCustomProduct(id) {
    var products = customProducts();
    products = products.filter(function(p) { return p.id !== id; });
    saveCustomProducts(products);
  }

  function getAffiliateConfig() {
    return read(AFFILIATE_CONFIG_KEY, {});
  }

  function saveAffiliateConfig(config) {
    write(AFFILIATE_CONFIG_KEY, config);
  }

  function setAffiliateProduct(productId, rate, enabled) {
    var config = getAffiliateConfig();
    config[productId] = { rate: rate, enabled: enabled !== false };
    saveAffiliateConfig(config);
  }

  function removeAffiliateProduct(productId) {
    var config = getAffiliateConfig();
    delete config[productId];
    saveAffiliateConfig(config);
  }

  function getEffectiveCommissionRate(productId) {
    var config = getAffiliateConfig();
    if (config[productId] && config[productId].enabled) return config[productId].rate;
    if (AFFILIATE_COMMISSION_RATES[productId] != null) return AFFILIATE_COMMISSION_RATES[productId];
    return null;
  }

  // ---------- homepage / kids page configuration ----------
  function getHomeConfig() {
    return read(HOME_CONFIG_KEY, null);
  }

  function saveHomeConfig(config) {
    write(HOME_CONFIG_KEY, config);
  }

  function getKidsConfig() {
    return read(KIDS_CONFIG_KEY, null);
  }

  function saveKidsConfig(config) {
    write(KIDS_CONFIG_KEY, config);
  }

  function getDefaultHomeConfig() {
    return {
      hero: {
        main: 'https://kontan.reneturos.com/storage/admin-uploads/image-may-5-2026-at-03-11-53-pm-1777968754.webp',
        side1: 'https://kontan.reneturos.com/storage/admin-uploads/image-apr-24-2026-at-04-42-37-pm-1777966186.webp',
        side2: 'https://kontan.reneturos.com/storage/admin-uploads/image-may-5-2026-at-02-36-04-pm-1777966586.webp'
      },
      promos: {
        newBooks: 'https://kontan.reneturos.com/storage/admin-uploads/image-apr-27-2026-12-00-36-am-1777222977.webp',
        bestseller: 'https://kontan.reneturos.com/storage/admin-uploads/image-apr-27-2026-12-02-31-am-1777222993.webp',
        intlBestseller: 'https://kontan.reneturos.com/storage/admin-uploads/image-apr-27-2026-12-06-42-am-1777223256.webp',
        keislaman: 'https://kontan.reneturos.com/storage/admin-uploads/image-apr-27-2026-12-09-02-am-1777223387.webp',
        klasik: 'https://kontan.reneturos.com/storage/admin-uploads/image-apr-27-2026-12-19-32-am-1777224216.webp'
      },
      sections: {
        newBooks: newBooks.map(function(p) { return p.id; }),
        bestseller: bestseller.map(function(p) { return p.id; }),
        intlBestseller: intlBestseller.map(function(p) { return p.id; }),
        keislaman: keislaman.map(function(p) { return p.id; }),
        klasik: klasik.map(function(p) { return p.id; }),
        lainnya: lainnya.map(function(p) { return p.id; })
      }
    };
  }

  function getDefaultKidsConfig() {
    return {
      hero: {
        badge: 'Selamat Datang, Kecil!',
        title: 'Dunia Buku yang Ceria dan Penuh Warna',
        description: 'Temukan ribuan buku edukatif, dongeng seru, dan aktivitas menyenangkan untuk si kecil. Belajar jadi lebih happy!',
        image: 'assets/generated/hero-kids.png'
      },
      sections: {
        popular: ['nb1', 'nb2', 'nb3', 'nb4'],
        discount: ['nb5', 'nb6', 'nb7', 'nb8']
      },
      promo: {
        badge: 'Spesial',
        title: 'Paket Hadiah Si Kecil',
        description: 'Dapatkan bundling buku anak dengan harga spesial dan bonus sticker lucu. Cocok untuk kado ulang tahun atau hadiah prestasi!',
        image: 'assets/generated/promo-gift.png'
      }
    };
  }

  // ---------- auth guard ----------
  var admin = read(ADMIN_KEY, null);
  if (!admin) {
    var here = location.href.split('/').pop();
    window.location.href = 'admin-login.html?redirect=' + encodeURIComponent(here || 'admin.html');
    return;
  }

  // ---------- header account button ----------
  var headerActions = document.getElementById('headerActions');
  if (headerActions) {
    headerActions.insertAdjacentHTML('beforeend',
      '<a href="admin.html" class="btn btn-outline member-account-btn">' +
        '<svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        escapeHtml(admin.name || 'Admin') +
      '</a>'
    );
  }

  // ---------- sidebar profile + logout ----------
  var profile = document.getElementById('adminProfile');
  if (profile) {
    profile.innerHTML =
      '<div class="member-avatar">' + escapeHtml((admin.name || 'A').charAt(0).toUpperCase()) + '</div>' +
      '<div class="member-profile-info">' +
        '<p class="member-profile-name">' + escapeHtml(admin.name || 'Admin') + '</p>' +
        '<p class="member-profile-email">Administrator</p>' +
      '</div>';
  }

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('Keluar dari panel admin?')) {
        localStorage.removeItem(ADMIN_KEY);
        window.location.href = 'admin-login.html';
      }
    });
  }

  // ---------- toast ----------
  function showToast(msg, duration) {
    duration = duration || 2500;
    var existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.className = 'admin-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('admin-toast--show'); });
    setTimeout(function() {
      t.classList.remove('admin-toast--show');
      setTimeout(function() { t.remove(); }, 300);
    }, duration);
  }

  // ---------- modal ----------
  function openModal(id) {
    var m = document.getElementById(id);
    if (m) { m.classList.add('admin-modal--open'); document.body.style.overflow = 'hidden'; }
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (m) { m.classList.remove('admin-modal--open'); document.body.style.overflow = ''; }
  }

  window.AdminAPI = {
    admin: admin,
    keys: { ADMIN_KEY, USER_KEY, ORDERS_KEY, RECIPIENTS_KEY, AFFILIATE_KEY, AFFILIATE_PRODUCTS_KEY, PROFILE_KEY, PRODUCTS_KEY, SETTINGS_KEY, AFFILIATE_CONFIG_KEY, HOME_CONFIG_KEY, KIDS_CONFIG_KEY },
    read, write, escapeHtml, rupiah, formatDate, shortDate, encodeWhatsApp, generateId, nowStr,
    STATUS_META, AFFILIATE_COMMISSION_RATES,
    allProducts, findProduct, allOrders, allMembers, allRecipients,
    allAffiliateData, allAffiliateProducts, allProfiles, customProducts,
    saveOrders, saveCustomProducts, saveSettings, getSettings,
    deleteOrder, updateOrderStatus, addCustomProduct, updateCustomProduct, deleteCustomProduct,
    getAffiliateConfig, saveAffiliateConfig, setAffiliateProduct, removeAffiliateProduct, getEffectiveCommissionRate,
    getHomeConfig, saveHomeConfig, getDefaultHomeConfig, getKidsConfig, saveKidsConfig, getDefaultKidsConfig,
    showToast, openModal, closeModal
  };
})();
