(function() {
  'use strict';
  const A = window.MemberAPI;
  const { escapeHtml, rupiah, affiliateLink, statCardHTML } = A;

  const products = A.allProducts();
  const aff = A.myAffiliate();

  document.getElementById('affiliateCount').textContent = products.length + ' produk';
  document.getElementById('affiliateStats').innerHTML =
    statCardHTML('Klik Link', aff.clicks || 0) +
    statCardHTML('Konversi', aff.conversions || 0) +
    statCardHTML('Komisi', rupiah(aff.commission || 0));

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
      if (navigator.clipboard) navigator.clipboard.writeText(btn.dataset.link);
      const orig = btn.textContent;
      btn.textContent = 'Tersalin';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    });
  });
})();
