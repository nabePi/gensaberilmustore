// ---------- helpers ----------
const rupiah = n => 'Rp ' + n.toLocaleString('id-ID');

function productCard(p) {
  const ribbon = p.ribbon
    ? `<span class="ribbon ${p.ribbon.type}">${p.ribbon.text}</span>`
    : '';
  const overlay = p.overlay
    ? `<div class="price-overlay"><span>${rupiah(p.finalPrice)},-</span></div>`
    : '';
  return `
  <article class="product-card" data-id="${p.id}">
    <div class="thumb">
      ${ribbon}
      <button class="wishlist" aria-label="Wishlist">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.7-10-9.3C.5 8.1 2.6 4 6.4 4c2 0 3.8 1.1 4.9 2.8C12.4 5.1 14.2 4 16.2 4 20 4 22.1 8.1 21.5 11.7 19 16.3 12 21 12 21z"/></svg>
      </button>
      <img src="${p.image}" alt="${p.title}" loading="lazy">
      ${overlay}
    </div>
    <div class="info">
      <div class="title">${p.title}</div>
      <div class="author">${p.author}</div>
      <div class="price-row">
        <div class="price-info">
          <span class="price-old">Rp ${p.price.toLocaleString('id-ID')} <span class="discount">-${p.discount}%</span></span>
          <span class="price-final">${rupiah(p.finalPrice)}</span>
        </div>
        <button class="add-btn" aria-label="Tambah ke keranjang">+</button>
      </div>
    </div>
  </article>`;
}

function initCarousel(root) {
  if (!root) return;
  const track = root.querySelector('.carousel-track');
  const prevBtn = root.querySelector('.carousel-nav--prev');
  const nextBtn = root.querySelector('.carousel-nav--next');
  if (!track || !prevBtn || !nextBtn) return;

  let index = 0;

  function visibleCount() {
    const w = window.innerWidth;
    if (w <= 640) return 2;
    if (w <= 1024) return 4;
    return 6;
  }

  function step() {
    const card = track.children[0];
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function maxIndex() {
    return Math.max(0, track.children.length - visibleCount());
  }

  function render() {
    index = Math.min(index, maxIndex());
    track.style.transform = `translateX(-${index * step()}px)`;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= maxIndex();
  }

  prevBtn.addEventListener('click', () => { index = Math.max(0, index - 1); render(); });
  nextBtn.addEventListener('click', () => { index = Math.min(maxIndex(), index + 1); render(); });
  window.addEventListener('resize', render);

  let startX = 0;
  let dragging = false;
  track.addEventListener('pointerdown', e => { dragging = true; startX = e.clientX; });
  track.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    const diff = e.clientX - startX;
    if (diff < -40) nextBtn.click();
    else if (diff > 40) prevBtn.click();
  });
  track.addEventListener('pointerleave', () => { dragging = false; });

  render();
}

function promoCard(img, alt) {
  return `<div class="promo-card"><img src="${img}" alt="${alt}" loading="lazy"></div>`;
}

function lsRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch (e) { return fallback; }
}

function getHomeConfig() {
  return lsRead('gensaberilmu_home_config', null);
}

function getKidsConfig() {
  return lsRead('gensaberilmu_kids_config', null);
}

function findProductById(id) {
  const sources = [newBooks, bestseller, intlBestseller, keislaman, klasik, lainnya];
  for (const arr of sources) {
    const found = arr.find(p => p.id === id);
    if (found) return found;
  }
  const custom = lsRead('gensaberilmu_products', []);
  return custom.find(p => p.id === id) || null;
}

function resolveProducts(configIds, fallbackProducts) {
  if (!Array.isArray(configIds) || configIds.length === 0) return fallbackProducts;
  const resolved = configIds.map(id => findProductById(id)).filter(Boolean);
  return resolved.length > 0 ? resolved : fallbackProducts;
}

function resolveImage(configUrl, fallbackUrl) {
  return (configUrl && String(configUrl).trim()) ? configUrl : fallbackUrl;
}

