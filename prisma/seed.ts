import { PrismaClient, CoverType, VoucherType, VoucherChannel } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { GENSA_PRODUCTS } from './seed-products-gensa';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const CATEGORY_SUBTITLE: Record<string, string> = {
  'buku-terbaru': 'Rilisan terbaru dari koleksi Gensa Berilmu Store',
  bestseller: 'Buku terlaris pilihan pembaca',
  'international-bestseller': 'Bestseller internasional yang diterjemahkan',
  'keislaman-kiwari': 'Wawasan keislaman untuk kehidupan modern',
  'rujukan-islam-klasik': 'Referensi klasik keilmuan Islam',
  'sejarah-islam': 'Kisah dan peradaban Islam sepanjang masa',
  'paket-bundling': 'Paket hemat koleksi buku pilihan',
  komik: 'Komik islami untuk semua usia',
  merchandise: 'Merchandise eksklusif Gensa Berilmu',
  booklet: 'Booklet ringkas penuh makna',
  novel: 'Novel islami inspiratif',
  keluarga: 'Bimbingan keluarga dan parenting islami',
  'buku-anak-3-6': 'Bacaan seru dan edukatif untuk si kecil',
  'buku-anak': 'Buku anak islami',
};

const CATEGORIES = [
  { slug: 'buku-terbaru', name: 'Buku Terbaru' },
  { slug: 'bestseller', name: 'Bestseller' },
  { slug: 'international-bestseller', name: 'International Bestseller' },
  { slug: 'keislaman-kiwari', name: 'Keislaman Kiwari' },
  { slug: 'rujukan-islam-klasik', name: 'Rujukan Islam Klasik' },
  { slug: 'sejarah-islam', name: 'Sejarah Islam' },
  { slug: 'paket-bundling', name: 'Paket & Bundling' },
  { slug: 'komik', name: 'Komik' },
  { slug: 'merchandise', name: 'Merchandise' },
  { slug: 'booklet', name: 'Booklet' },
  { slug: 'novel', name: 'Novel' },
  { slug: 'keluarga', name: 'Keluarga & Parenting' },
  { slug: 'buku-anak', name: 'Buku Anak' },
];

const KIDS_SUB_CATEGORIES = [
  { slug: 'buku-anak-0-2', name: '0-2 Tahun' },
  { slug: 'buku-anak-3-6', name: '3-6 Tahun' },
  { slug: 'buku-anak-7-9', name: '7-9 Tahun' },
  { slug: 'buku-anak-10-12', name: '10-12 Tahun' },
];

const CITIES: { name: string; province: string; shippingCost: number }[] = [
  { name: 'Jakarta', province: 'DKI Jakarta', shippingCost: 9000 },
  { name: 'Bekasi', province: 'Jawa Barat', shippingCost: 10000 },
  { name: 'Depok', province: 'Jawa Barat', shippingCost: 10000 },
  { name: 'Tangerang', province: 'Banten', shippingCost: 10000 },
  { name: 'Tangerang Selatan', province: 'Banten', shippingCost: 10000 },
  { name: 'Bogor', province: 'Jawa Barat', shippingCost: 12000 },
  { name: 'Bandung', province: 'Jawa Barat', shippingCost: 15000 },
  { name: 'Cirebon', province: 'Jawa Barat', shippingCost: 18000 },
  { name: 'Semarang', province: 'Jawa Tengah', shippingCost: 20000 },
  { name: 'Yogyakarta', province: 'DI Yogyakarta', shippingCost: 20000 },
  { name: 'Surakarta', province: 'Jawa Tengah', shippingCost: 20000 },
  { name: 'Surabaya', province: 'Jawa Timur', shippingCost: 22000 },
  { name: 'Malang', province: 'Jawa Timur', shippingCost: 23000 },
  { name: 'Sidoarjo', province: 'Jawa Timur', shippingCost: 22000 },
  { name: 'Denpasar', province: 'Bali', shippingCost: 25000 },
  { name: 'Mataram', province: 'Nusa Tenggara Barat', shippingCost: 30000 },
  { name: 'Kupang', province: 'Nusa Tenggara Timur', shippingCost: 40000 },
  { name: 'Medan', province: 'Sumatera Utara', shippingCost: 25000 },
  { name: 'Palembang', province: 'Sumatera Selatan', shippingCost: 22000 },
  { name: 'Pekanbaru', province: 'Riau', shippingCost: 25000 },
  { name: 'Padang', province: 'Sumatera Barat', shippingCost: 25000 },
  { name: 'Jambi', province: 'Jambi', shippingCost: 25000 },
  { name: 'Bengkulu', province: 'Bengkulu', shippingCost: 27000 },
  { name: 'Bandar Lampung', province: 'Lampung', shippingCost: 20000 },
  { name: 'Pontianak', province: 'Kalimantan Barat', shippingCost: 30000 },
  { name: 'Banjarmasin', province: 'Kalimantan Selatan', shippingCost: 30000 },
  { name: 'Balikpapan', province: 'Kalimantan Timur', shippingCost: 32000 },
  { name: 'Samarinda', province: 'Kalimantan Timur', shippingCost: 32000 },
  { name: 'Makassar', province: 'Sulawesi Selatan', shippingCost: 30000 },
  { name: 'Manado', province: 'Sulawesi Utara', shippingCost: 35000 },
];

