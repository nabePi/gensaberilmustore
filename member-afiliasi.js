(function() {
  'use strict';
  const A = window.MemberAPI;
  const { escapeHtml, rupiah, affiliateLink, statCardHTML } = A;

  const summary = A.affiliateSummary();
  const selected = A.selectedAffiliateProducts();

  document.getElementById('affiliateStats').innerHTML =
    statCardHTML('Produk Aktif', summary.count) +
    statCardHTML('Klik Total', summary.totalClicks) +
    statCardHTML('Total Komisi', rupiah(summary.totalCommission));

  const tbody = document.getElementById('afcbBody');
  const tfoot = document.getElementById('afcbFoot');
  const empty = document.getElementById('afcbEmpty');

  if (selected.length === 0) {
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = selected.map(p => '' +
      '<tr>' +
        '<td class="afcb-product">' +
          '<img src="' + escapeHtml(p.image) + '" alt="">' +
          '<span>' + escapeHtml(p.title) + '</span>' +
        '</td>' +
        '<td class="afcb-price">' + rupiah(p.finalPrice) + '</td>' +
        '<td class="afcb-rate">' + p.commissionRate + '%</td>' +
        '<td class="afcb-earned">' + rupiah(p.stats.earned || 0) + '</td>' +
      '</tr>'
    ).join('');

    tfoot.innerHTML = '' +
      '<tr class="afcb-total-row">' +
        '<td colspan="3"><strong>Total Penghasilan</strong></td>' +
        '<td class="afcb-earned"><strong>' + rupiah(summary.totalCommission) + '</strong></td>' +
      '</tr>';
  }

  const list = document.getElementById('affiliateList');
  if (selected.length === 0) {
    list.innerHTML = '' +
      '<div class="affiliate-empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;color:var(--text-light-gray)"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>' +
        '<p>Anda belum memilih produk afiliasi.</p>' +
        '<a href="member-afiliasi-produk.html" class="btn btn-solid btn-sm">Pilih Produk Sekarang</a>' +
      '</div>';
  } else {
    list.innerHTML = selected.map(p => '' +
      '<article class="affiliate-card">' +
        '<div class="affiliate-product">' +
          '<img src="' + escapeHtml(p.image) + '" alt="">' +
          '<div>' +
            '<p class="affiliate-title">' + escapeHtml(p.title) + '</p>' +
            '<p class="affiliate-price">' + rupiah(p.finalPrice) + ' <span class="affiliate-comm-tag">' + p.commissionRate + '% komisi</span></p>' +
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
  }
})();