function kidsProductCard(p) {
  const ribbon = p.ribbon ? `<span class="ribbon ${p.ribbon.type}">${p.ribbon.text}</span>` : '';
  const discount = p.discount > 0 ? `<span class="discount-tag">-${p.discount}%</span>` : '';
  return `
  <article class="product-card kids-product" data-id="${p.id}">
    <div class="product-image">
      ${discount}
      ${ribbon}
      <img src="${p.image}" alt="${p.title}" loading="lazy">
    </div>
    <div class="product-info">
      <h3 class="product-title">${p.title}</h3>
      <p class="product-author">${p.author}</p>
      <div class="product-price">
        <span class="price-final">${rupiah(p.finalPrice)}</span>
        ${p.discount > 0 ? `<span class="price-old">${rupiah(p.price)}</span>` : ''}
      </div>
      <button class="btn btn-solid btn-sm add-btn" aria-label="Tambah ke keranjang">Tambah ke Keranjang</button>
    </div>
  </article>`;
}

function blogCard(b) {
  return `
  <article class="blog-card">
    <div class="thumb">
      <span class="blog-tag">${b.tag}</span>
      <img src="${b.image}" alt="${b.title}" loading="lazy">
    </div>
    <div class="body">
      <h3>${b.title}</h3>
      <p>${b.excerpt}</p>
      <div class="blog-meta"><span>${b.author}</span><span>${b.date}</span></div>
    </div>
  </article>`;
}

function videoCard(v) {
  return `
  <article class="video-card" data-youtube="${v.youtubeId}">
    <div class="thumb">
      <img src="${v.thumb}" alt="${v.title}" loading="lazy">
      <span class="play-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
    </div>
    <div class="caption">${v.title}</div>
  </article>`;
}

// ---------- data ----------
const CDN = 'https://kontan.reneturos.com/storage';

const newBooks = [
  { id: 'nb1', title: 'PSIKOLOGI NALAR', author: 'Turos Pustaka', price: 75000, discount: 16, finalPrice: 63000, ribbon: { type: 'flash', text: 'FLASH SALE' }, image: `${CDN}/admin-uploads/whatsapp-image-2026-07-02-at-140220-1782985261.webp` },
  { id: 'nb2', title: 'Attached', author: 'Renebook', price: 129000, discount: 15, finalPrice: 109650, image: `${CDN}/admin-uploads/whatsapp-image-2026-06-29-at-083735-1782697554.webp` },
  { id: 'nb3', title: 'The Decision Book (SC)', author: 'Renebook', price: 73000, discount: 15, finalPrice: 62050, image: `${CDN}/admin-uploads/whatsapp-image-2026-07-01-at-100100-am-1782876794.webp` },
  { id: 'nb4', title: 'Work Life Barakah', author: 'Rene Islam', price: 93000, discount: 15, finalPrice: 79050, image: `${CDN}/admin-uploads/wlb-web-1783483880.webp` },
  { id: 'nb5', title: 'Merchandise : Poster Eksklusif Filsafat Rumah Tangga', author: 'Turos Pustaka', price: 5000, discount: 15, finalPrice: 4250, ribbon: { type: 'preorder', text: 'PRE-ORDER' }, image: `${CDN}/admin-uploads/poster-frt-web-1781064505.webp` },
  { id: 'nb6', title: 'Filsafat Rumah Tangga', author: 'Turos Pustaka', price: 55000, discount: 15, finalPrice: 46750, overlay: true, image: `${CDN}/admin-uploads/filsafat-rumah-tangga-web-1-1782707388.webp` },
  { id: 'nb7', title: 'Toko Manisan Ajaib Amberglow', author: 'Renebook', price: 85000, discount: 15, finalPrice: 72250, overlay: true, image: `${CDN}/admin-uploads/amberglow-new-web-1781236571.webp` },
  { id: 'nb8', title: 'LOGIKA KEIMANAN EDISI REVISI SC', author: 'Turos Pustaka', price: 99000, discount: 15, finalPrice: 84150, overlay: true, image: `${CDN}/admin-uploads/logika-keimanan-new-web-1781236358.webp` },
];

