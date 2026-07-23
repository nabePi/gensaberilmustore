(function() {
  'use strict';

  var A = window.AdminAPI;
  if (!A) return;

  var allProducts = A.allProducts();
  var homeConfig = A.getHomeConfig() || A.getDefaultHomeConfig();
  var kidsConfig = A.getKidsConfig() || A.getDefaultKidsConfig();

  var homeSectionMap = {
    homeNewBooks: 'newBooks',
    homeBestseller: 'bestseller',
    homeIntlBestseller: 'intlBestseller',
    homeKeislaman: 'keislaman',
    homeKlasik: 'klasik',
    homeLainnya: 'lainnya'
  };

  var kidsSectionMap = {
    kidsPopular: 'popular',
    kidsDiscount: 'discount'
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function buildChecklist(containerId, selectedIds) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var selectedSet = new Set(selectedIds || []);
    container.innerHTML = allProducts.map(function(p) {
      var checked = selectedSet.has(p.id) ? 'checked' : '';
      return '<label class="product-checkitem" data-title="' + escapeHtml(p.title.toLowerCase()) + '" data-author="' + escapeHtml(p.author.toLowerCase()) + '">' +
        '<input type="checkbox" value="' + escapeHtml(p.id) + '" ' + checked + '>' +
        '<img src="' + escapeHtml(p.image) + '" alt="" loading="lazy">' +
        '<span class="product-checkitem-info">' +
          '<span class="product-checkitem-title">' + escapeHtml(p.title) + '</span>' +
          '<span class="product-checkitem-author">' + escapeHtml(p.author) + '</span>' +
          '<span class="product-checkitem-price">' + A.rupiah(p.finalPrice) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');
  }

  function getSelectedIds(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return [];
    var ids = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(function(input) {
      ids.push(input.value);
    });
    return ids;
  }

  function setInput(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function loadHomeForm() {
    var hero = homeConfig.hero || {};
    var promos = homeConfig.promos || {};
    var sections = homeConfig.sections || {};
    setInput('homeHeroMain', hero.main);
    setInput('homeHeroSide1', hero.side1);
    setInput('homeHeroSide2', hero.side2);
    setInput('homePromoNewBooks', promos.newBooks);
    setInput('homePromoBestseller', promos.bestseller);
    setInput('homePromoIntlBestseller', promos.intlBestseller);
    setInput('homePromoKeislaman', promos.keislaman);
    setInput('homePromoKlasik', promos.klasik);

    Object.keys(homeSectionMap).forEach(function(containerId) {
      buildChecklist(containerId, sections[homeSectionMap[containerId]]);
    });
  }

  function loadKidsForm() {
    var hero = kidsConfig.hero || {};
    var promo = kidsConfig.promo || {};
    var sections = kidsConfig.sections || {};
    setInput('kidsHeroBadge', hero.badge);
    setInput('kidsHeroImage', hero.image);
    setInput('kidsHeroTitle', hero.title);
    setInput('kidsHeroDescription', hero.description);
    setInput('kidsPromoBadge', promo.badge);
    setInput('kidsPromoImage', promo.image);
    setInput('kidsPromoTitle', promo.title);
    setInput('kidsPromoDescription', promo.description);

    Object.keys(kidsSectionMap).forEach(function(containerId) {
      buildChecklist(containerId, sections[kidsSectionMap[containerId]]);
    });
  }

  function collectHomeConfig() {
    return {
      hero: {
        main: document.getElementById('homeHeroMain').value.trim(),
        side1: document.getElementById('homeHeroSide1').value.trim(),
        side2: document.getElementById('homeHeroSide2').value.trim()
      },
      promos: {
        newBooks: document.getElementById('homePromoNewBooks').value.trim(),
        bestseller: document.getElementById('homePromoBestseller').value.trim(),
        intlBestseller: document.getElementById('homePromoIntlBestseller').value.trim(),
        keislaman: document.getElementById('homePromoKeislaman').value.trim(),
        klasik: document.getElementById('homePromoKlasik').value.trim()
      },
      sections: {
        newBooks: getSelectedIds('homeNewBooks'),
        bestseller: getSelectedIds('homeBestseller'),
        intlBestseller: getSelectedIds('homeIntlBestseller'),
        keislaman: getSelectedIds('homeKeislaman'),
        klasik: getSelectedIds('homeKlasik'),
        lainnya: getSelectedIds('homeLainnya')
      }
    };
  }

  function collectKidsConfig() {
    return {
      hero: {
        badge: document.getElementById('kidsHeroBadge').value.trim(),
        image: document.getElementById('kidsHeroImage').value.trim(),
        title: document.getElementById('kidsHeroTitle').value.trim(),
        description: document.getElementById('kidsHeroDescription').value.trim()
      },
      promo: {
        badge: document.getElementById('kidsPromoBadge').value.trim(),
        image: document.getElementById('kidsPromoImage').value.trim(),
        title: document.getElementById('kidsPromoTitle').value.trim(),
        description: document.getElementById('kidsPromoDescription').value.trim()
      },
      sections: {
        popular: getSelectedIds('kidsPopular'),
        discount: getSelectedIds('kidsDiscount')
      }
    };
  }

  function initTabs() {
    var tabs = document.querySelectorAll('.admin-tab');
    var panels = document.querySelectorAll('.admin-tab-panel');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = tab.dataset.tab;
        tabs.forEach(function(t) { t.classList.remove('active'); });
        panels.forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = document.getElementById('panel' + (target === 'home' ? 'Home' : 'Kids'));
        if (panel) panel.classList.add('active');
      });
    });
  }

  function initFilters() {
    document.querySelectorAll('.product-filter').forEach(function(input) {
      input.addEventListener('input', function() {
        var targetId = input.dataset.target;
        var term = input.value.toLowerCase().trim();
        var container = document.getElementById(targetId);
        if (!container) return;
        container.querySelectorAll('.product-checkitem').forEach(function(item) {
          var title = item.dataset.title || '';
          var author = item.dataset.author || '';
          var match = title.indexOf(term) !== -1 || author.indexOf(term) !== -1;
          item.style.display = match ? '' : 'none';
        });
      });
    });
  }

  function initForm() {
    var form = document.getElementById('configForm');
    var saveMsg = document.getElementById('saveMsg');
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      A.saveHomeConfig(collectHomeConfig());
      A.saveKidsConfig(collectKidsConfig());
      homeConfig = A.getHomeConfig();
      kidsConfig = A.getKidsConfig();
      saveMsg.style.display = 'block';
      setTimeout(function() { saveMsg.style.display = 'none'; }, 2500);
    });
  }

  loadHomeForm();
  loadKidsForm();
  initTabs();
  initFilters();
  initForm();
})();
