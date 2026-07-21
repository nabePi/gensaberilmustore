(function() {
  'use strict';
  const A = window.MemberAPI;
  const { escapeHtml, rupiah, orderCardHTML, bindOrderActions, statCardHTML } = A;

  // welcome
  const welcome = document.getElementById('dashboardWelcome');
  if (welcome) welcome.textContent = 'Halo, ' + (A.user.name || 'Member') + '! Berikut ringkasan aktivitas akun Anda.';

  // stats
  const orders = A.myOrders();
  const recipients = A.myRecipients();
  const aff = A.myAffiliate();
  const completed = orders.filter(o => o.status === 'completed' || o.status === 'paid').length;

  const stats = document.getElementById('dashboardStats');
  if (stats) {
    stats.innerHTML =
      statCardHTML('Total Transaksi', orders.length) +
      statCardHTML('Pesanan Selesai', completed) +
      statCardHTML('Daftar Penerima', recipients.length) +
      statCardHTML('Klik Afiliasi', aff.clicks || 0) +
      statCardHTML('Komisi Afiliasi', rupiah(aff.commission || 0)) +
      statCardHTML('Produk Afiliasi', A.allProducts().length);
  }

  // recent orders
  const recentOrders = orders.slice(-3).reverse();
  const recentList = document.getElementById('recentOrders');
  const recentEmpty = document.getElementById('recentOrdersEmpty');
  if (recentList) {
    if (!recentOrders.length) {
      recentList.innerHTML = '';
      recentEmpty.style.display = 'flex';
    } else {
      recentEmpty.style.display = 'none';
      recentList.innerHTML = recentOrders.map(orderCardHTML).join('');
      bindOrderActions(recentList);
    }
  }

  // quick links
  document.querySelectorAll('[data-goto]').forEach(el =>
    el.addEventListener('click', () => { window.location.href = el.dataset.goto; })
  );
})();