const bestseller = [
  { id: 'bs1', title: 'Versi Ringkas 48 Laws of Power SC', author: 'Robert Greene', price: 95000, discount: 15, finalPrice: 80750, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/versi-ringkas-48-laws-of-power.webp` },
  { id: 'bs2', title: 'The Visual MBA SC', author: 'Jason Barron', price: 119000, discount: 15, finalPrice: 101150, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/the-visual-mba.webp` },
  { id: 'bs3', title: 'Kitab Firasat SC', author: 'Imam Fakhruddin Ar-Razi', price: 59000, discount: 15, finalPrice: 50150, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/kitab-firasat.webp` },
  { id: 'bs4', title: 'MAHFUZHAT', author: 'Tim Rene Islam', price: 69500, discount: 15, finalPrice: 59075, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/mahfuzhat.webp` },
  { id: 'bs5', title: 'Brave New Words', author: 'Renebook', price: 105000, discount: 15, finalPrice: 89250, overlay: true, image: `${CDN}/admin-uploads/brave-new-words-web-1778561287.webp` },
  { id: 'bs6', title: 'The Book You Wish Your Parents Had Read (HC)', author: 'Renebook', price: 149000, discount: 15, finalPrice: 126650, overlay: true, image: `${CDN}/admin-uploads/the-book-you-wish-hhc-web-1780367103.webp` },
  { id: 'bs7', title: 'Satu Malam Menuju Surga', author: 'Fuad Abdurahman', price: 115000, discount: 15, finalPrice: 97750, overlay: true, image: `${CDN}/products/satu-malam-menuju-surga-1772166823.webp` },
];

const intlBestseller = [
  { id: 'ib1', title: 'Attached', author: 'Renebook', price: 129000, discount: 15, finalPrice: 109650, image: `${CDN}/admin-uploads/whatsapp-image-2026-06-29-at-083735-1782697554.webp` },
  { id: 'ib2', title: 'The Decision Book (SC)', author: 'Renebook', price: 73000, discount: 15, finalPrice: 62050, image: `${CDN}/admin-uploads/whatsapp-image-2026-07-01-at-100100-am-1782876794.webp` },
  { id: 'ib3', title: 'Toko Manisan Ajaib Amberglow', author: 'Renebook', price: 85000, discount: 15, finalPrice: 72250, overlay: true, image: `${CDN}/admin-uploads/amberglow-new-web-1781236571.webp` },
  { id: 'ib4', title: 'The Book You Wish Your Parents Had Read (HC)', author: 'Renebook', price: 149000, discount: 15, finalPrice: 126650, overlay: true, image: `${CDN}/admin-uploads/the-book-you-wish-hhc-web-1780367103.webp` },
  { id: 'ib5', title: 'Brave New Words', author: 'Renebook', price: 105000, discount: 15, finalPrice: 89250, overlay: true, image: `${CDN}/admin-uploads/brave-new-words-web-1778561287.webp` },
  { id: 'ib6', title: 'Versi Ringkas 48 Laws of Power SC', author: 'Robert Greene', price: 95000, discount: 15, finalPrice: 80750, overlay: true, image: `${CDN}/products/versi-ringkas-48-laws-of-power.webp` },
  { id: 'ib7', title: 'The Visual MBA SC', author: 'Jason Barron', price: 119000, discount: 15, finalPrice: 101150, overlay: true, image: `${CDN}/products/the-visual-mba.webp` },
  { id: 'ib8', title: 'Cara Mudah Memahami Al-Quran Otodidak Metode 3 In 1 (Jilid 2)', author: 'Ustadz Ahmad Huseno, S.S.', price: 120000, discount: 15, finalPrice: 102000, overlay: true, image: `${CDN}/products/20-hari-2-web.webp` },
];

