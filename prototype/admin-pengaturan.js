(function() {
  'use strict';
  var A = window.AdminAPI;
  if (!A) return;

  var settings = A.getSettings();

  document.getElementById('storeName').value = settings.storeName || '';
  document.getElementById('storeEmail').value = settings.storeEmail || '';
  document.getElementById('storePhone').value = settings.storePhone || '';
  document.getElementById('storeAddress').value = settings.storeAddress || '';
  document.getElementById('bankName').value = settings.bankName || '';
  document.getElementById('bankAccount').value = settings.bankAccount || '';
  document.getElementById('bankName2').value = settings.bankName2 || '';
  document.getElementById('bankAccount2').value = settings.bankAccount2 || '';
  document.getElementById('shippingCost').value = settings.shippingCost || 10000;
  document.getElementById('freeShippingMin').value = settings.freeShippingMin || 200000;
  document.getElementById('adminName').value = A.admin.name || '';
  document.getElementById('adminEmail').value = A.admin.email || '';

  document.getElementById('settingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var data = {
      storeName: document.getElementById('storeName').value.trim(),
      storeEmail: document.getElementById('storeEmail').value.trim(),
      storePhone: document.getElementById('storePhone').value.trim(),
      storeAddress: document.getElementById('storeAddress').value.trim(),
      bankName: document.getElementById('bankName').value.trim(),
      bankAccount: document.getElementById('bankAccount').value.trim(),
      bankName2: document.getElementById('bankName2').value.trim(),
      bankAccount2: document.getElementById('bankAccount2').value.trim(),
      shippingCost: parseInt(document.getElementById('shippingCost').value, 10) || 0,
      freeShippingMin: parseInt(document.getElementById('freeShippingMin').value, 10) || 0
    };
    A.saveSettings(data);

    var newName = document.getElementById('adminName').value.trim();
    if (newName && newName !== A.admin.name) {
      A.admin.name = newName;
      A.write(A.keys.ADMIN_KEY, A.admin);
    }

    var msg = document.getElementById('saveMsg');
    msg.classList.add('admin-save-msg--show');
    setTimeout(function() { msg.classList.remove('admin-save-msg--show'); }, 2500);
    A.showToast('Pengaturan tersimpan');
  });

  var keys = A.keys;
  var infoEl = document.getElementById('storageInfo');
  var storages = [
    { key: keys.ORDERS_KEY, label: 'Pesanan' },
    { key: keys.USER_KEY + 's', label: 'Member' },
    { key: keys.PRODUCTS_KEY, label: 'Produk Custom' },
    { key: keys.RECIPIENTS_KEY, label: 'Penerima' },
    { key: keys.AFFILIATE_KEY, label: 'Afiliasi' },
    { key: keys.AFFILIATE_PRODUCTS_KEY, label: 'Produk Afiliasi' },
    { key: keys.PROFILE_KEY, label: 'Profil' },
    { key: keys.SETTINGS_KEY, label: 'Pengaturan' }
  ];

  var shtml = '<div class="admin-storage-grid">';
  storages.forEach(function(s) {
    var raw = localStorage.getItem(s.key);
    var size = raw ? (raw.length * 2) : 0;
    var display = size > 1024 ? (size / 1024).toFixed(1) + ' KB' : size + ' B';
    shtml += '<div class="admin-storage-item"><span class="admin-detail-label">' + s.label + '</span><span class="admin-detail-value">' + display + '</span></div>';
  });
  shtml += '</div>';
  infoEl.innerHTML = shtml;

  document.getElementById('resetOrdersBtn').addEventListener('click', function() {
    if (confirm('Hapus semua data pesanan?')) {
      localStorage.removeItem(keys.ORDERS_KEY);
      A.showToast('Pesanan berhasil direset');
      location.reload();
    }
  });

  document.getElementById('resetAllBtn').addEventListener('click', function() {
    if (confirm('HAPUS SEMUA DATA? Ini tidak bisa dibatalkan!')) {
      if (confirm('Apakah Anda benar-benar yakin?')) {
        Object.keys(localStorage).forEach(function(k) {
          if (k.indexOf('gensaberilmu') === 0) localStorage.removeItem(k);
        });
        localStorage.removeItem(keys.ADMIN_KEY);
        window.location.href = 'admin-login.html';
      }
    }
  });
})();