async function seedAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gensaberilmu.co.id' },
    update: {},
    create: {
      email: 'admin@gensaberilmu.co.id',
      passwordHash,
      name: 'Admin Gensa Berilmu',
      role: 'ADMIN',
    },
  });
  return admin;
}

async function seedCategories() {
  const categoryIdBySlug = new Map<string, string>();

  for (const category of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { slug: category.slug, name: category.name },
    });
    categoryIdBySlug.set(record.slug, record.id);
  }

  const kidsParentId = categoryIdBySlug.get('buku-anak')!;
  for (const sub of KIDS_SUB_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: { name: sub.name, parentId: kidsParentId },
      create: { slug: sub.slug, name: sub.name, parentId: kidsParentId },
    });
    categoryIdBySlug.set(record.slug, record.id);
  }

  return categoryIdBySlug;
}

async function seedProducts(categoryIdBySlug: Map<string, string>, adminUserId: string) {
  for (const [index, item] of GENSA_PRODUCTS.entries()) {
    const sku = `GSI-${String(index + 1).padStart(3, '0')}`;
    let slug = slugify(item.title);
    const existingSlug = await prisma.product.findFirst({ where: { slug, NOT: { sku } } });
    if (existingSlug) slug = `${slug}-${sku.toLowerCase()}`;
    const primaryCategory = item.categories[0];
    const subtitle =
      (primaryCategory && CATEGORY_SUBTITLE[primaryCategory]) ??
      'Pilihan terbaik untuk pembaca Indonesia';

    const product = await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        sku,
        slug,
        title: item.title,
        subtitle,
        author: item.author,
        description: item.description || `${item.title} tersedia di Gensa Berilmu Store.`,
        price: item.price,
        discountPercent: item.discountPercent,
        finalPrice: item.finalPrice,
        stock: 50,
        weightGram: item.weightGram ?? 300,
        coverType: item.coverType ?? CoverType.SOFTCOVER,
        pageCount: item.pageCount ?? 200,
        publishYear: item.publishYear ?? 2024,
        position: index,
        isActive: item.isActive ?? true,
        ribbonType: item.ribbon?.type,
        ribbonText: item.ribbon?.text,
      },
    });

    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, url: item.image },
    });
    if (!existingImage) {
      await prisma.productImage.create({
        data: { productId: product.id, url: item.image, isPrimary: true, position: 0 },
      });
    }

    for (const categorySlug of item.categories) {
      const categoryId = categoryIdBySlug.get(categorySlug);
      if (!categoryId) continue;
      await prisma.categoryProduct.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId } },
        update: {},
        create: { productId: product.id, categoryId },
      });
    }

    await prisma.affiliateCommissionRate.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        percent: 5,
        isActive: true,
        updatedByUserId: adminUserId,
      },
    });
  }
}

async function seedCities() {
  for (const city of CITIES) {
    const existing = await prisma.city.findFirst({ where: { name: city.name } });
    if (!existing) {
      await prisma.city.create({ data: city });
    }
  }
}