const keislaman = [
  { id: 'kk1', title: 'Work Life Barakah', author: 'Rene Islam', price: 93000, discount: 15, finalPrice: 79050, overlay: true, image: `${CDN}/admin-uploads/wlb-web-1783483880.webp` },
  { id: 'kk2', title: 'Satu Malam Menuju Surga', author: 'Fuad Abdurahman', price: 115000, discount: 15, finalPrice: 97750, overlay: true, image: `${CDN}/products/satu-malam-menuju-surga-1772166823.webp` },
  { id: 'kk3', title: 'Cara Mudah Memahami Al-Quran Otodidak Metode 3 In 1 (Jilid 2)', author: 'Ustadz Ahmad Huseno, S.S.', price: 120000, discount: 15, finalPrice: 102000, overlay: true, image: `${CDN}/products/20-hari-2-web.webp` },
  { id: 'kk4', title: 'Dua Khalifah Yang Dirindukan Surga', author: 'Fuad Abdurahman', price: 99000, discount: 15, finalPrice: 84150, overlay: true, image: `${CDN}/products/dua-khalifah-yang-dirindukan-s-1767926840.webp` },
  { id: 'kk5', title: 'Daily Fikih Muslimah Sesuai Sunah', author: 'Ust. Amad Jauhari Umar', price: 99000, discount: 15, finalPrice: 84150, overlay: true, image: `${CDN}/products/daily-fikih-muslimah-sesuai-su.webp` },
  { id: 'kk6', title: 'Kitab Firasat SC', author: 'Imam Fakhruddin Ar-Razi', price: 59000, discount: 15, finalPrice: 50150, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/kitab-firasat.webp` },
  { id: 'kk7', title: 'MAHFUZHAT', author: 'Tim Rene Islam', price: 69500, discount: 15, finalPrice: 59075, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/mahfuzhat.webp` },
  { id: 'kk8', title: 'The Visual Fiqh', author: 'Turos Pustaka', price: 85000, discount: 15, finalPrice: 72250, overlay: true, image: `${CDN}/admin-uploads/visual-fiqh-web-1777866441.webp` },
];

const klasik = [
  { id: 'rk1', title: 'PSIKOLOGI NALAR', author: 'Turos Pustaka', price: 75000, discount: 16, finalPrice: 63000, ribbon: { type: 'flash', text: 'FLASH SALE' }, image: `${CDN}/admin-uploads/whatsapp-image-2026-07-02-at-140220-1782985261.webp` },
  { id: 'rk2', title: 'Merchandise : Poster Eksklusif Filsafat Rumah Tangga', author: 'Turos Pustaka', price: 5000, discount: 15, finalPrice: 4250, ribbon: { type: 'preorder', text: 'PRE-ORDER' }, image: `${CDN}/admin-uploads/poster-frt-web-1781064505.webp` },
  { id: 'rk3', title: 'Filsafat Rumah Tangga', author: 'Turos Pustaka', price: 55000, discount: 15, finalPrice: 46750, overlay: true, image: `${CDN}/admin-uploads/filsafat-rumah-tangga-web-1-1782707388.webp` },
  { id: 'rk4', title: 'LOGIKA KEIMANAN EDISI REVISI SC', author: 'Turos Pustaka', price: 99000, discount: 15, finalPrice: 84150, overlay: true, image: `${CDN}/admin-uploads/logika-keimanan-new-web-1781236358.webp` },
  { id: 'rk5', title: 'The Visual Fiqh', author: 'Turos Pustaka', price: 85000, discount: 15, finalPrice: 72250, overlay: true, image: `${CDN}/admin-uploads/visual-fiqh-web-1777866441.webp` },
  { id: 'rk6', title: 'MAHFUZHAT', author: 'Tim Rene Islam', price: 69500, discount: 15, finalPrice: 59075, overlay: true, ribbon: { type: 'bestseller', text: 'BESTSELLER' }, image: `${CDN}/products/mahfuzhat.webp` },
  { id: 'rk7', title: 'Satu Malam Menuju Surga', author: 'Fuad Abdurahman', price: 115000, discount: 15, finalPrice: 97750, overlay: true, image: `${CDN}/products/satu-malam-menuju-surga-1772166823.webp` },
  { id: 'rk8', title: 'Dua Khalifah Yang Dirindukan Surga', author: 'Fuad Abdurahman', price: 99000, discount: 15, finalPrice: 84150, overlay: true, image: `${CDN}/products/dua-khalifah-yang-dirindukan-s-1767926840.webp` },
];

