(function() {
  'use strict';

  const USER_KEY = 'gensaberilmu_user';
  const ORDERS_KEY = 'gensaberilmu_orders';
  const RECIPIENTS_KEY = 'gensaberilmu_recipients';
  const AFFILIATE_KEY = 'gensaberilmu_affiliate';

  const rupiah = n => 'Rp ' + (n || 0).toLocaleString('id-ID');

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  const user = read(USER_KEY, null);
  if (!user) {
    window.location.href = 'login.html?redirect=member.html';
    return;
  }

  const userCode = (user.email || 'member').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + (user._affiliateId || '');

  // ---------- header (account button) ----------
  const headerActions = document.getElementById('headerActions');
  if (headerActions) {
    headerActions.insertAdjacentHTML('beforeend',
      '<a href="member.html" class="btn btn-outline member-account-btn">' +
        '<svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        (user.name || 'Akun') +
      '</a>'
    );
  }

  const greeting = document.getElementById('memberGreeting');
  if (greeting) greeting.textContent = 'Halo, ' + (user.name || 'Member') + '! Kelola transaksi, afiliasi, dan penerima Anda di sini.';

  // ---------- logout ----------
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Keluar dari akun ini?')) {
      localStorage.removeItem(USER_KEY);
      window.location.href = 'index.html';
    }
  });

  // ---------- tabs ----------
  const tabs = document.querySelectorAll('.member-tab');
  const panels = document.querySelectorAll('.member-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel' + cap(tab.dataset.tab)).classList.add('active');
    });
  });
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- hash routing ----------
  if (location.hash) {
    const targetTab = document.querySelector('.member-tab[data-tab="' + location.hash.slice(1) + '"]');
    if (targetTab) targetTab.click();
  }

  // ============================================================
  // RIWAYAT TRANSAKSI
  // ============================================================
  const STATUS_META = {
    pending:   { label: 'Menunggu Pembayaran', cls: 'status-pending' },
    paid:      { label: 'Lunas',                cls: 'status-paid' },
    shipping:  { label: 'Dikirim',               cls: 'status-shipping' },
    completed: { label: 'Selesai',               cls: 'status-completed' },
    cancelled: { label: 'Dibatalkan',            cls: 'status-cancelled' }
  };

  function renderOrders() {
    const orders = read(ORDERS_KEY, []).filter(o => o.userEmail === user.email).reverse();
    const list = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');
    const count = document.getElementById('ordersCount');
    count.textContent = orders.length ? orders.length + ' transaksi' : '';

    if (!orders.length) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = orders.map(o => {
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
        '<article class="order-card" data-id="' + o.id + '">' +
          '<div class="order-card-head">' +
            '<div>' +
              '<p class="order-id">#' + o.id + '</p>' +
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
                ? '<button type="button" class="btn btn-solid btn-sm order-pay-btn" data-id="' + o.id + '">Bayar Sekarang</button>'
                : '') +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');

    list.querySelectorAll('.order-pay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = 'checkout.html?order=' + btn.dataset.id;
      });
    });
  }

  function encodeWhatsApp(phone) {
    let p = (phone || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  // ============================================================
  // AFILIASI
  // ============================================================
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

  function affiliateBase() {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'product.html';
  }

  function affiliateLink(p) {
    return affiliateBase() + '?id=' + encodeURIComponent(p.id) + '&ref=' + encodeURIComponent(userCode);
  }

  function renderAffiliate() {
    const products = allProducts();
    const stats = read(AFFILIATE_KEY, {});
    const my = stats[user.email] || { clicks: 0, conversions: 0, commission: 0 };

    document.getElementById('affiliateCount').textContent = products.length + ' produk';
    document.getElementById('affiliateStats').innerHTML =
      statCard('Klik Link', my.clicks || 0) +
      statCard('Konversi', my.conversions || 0) +
      statCard('Komisi', rupiah(my.commission || 0));

    const list = document.getElementById('affiliateList');
    list.innerHTML = products.map(p => '' +
      '<article class="affiliate-card">' +
        '<div class="affiliate-product">' +
          '<img src="' + escapeHtml(p.image) + '" alt="">' +
          '<div>' +
            '<p class="affiliate-title">' + escapeHtml(p.title) + '</p>' +
            '<p class="affiliate-price">' + rupiah(p.finalPrice) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="affiliate-link">' +
          '<input type="text" readonly value="' + escapeHtml(affiliateLink(p)) + '" class="affiliate-input">' +
          '<div class="affiliate-actions">' +
            '<button type="button" class="btn btn-outline btn-sm aff-copy" data-link="' + escapeHtml(affiliateLink(p)) + '">Salin</button>' +
            '<a class="btn btn-solid btn-sm" href="https://wa.me/?text=' + encodeURIComponent('Yuk beli ' + p.title + ' seharga ' + rupiah(p.finalPrice) + ' di GenSa Berilmu: ' + affiliateLink(p)) + '" target="_blank" rel="noopener">Bagikan</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    ).join('');

    list.querySelectorAll('.aff-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.closest('.affiliate-card').querySelector('.affiliate-input');
        input.select();
        input.setSelectionRange(0, 99999);
        navigator.clipboard && navigator.clipboard.writeText(btn.dataset.link);
        const orig = btn.textContent;
        btn.textContent = 'Tersalin';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
      });
    });
  }

  function statCard(label, value) {
    return '<div class="stat-card"><p class="stat-value">' + escapeHtml(String(value)) + '</p><p class="stat-label">' + label + '</p></div>';
  }

  // ============================================================
  // PENERIMA (CRUD)
  // ============================================================
  function myRecipients() {
    return read(RECIPIENTS_KEY, []).filter(r => r.userEmail === user.email);
  }

  function renderRecipients() {
    const recipients = myRecipients();
    const list = document.getElementById('recipientsList');
    const empty = document.getElementById('recipientsEmpty');

    if (!recipients.length) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = recipients.map(r => '' +
      '<article class="recipient-card" data-id="' + r.id + '">' +
        '<div class="recipient-head">' +
          '<div class="recipient-name">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            escapeHtml(r.name) +
          '</div>' +
          '<div class="recipient-actions">' +
            '<button type="button" class="icon-text-btn edit-recipient" data-id="' + r.id + '">Ubah</button>' +
            '<button type="button" class="icon-text-btn danger del-recipient" data-id="' + r.id + '">Hapus</button>' +
          '</div>' +
        '</div>' +
        '<dl class="recipient-detail">' +
          '<div><dt>WhatsApp</dt><dd><a href="https://wa.me/' + encodeWhatsApp(r.phone) + '" target="_blank" rel="noopener">' + escapeHtml(r.phone) + '</a></dd></div>' +
          '<div><dt>Email</dt><dd><a href="mailto:' + escapeHtml(r.email) + '">' + escapeHtml(r.email) + '</a></dd></div>' +
        '</dl>' +
        '<div class="recipient-address">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<span>' + escapeHtml(r.address) + '</span>' +
        '</div>' +
      '</article>'
    ).join('');

    list.querySelectorAll('.edit-recipient').forEach(btn => btn.addEventListener('click', () => openRecipientModal(btn.dataset.id)));
    list.querySelectorAll('.del-recipient').forEach(btn => btn.addEventListener('click', () => deleteRecipient(btn.dataset.id)));
  }

  // ---------- modal ----------
  const modal = document.getElementById('recipientModal');
  const form = document.getElementById('recipientForm');
  const title = document.getElementById('recipientModalTitle');

  function openRecipientModal(id) {
    form.reset();
    document.getElementById('recipientId').value = id || '';
    title.textContent = id ? 'Ubah Penerima' : 'Tambah Penerima';
    if (id) {
      const r = myRecipients().find(x => x.id === id);
      if (r) {
        document.getElementById('recipientName').value = r.name || '';
        document.getElementById('recipientPhone').value = r.phone || '';
        document.getElementById('recipientEmail').value = r.email || '';
        document.getElementById('recipientAddress').value = r.address || '';
      }
    }
    modal.style.display = 'flex';
  }
  function closeRecipientModal() { modal.style.display = 'none'; }

  document.getElementById('addRecipientBtn').addEventListener('click', () => openRecipientModal());
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeRecipientModal));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('recipientId').value || ('r' + Date.now());
    const payload = {
      id,
      userEmail: user.email,
      name: document.getElementById('recipientName').value.trim(),
      phone: document.getElementById('recipientPhone').value.trim(),
      email: document.getElementById('recipientEmail').value.trim(),
      address: document.getElementById('recipientAddress').value.trim()
    };
    const all = read(RECIPIENTS_KEY, []);
    const idx = all.findIndex(r => r.id === id);
    if (idx >= 0) all[idx] = payload; else all.push(payload);
    write(RECIPIENTS_KEY, all);
    closeRecipientModal();
    renderRecipients();
  });

  function deleteRecipient(id) {
    const r = myRecipients().find(x => x.id === id);
    if (!r) return;
    if (!confirm('Hapus penerima "' + r.name + '"?')) return;
    const all = read(RECIPIENTS_KEY, []).filter(x => x.id !== id);
    write(RECIPIENTS_KEY, all);
    renderRecipients();
  }

  // ---------- escape ----------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ---------- init ----------
  renderOrders();
  renderAffiliate();
  renderRecipients();
})();
