(function() {
  'use strict';
  const A = window.MemberAPI;
  const { escapeHtml, rupiah, affiliateLink } = A;

  const products = A.affiliateProducts();
  const list = document.getElementById('afpList');
  const countEl = document.getElementById('afpSelectedCount');

  function updateCount() {
    const n = products.filter(p => p.selected).length;
    countEl.textContent = n + ' dipilih';
  }

  function render() {
    list.innerHTML = products.map(p => {
      const checked = p.selected ? 'checked' : '';
      return '' +
        '<article class="afp-card" data-id="' + escapeHtml(p.id) + '">' +
          '<label class="afp-check">' +
            '<input type="checkbox" ' + checked + ' class="afp-toggle" data-id="' + escapeHtml(p.id) + '">' +
            '<span class="afp-checkmark"></span>' +
          '</label>' +
          '<div class="afp-product">' +
            '<img src="' + escapeHtml(p.image) + '" alt="">' +
            '<div class="afp-product-info">' +
              '<p class="afp-title">' + escapeHtml(p.title) + '</p>' +
              '<p class="afp-author">' + escapeHtml(p.author) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="afp-pricing">' +
            '<p class="afp-price">' + rupiah(p.finalPrice) + '</p>' +
          '</div>' +
          '<div class="afp-commission-badge">' +
            '<span class="afp-comm-pct">' + p.commissionRate + '%</span>' +
            '<span class="afp-comm-label">Komisi</span>' +
          '</div>' +
          '<div class="afp-commission-amount">' +
            '<span class="afp-comm-value">' + rupiah(p.commissionAmount) + '</span>' +
            '<span class="afp-comm-per-sale">per penjualan</span>' +
          '</div>' +
        '</article>';
    }).join('');

    updateCount();

    list.querySelectorAll('.afp-toggle').forEach(cb => {
      cb.addEventListener('change', function() {
        const id = this.dataset.id;
        const prod = products.find(p => p.id === id);
        if (prod) prod.selected = this.checked;
        this.closest('.afp-card').classList.toggle('afp-card--selected', this.checked);
        updateCount();
      });
    });

    list.querySelectorAll('.afp-card').forEach(card => {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.afp-toggle') || e.target.closest('a')) return;
        const cb = card.querySelector('.afp-toggle');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });
    });
  }

  document.getElementById('afpSaveBtn').addEventListener('click', function() {
    const saved = {};
    products.forEach(p => {
      if (p.selected) {
        saved[p.id] = p.stats || { clicks: 0, conversions: 0, earned: 0 };
      }
    });
    A.saveAffiliateProductsData(saved);
    this.textContent = 'Tersimpan!';
    this.classList.add('afp-saved');
    setTimeout(() => {
      this.textContent = 'Simpan Pilihan';
      this.classList.remove('afp-saved');
    }, 1500);
  });

  render();
})();