const lainnya = [
  { id: 'ln1', title: 'PSIKOLOGI NALAR', author: 'Turos Pustaka', price: 75000, discount: 16, finalPrice: 63000, ribbon: { type: 'flash', text: 'FLASH SALE' }, image: `${CDN}/admin-uploads/whatsapp-image-2026-07-02-at-140220-1782985261.webp` },
  { id: 'ln2', title: 'Attached', author: 'Renebook', price: 129000, discount: 15, finalPrice: 109650, ribbon: { type: 'preorder', text: 'PRE-ORDER' }, image: `${CDN}/admin-uploads/whatsapp-image-2026-06-29-at-083735-1782697554.webp` },
  { id: 'ln3', title: 'The Decision Book (SC)', author: 'Renebook', price: 73000, discount: 15, finalPrice: 62050, image: `${CDN}/admin-uploads/whatsapp-image-2026-07-01-at-100100-am-1782876794.webp` },
  { id: 'ln4', title: 'Work Life Barakah', author: 'Rene Islam', price: 93000, discount: 15, finalPrice: 79050, overlay: true, image: `${CDN}/admin-uploads/wlb-web-1783483880.webp` },
  { id: 'ln5', title: 'Merchandise : Poster Eksklusif Filsafat Rumah Tangga', author: 'Turos Pustaka', price: 5000, discount: 15, finalPrice: 4250, image: `${CDN}/admin-uploads/poster-frt-web-1781064505.webp` },
  { id: 'ln6', title: 'Filsafat Rumah Tangga', author: 'Turos Pustaka', price: 55000, discount: 15, finalPrice: 46750, overlay: true, image: `${CDN}/admin-uploads/filsafat-rumah-tangga-web-1-1782707388.webp` },
  { id: 'ln7', title: 'The Book You Wish Your Parents Had Read (HC)', author: 'Renebook', price: 149000, discount: 15, finalPrice: 126650, overlay: true, image: `${CDN}/admin-uploads/the-book-you-wish-hhc-web-1780367103.webp` },
  { id: 'ln8', title: 'Brave New Words', author: 'Renebook', price: 105000, discount: 15, finalPrice: 89250, overlay: true, image: `${CDN}/admin-uploads/brave-new-words-web-1778561287.webp` },
  { id: 'ln9', title: 'Daily Fikih Muslimah Sesuai Sunah', author: 'Ust. Amad Jauhari Umar', price: 99000, discount: 15, finalPrice: 84150, overlay: true, image: `${CDN}/products/daily-fikih-muslimah-sesuai-su.webp` },
];

const blogPosts = [
  {
    tag: 'Resensi',
    title: 'Tasawuf Sehari-hari: Membaca Syekh Zarruq di Tengah Spiritualitas Generasi Digital',
    excerpt: 'Tasawuf Sehari-hari karya Syekh Ahmad Zarruq mengingatkan bahwa spiritualitas bukan soal pengalaman batin yang spektakuler, melainkan kedisiplinan etika dalam hidup sehari-hari.',
    author: 'Redaksi',
    date: '5 Jan 2026',
    image: `${CDN}/articles/tasawuf-sehari-hari-membaca-sy-1767607714.webp`,
  },
  {
    tag: 'Resensi',
    title: 'Bagaimana Talk Like TED Mengubah Gaya Public Speaking Kita',
    excerpt: 'Talk Like TED menunjukkan bahwa presentasi hebat bukan soal tampil paling pintar, melainkan soal membuat ide terasa hidup dan mudah diingat oleh audiens.',
    author: 'Redaksi',
    date: '3 Jan 2026',
    image: `${CDN}/articles/bagaimana-talk-like-ted-mengub-1767606245.webp`,
  },
  {
    tag: 'Resensi',
    title: 'Buy Back Your Time: "Mesin Waktu" Modern untuk Kemajuan Bisnis',
    excerpt: 'Buy Back Your Time menawarkan "Mesin Waktu" Modern untuk kemajuan bisnis: "It is not the load that breaks you down, it\'s the way you carry it."',
    author: 'Redaksi',
    date: '17 Jan 2026',
    image: `${CDN}/blog/customer/buy-back-foto-2.webp`,
  },
];