const BLOG_POSTS: {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  tags: string[];
  publishedAt: Date;
  contentHtml: string;
}[] = [
  {
    slug: '5-rekomendasi-buku-islami-ramadhan',
    title: '5 Rekomendasi Buku Islami untuk Menemani Ramadhan',
    excerpt: 'Kumpulan buku terbaik untuk mengisi bulan penuh berkah dengan ilmu dan hikmah.',
    author: 'Redaksi',
    tags: ['Resensi', 'Ramadhan', 'Buku'],
    publishedAt: new Date('2026-01-05T00:00:00.000Z'),
    contentHtml: `
      <p>Bulan Ramadhan adalah waktu terbaik untuk memperbanyak amal, termasuk menambah ilmu melalui bacaan yang bermanfaat. Berikut lima rekomendasi buku yang cocok menemani hari-hari puasa Anda.</p>
      <p>1. Tafsir Juz Amma — penjelasan ringkas dan mudah dipahami untuk surat-surat pendek yang sering dibaca saat shalat.</p>
      <p>2. Fiqih Puasa Praktis — membahas hukum-hukum puasa secara sederhana, lengkap dengan dalil dan contoh kasus sehari-hari.</p>
      <p>3. Kisah Para Nabi — cocok dibacakan untuk anak-anak sebagai pengantar sebelum berbuka atau menjelang tidur.</p>
      <p>4. Renungan Menuju Lailatul Qadar — kumpulan tulisan reflektif untuk menyambut malam seribu bulan.</p>
      <p>5. Doa dan Dzikir Harian — panduan praktis doa-doa yang dianjurkan sepanjang bulan Ramadhan.</p>
      <p>Semoga rekomendasi ini membantu Anda dan keluarga mengisi Ramadhan dengan lebih bermakna.</p>
    `,
  },
  {
    slug: 'tips-menumbuhkan-minat-baca-anak',
    title: 'Tips Menumbuhkan Minat Baca pada Anak Sejak Dini',
    excerpt: 'Strategi sederhana orang tua agar si kecil jatuh cinta pada buku.',
    author: 'Redaksi',
    tags: ['Resensi', 'Anak', 'Parenting'],
    publishedAt: new Date('2026-01-03T00:00:00.000Z'),
    contentHtml: `
      <p>Menumbuhkan kecintaan anak pada buku tidak harus rumit. Berikut beberapa strategi sederhana yang bisa diterapkan orang tua di rumah.</p>
      <p>Pertama, jadikan membaca sebagai rutinitas bersama, misalnya sebelum tidur. Konsistensi lebih penting daripada durasi.</p>
      <p>Kedua, biarkan anak memilih sendiri buku yang ingin dibaca. Minat yang tumbuh dari pilihan sendiri biasanya lebih tahan lama.</p>
      <p>Ketiga, jadilah contoh. Anak cenderung meniru kebiasaan orang tua, termasuk kebiasaan membaca.</p>
      <p>Keempat, sediakan buku bergambar dan berwarna untuk anak usia dini agar pengalaman membaca terasa menyenangkan.</p>
      <p>Dengan konsistensi dan kesabaran, minat baca anak akan tumbuh secara alami seiring waktu.</p>
    `,
  },
  {
    slug: 'karya-ulama-klasik-wajib-dibaca',
    title: 'Mengenal Karya-Karya Ulama Klasik yang Wajib Dibaca',
    excerpt: 'Panduan memilih rujukan Islam klasik yang relevan untuk kehidupan modern.',
    author: 'Redaksi',
    tags: ['Resensi', 'Sejarah', 'Ulama'],
    publishedAt: new Date('2026-01-17T00:00:00.000Z'),
    contentHtml: `
      <p>Karya-karya ulama klasik menyimpan kedalaman ilmu yang tetap relevan hingga saat ini. Berikut beberapa karya yang layak menjadi rujukan.</p>
      <p>Ihya Ulumuddin karya Imam Al-Ghazali membahas penyucian jiwa dan akhlak secara mendalam, cocok bagi yang ingin memperbaiki diri.</p>
      <p>Riyadhus Shalihin karya Imam An-Nawawi berisi kumpulan hadits pilihan seputar akhlak dan ibadah sehari-hari.</p>
      <p>Al-Hikam karya Ibnu Athaillah menawarkan renungan sufistik yang ringkas namun sarat makna.</p>
      <p>Bagi pemula, disarankan memilih edisi terjemahan dengan penjelasan tambahan agar lebih mudah dipahami konteksnya.</p>
      <p>Membaca karya klasik bukan sekadar bernostalgia, melainkan cara menyambungkan diri dengan warisan keilmuan Islam yang panjang.</p>
    `,
  },
  {
    slug: 'memilih-buku-anak-sesuai-usia',
    title: 'Cara Memilih Buku Anak Sesuai Usia dan Tahap Perkembangan',
    excerpt: 'Panduan praktis memilih bacaan yang tepat untuk setiap tahap tumbuh kembang anak.',
    author: 'Redaksi',
    tags: ['Tips', 'Anak', 'Parenting'],
    publishedAt: new Date('2026-01-22T00:00:00.000Z'),
    contentHtml: `
      <p>Memilih buku yang sesuai usia membantu anak menikmati proses membaca tanpa merasa kesulitan atau bosan.</p>
      <p>Untuk usia 0-2 tahun, pilih board book dengan gambar besar dan sedikit teks agar tahan terhadap gigitan dan tarikan.</p>
      <p>Untuk usia 3-5 tahun, cerita bergambar dengan alur sederhana dan pesan moral ringan sangat cocok diperkenalkan.</p>
      <p>Untuk usia 6-9 tahun, anak mulai bisa menikmati cerita bersambung dengan ilustrasi yang lebih sedikit dan teks lebih panjang.</p>
      <p>Untuk usia 10 tahun ke atas, novel anak dan buku pengetahuan populer dapat memperluas wawasan sekaligus melatih daya baca mandiri.</p>
      <p>Sesuaikan juga dengan minat anak, karena buku yang sesuai minat akan lebih mudah membuat mereka betah membaca.</p>
    `,
  },
  {
    slug: 'manfaat-sedekah-dalam-islam',
    title: 'Manfaat Sedekah dalam Islam bagi Kehidupan Dunia dan Akhirat',
    excerpt: 'Mengulas keutamaan sedekah sebagai amalan yang tak pernah mengurangi harta.',
    author: 'Redaksi',
    tags: ['Renungan', 'Umat', 'Akhlak'],
    publishedAt: new Date('2026-02-02T00:00:00.000Z'),
    contentHtml: `
      <p>Sedekah merupakan salah satu amalan yang sangat dianjurkan dalam Islam, bukan hanya untuk membantu sesama tetapi juga membersihkan harta dan jiwa.</p>
      <p>Rasulullah SAW bersabda bahwa sedekah tidak akan mengurangi harta, justru sebaliknya, Allah akan melipatgandakan rezeki bagi yang gemar bersedekah.</p>
      <p>Selain manfaat spiritual, sedekah juga memiliki dampak sosial yang nyata, seperti mempererat hubungan antar sesama dan mengurangi kesenjangan ekonomi.</p>
      <p>Sedekah dapat dilakukan kapan saja dan dalam bentuk apa saja, mulai dari harta, tenaga, hingga senyuman yang tulus.</p>
      <p>Semoga kita senantiasa dimudahkan untuk istiqomah dalam bersedekah, sekecil apa pun bentuknya.</p>
    `,
  },
  {
    slug: 'menjaga-adab-menuntut-ilmu',
    title: 'Menjaga Adab dalam Menuntut Ilmu ala Ulama Terdahulu',
    excerpt: 'Adab yang perlu dijaga agar ilmu yang dipelajari membawa keberkahan.',
    author: 'Redaksi',
    tags: ['Renungan', 'Umat', 'Peradaban'],
    publishedAt: new Date('2026-02-10T00:00:00.000Z'),
    contentHtml: `
      <p>Para ulama terdahulu sangat menekankan pentingnya adab sebelum ilmu. Bahkan dikatakan, adab menempati porsi yang lebih besar daripada ilmu itu sendiri.</p>
      <p>Salah satu adab penting adalah niat yang lurus, yaitu menuntut ilmu semata-mata karena Allah, bukan untuk kepentingan duniawi semata.</p>
      <p>Adab lainnya adalah menghormati guru, bersabar dalam proses belajar, serta senantiasa mengamalkan ilmu yang telah dipelajari.</p>
      <p>Ilmu yang dipelajari dengan adab yang baik akan lebih mudah dipahami dan membawa keberkahan bagi pemiliknya.</p>
      <p>Mari kita jadikan adab sebagai pondasi utama dalam setiap proses belajar yang kita jalani.</p>
    `,
  },
];

async function seedBlogPosts() {
  for (const post of BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        author: post.author,
        tags: post.tags,
        contentHtml: post.contentHtml,
        status: 'PUBLISHED',
        publishedAt: post.publishedAt,
      },
    });
  }
}

async function seedVouchers(adminUserId: string) {
  await prisma.voucher.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: 'Diskon 10% untuk pembeli baru',
      type: VoucherType.PERCENT,
      value: 10,
      maxDiscount: 20000,
      channel: VoucherChannel.ALL,
      isActive: true,
      createdByUserId: adminUserId,
    },
  });

  await prisma.voucher.upsert({
    where: { code: 'POSGROSIR' },
    update: {},
    create: {
      code: 'POSGROSIR',
      description: 'Potongan Rp15.000 untuk pembelian grosir di kasir POS',
      type: VoucherType.FIXED,
      value: 15000,
      minPurchase: 100000,
      channel: VoucherChannel.POS,
      isActive: true,
      createdByUserId: adminUserId,
    },
  });
}

async function main() {
  const admin = await seedAdmin();
  const categoryIdBySlug = await seedCategories();
  await seedProducts(categoryIdBySlug, admin.id);
  await seedCities();
  await seedVouchers(admin.id);
  await seedBlogPosts();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
