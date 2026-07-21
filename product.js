// ---------- populate product from clicked card ----------
(function() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;

  const allProducts = [].concat(newBooks, bestseller, intlBestseller, keislaman, klasik, lainnya);
  const p = allProducts.find(item => item.id === id);
  if (!p) return;

  document.title = `${p.title} - GenSa Berilmu`;

  const breadcrumbCurrent = document.querySelector('.breadcrumb .current');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = p.title;

  const titleEl = document.querySelector('.product-title');
  if (titleEl) titleEl.textContent = p.title;

  const authorEl = document.querySelector('.product-author span');
  if (authorEl) authorEl.textContent = p.author;

  const imgEl = document.querySelector('.gallery-main img');
  if (imgEl) {
    imgEl.src = p.image;
    imgEl.alt = p.title;
  }

  const finalEl = document.querySelector('.price-final');
  if (finalEl) finalEl.textContent = rupiah(p.finalPrice);

  const oldEl = document.querySelector('.price-old');
  if (oldEl) oldEl.textContent = 'Rp ' + p.price.toLocaleString('id-ID');

  const discountEl = document.querySelector('.discount-badge');
  if (discountEl) discountEl.textContent = `-${p.discount}%`;
})();

// ---------- detail tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------- produk terkait ----------
const related = [klasik[2], intlBestseller[3], bestseller[1], klasik[3], intlBestseller[4], bestseller[2], bestseller[0], klasik[0], intlBestseller[0]];
document.getElementById('rowRelated').innerHTML = related.map(productCard).join('');

initCarousel(document.getElementById('carouselRelated'));