const videos = [
  { title: 'Belajar Bahasa Arab Bareng Ustadz Kalcer', youtubeId: '6oD4BrtjRZk', thumb: 'https://img.youtube.com/vi/6oD4BrtjRZk/mqdefault.jpg' },
  { title: 'Saatnya Demokrasi Turun Mesin?', youtubeId: 's3mi8fB7DKY', thumb: 'https://img.youtube.com/vi/s3mi8fB7DKY/mqdefault.jpg' },
  { title: 'Ngaji Filsafat Turos Bersama Dr. Fahruddin Faiz', youtubeId: 'c44MMde6aLY', thumb: 'https://img.youtube.com/vi/c44MMde6aLY/mqdefault.jpg' },
];

const publishers = [
  { name: 'Wali Pustaka', logo: `${CDN}/publishers/wali-pustaka-logo.webp` },
  { name: 'Renekids', logo: `${CDN}/publishers/renekids-logo.webp` },
  { name: 'Renebook', logo: `${CDN}/publishers/renebook-logo.webp` },
  { name: 'Rene Islam', logo: `${CDN}/publishers/rene-islam-logo.webp` },
  { name: 'Turos Pustaka', logo: `${CDN}/publishers/turos-pustaka-logo.webp` },
  { name: 'Reneluv', logo: `${CDN}/publishers/reneluv-logo.webp` },
];

// ---------- render (homepage only) ----------
if (document.getElementById('rowNewBooks')) {
  const homeConfig = getHomeConfig();
  const hero = homeConfig ? homeConfig.hero || {} : {};
  const promos = homeConfig ? homeConfig.promos || {} : {};
  const sections = homeConfig ? homeConfig.sections || {} : {};

  const heroMain = document.querySelector('.hero-main img');
  const heroSide = document.querySelectorAll('.hero-side img');
  if (heroMain) heroMain.src = resolveImage(hero.main, heroMain.src);
  if (heroSide[0]) heroSide[0].src = resolveImage(hero.side1, heroSide[0].src);
  if (heroSide[1]) heroSide[1].src = resolveImage(hero.side2, heroSide[1].src);

  document.getElementById('rowNewBooks').innerHTML =
    promoCard(resolveImage(promos.newBooks, `${CDN}/admin-uploads/image-apr-27-2026-12-00-36-am-1777222977.webp`), 'Buku Terbaru') +
    resolveProducts(sections.newBooks, newBooks).map(productCard).join('');

  initCarousel(document.getElementById('carouselNewBooks'));

  document.getElementById('rowBestseller').innerHTML =
    promoCard(resolveImage(promos.bestseller, `${CDN}/admin-uploads/image-apr-27-2026-12-02-31-am-1777222993.webp`), 'Buku Bestseller') +
    resolveProducts(sections.bestseller, bestseller).map(productCard).join('');

  initCarousel(document.getElementById('carouselBestseller'));

  document.getElementById('rowIntlBestseller').innerHTML =
    promoCard(resolveImage(promos.intlBestseller, `${CDN}/admin-uploads/image-apr-27-2026-12-06-42-am-1777223256.webp`), 'International Bestseller') +
    resolveProducts(sections.intlBestseller, intlBestseller).map(productCard).join('');

  initCarousel(document.getElementById('carouselIntlBestseller'));

  document.getElementById('rowKeislaman').innerHTML =
    promoCard(resolveImage(promos.keislaman, `${CDN}/admin-uploads/image-apr-27-2026-12-09-02-am-1777223387.webp`), 'Keislaman Kiwari') +
    resolveProducts(sections.keislaman, keislaman).map(productCard).join('');

  initCarousel(document.getElementById('carouselKeislaman'));

  document.getElementById('rowKlasik').innerHTML =
    promoCard(resolveImage(promos.klasik, `${CDN}/admin-uploads/image-apr-27-2026-12-19-32-am-1777224216.webp`), 'Rujukan Islam Klasik') +
    resolveProducts(sections.klasik, klasik).map(productCard).join('');

  initCarousel(document.getElementById('carouselKlasik'));

  document.getElementById('rowLainnya').innerHTML = resolveProducts(sections.lainnya, lainnya).map(productCard).join('');

  initCarousel(document.getElementById('carouselLainnya'));

  document.getElementById('rowBlog').innerHTML = blogPosts.map(blogCard).join('');
}

// ---------- render (kids page only) ----------
if (document.body.classList.contains('kids-body')) {
  const kidsConfig = getKidsConfig();
  const hero = kidsConfig ? kidsConfig.hero || {} : {};
  const sections = kidsConfig ? kidsConfig.sections || {} : {};
  const promo = kidsConfig ? kidsConfig.promo || {} : {};

  const heroBadge = document.querySelector('.kids-hero-text .kids-badge');
  const heroTitle = document.querySelector('.kids-hero-text h1');
  const heroDesc = document.querySelector('.kids-hero-text p');
  const heroImg = document.querySelector('.kids-hero-image img');
  if (heroBadge) heroBadge.textContent = hero.badge || heroBadge.textContent;
  if (heroTitle) heroTitle.textContent = hero.title || heroTitle.textContent;
  if (heroDesc) heroDesc.textContent = hero.description || heroDesc.textContent;
  if (heroImg) heroImg.src = resolveImage(hero.image, heroImg.src);

  const popularContainer = document.getElementById('kidsPopular');
  const discountContainer = document.getElementById('kidsDiscount');
  if (popularContainer) {
    popularContainer.innerHTML = resolveProducts(sections.popular, [newBooks[0], newBooks[1], newBooks[2], newBooks[3]]).map(kidsProductCard).join('');
  }
  if (discountContainer) {
    discountContainer.innerHTML = resolveProducts(sections.discount, [newBooks[4], newBooks[5], newBooks[6], newBooks[7]]).map(kidsProductCard).join('');
  }

  const promoBadge = document.querySelector('.kids-promo-text .kids-section-badge');
  const promoTitle = document.querySelector('.kids-promo-text h2');
  const promoDesc = document.querySelector('.kids-promo-text p');
  const promoImg = document.querySelector('.kids-promo-image img');
  if (promoBadge) promoBadge.textContent = promo.badge || promoBadge.textContent;
  if (promoTitle) promoTitle.textContent = promo.title || promoTitle.textContent;
  if (promoDesc) promoDesc.textContent = promo.description || promoDesc.textContent;
  if (promoImg) promoImg.src = resolveImage(promo.image, promoImg.src);
}

// ---------- interactions ----------
let cartCount = 0;
const cartCountEl = document.getElementById('cartCount');

document.addEventListener('click', e => {
  const addBtn = e.target.closest('.add-btn');
  if (addBtn) {
    cartCount++;
    cartCountEl.textContent = cartCount;
    addBtn.classList.add('bump');
    setTimeout(() => addBtn.classList.remove('bump'), 150);
    return;
  }

  const wishBtn = e.target.closest('.wishlist');
  if (wishBtn) {
    wishBtn.classList.toggle('active');
    return;
  }

  const videoEl = e.target.closest('.video-card');
  if (videoEl) {
    const id = videoEl.dataset.youtube;
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener');
    return;
  }

  const productCardEl = e.target.closest('.product-card');
  if (productCardEl) {
    window.location.href = `product.html?id=${productCardEl.dataset.id}`;
    return;
  }
});

// mobile menu toggle
const mobileToggle = document.getElementById('mobileToggle');
mobileToggle.addEventListener('click', () => {
  document.querySelector('.main-nav').classList.toggle('open');
  document.querySelector('.search-bar').classList.toggle('open');
});

// drag-to-scroll for horizontal rows
document.querySelectorAll('.scroll-row').forEach(row => {
  let isDown = false;
  let startX, scrollLeft;

  row.addEventListener('mousedown', e => {
    isDown = true;
    startX = e.pageX - row.offsetLeft;
    scrollLeft = row.scrollLeft;
  });
  ['mouseleave', 'mouseup'].forEach(evt => row.addEventListener(evt, () => { isDown = false; }));
  row.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - row.offsetLeft;
    row.scrollLeft = scrollLeft - (x - startX) * 1.2;
  });
});
