import { PrismaClient, CoverType, RibbonType, VoucherType, VoucherChannel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CDN = 'https://kontan.reneturos.com/storage';

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
  'buku-anak-3-6': 'Bacaan seru dan edukatif untuk si kecil',
};

const CATEGORIES = [
  { slug: 'buku-terbaru', name: 'Buku Terbaru' },
  { slug: 'bestseller', name: 'Bestseller' },
  { slug: 'international-bestseller', name: 'International Bestseller' },
  { slug: 'keislaman-kiwari', name: 'Keislaman Kiwari' },
  { slug: 'rujukan-islam-klasik', name: 'Rujukan Islam Klasik' },
  { slug: 'buku-anak', name: 'Buku Anak' },
];

const KIDS_SUB_CATEGORIES = [
  { slug: 'buku-anak-0-2', name: '0-2 Tahun' },
  { slug: 'buku-anak-3-6', name: '3-6 Tahun' },
  { slug: 'buku-anak-7-9', name: '7-9 Tahun' },
  { slug: 'buku-anak-10-12', name: '10-12 Tahun' },
];

type SeedProduct = {
  title: string;
  author: string;
  price: number;
  discountPercent: number;
  finalPrice: number;
  image: string;
  categories: string[];
  ribbon?: { type: RibbonType; text: string };
  coverType?: CoverType;
  weightGram?: number;
  pageCount?: number;
  publishYear?: number;
};

const PRODUCTS: SeedProduct[] = [
  {
    title: 'PSIKOLOGI NALAR',
    author: 'Turos Pustaka',
    price: 75000,
    discountPercent: 16,
    finalPrice: 63000,
    image: `${CDN}/admin-uploads/whatsapp-image-2026-07-02-at-140220-1782985261.webp`,
    categories: ['buku-terbaru', 'rujukan-islam-klasik'],
    ribbon: { type: RibbonType.DISCOUNT, text: 'FLASH SALE' },
  },
  {
    title: 'Attached',
    author: 'Renebook',
    price: 129000,
    discountPercent: 15,
    finalPrice: 109650,
    image: `${CDN}/admin-uploads/whatsapp-image-2026-06-29-at-083735-1782697554.webp`,
    categories: ['buku-terbaru', 'international-bestseller'],
  },
  {
    title: 'The Decision Book (SC)',
    author: 'Renebook',
    price: 73000,
    discountPercent: 15,
    finalPrice: 62050,
    image: `${CDN}/admin-uploads/whatsapp-image-2026-07-01-at-100100-am-1782876794.webp`,
    categories: ['buku-terbaru', 'international-bestseller'],
  },
  {
    title: 'Work Life Barakah',
    author: 'Rene Islam',
    price: 93000,
    discountPercent: 15,
    finalPrice: 79050,
    image: `${CDN}/admin-uploads/wlb-web-1783483880.webp`,
    categories: ['buku-terbaru', 'keislaman-kiwari'],
  },
  {
    title: 'Merchandise: Poster Eksklusif Filsafat Rumah Tangga',
    author: 'Turos Pustaka',
    price: 5000,
    discountPercent: 15,
    finalPrice: 4250,
    image: `${CDN}/admin-uploads/poster-frt-web-1781064505.webp`,
    categories: ['buku-terbaru', 'rujukan-islam-klasik'],
    weightGram: 100,
    pageCount: 1,
  },
  {
    title: 'Filsafat Rumah Tangga',
    author: 'Turos Pustaka',
    price: 55000,
    discountPercent: 15,
    finalPrice: 46750,
    image: `${CDN}/admin-uploads/filsafat-rumah-tangga-web-1-1782707388.webp`,
    categories: ['buku-terbaru', 'rujukan-islam-klasik'],
  },
  {
    title: 'Toko Manisan Ajaib Amberglow',
    author: 'Renebook',
    price: 85000,
    discountPercent: 15,
    finalPrice: 72250,
    image: `${CDN}/admin-uploads/amberglow-new-web-1781236571.webp`,
    categories: ['buku-terbaru', 'international-bestseller'],
  },
  {
    title: 'LOGIKA KEIMANAN EDISI REVISI SC',
    author: 'Turos Pustaka',
    price: 99000,
    discountPercent: 15,
    finalPrice: 84150,
    image: `${CDN}/admin-uploads/logika-keimanan-new-web-1781236358.webp`,
    categories: ['buku-terbaru', 'rujukan-islam-klasik'],
  },
  {
    title: 'Versi Ringkas 48 Laws of Power SC',
    author: 'Robert Greene',
    price: 95000,
    discountPercent: 15,
    finalPrice: 80750,
    image: `${CDN}/products/versi-ringkas-48-laws-of-power.webp`,
    categories: ['bestseller', 'international-bestseller'],
    ribbon: { type: RibbonType.BEST, text: 'BESTSELLER' },
  },
  {
    title: 'The Visual MBA SC',
    author: 'Jason Barron',
    price: 119000,
    discountPercent: 15,
    finalPrice: 101150,
    image: `${CDN}/products/the-visual-mba.webp`,
    categories: ['bestseller', 'international-bestseller'],
    ribbon: { type: RibbonType.BEST, text: 'BESTSELLER' },
  },
  {
    title: 'Kitab Firasat SC',
    author: 'Imam Fakhruddin Ar-Razi',
    price: 59000,
    discountPercent: 15,
    finalPrice: 50150,
    image: `${CDN}/products/kitab-firasat.webp`,
    categories: ['bestseller', 'keislaman-kiwari'],
    ribbon: { type: RibbonType.BEST, text: 'BESTSELLER' },
  },
  {
    title: 'MAHFUZHAT',
    author: 'Tim Rene Islam',
    price: 69500,
    discountPercent: 15,
    finalPrice: 59075,
    image: `${CDN}/products/mahfuzhat.webp`,
    categories: ['bestseller', 'keislaman-kiwari', 'rujukan-islam-klasik'],
    ribbon: { type: RibbonType.BEST, text: 'BESTSELLER' },
  },
  {
    title: 'Brave New Words',
    author: 'Renebook',
    price: 105000,
    discountPercent: 15,
    finalPrice: 89250,
    image: `${CDN}/admin-uploads/brave-new-words-web-1778561287.webp`,
    categories: ['bestseller', 'international-bestseller'],
  },
  {
    title: 'The Book You Wish Your Parents Had Read (HC)',
    author: 'Renebook',
    price: 149000,
    discountPercent: 15,
    finalPrice: 126650,
    image: `${CDN}/admin-uploads/the-book-you-wish-hhc-web-1780367103.webp`,
    categories: ['bestseller', 'international-bestseller'],
    coverType: CoverType.HARDCOVER,
  },
  {
    title: 'Satu Malam Menuju Surga',
    author: 'Fuad Abdurahman',
    price: 115000,
    discountPercent: 15,
    finalPrice: 97750,
    image: `${CDN}/products/satu-malam-menuju-surga-1772166823.webp`,
    categories: ['bestseller', 'keislaman-kiwari', 'rujukan-islam-klasik'],
  },
  {
    title: 'Cara Mudah Memahami Al-Quran Otodidak Metode 3 In 1 (Jilid 2)',
    author: 'Ustadz Ahmad Huseno, S.S.',
    price: 120000,
    discountPercent: 15,
    finalPrice: 102000,
    image: `${CDN}/products/20-hari-2-web.webp`,
    categories: ['international-bestseller', 'keislaman-kiwari'],
  },
  {
    title: 'Dua Khalifah Yang Dirindukan Surga',
    author: 'Fuad Abdurahman',
    price: 99000,
    discountPercent: 15,
    finalPrice: 84150,
    image: `${CDN}/products/dua-khalifah-yang-dirindukan-s-1767926840.webp`,
    categories: ['keislaman-kiwari', 'rujukan-islam-klasik'],
  },
  {
    title: 'Daily Fikih Muslimah Sesuai Sunah',
    author: 'Ust. Amad Jauhari Umar',
    price: 99000,
    discountPercent: 15,
    finalPrice: 84150,
    image: `${CDN}/products/daily-fikih-muslimah-sesuai-su.webp`,
    categories: ['keislaman-kiwari'],
  },
  {
    title: 'The Visual Fiqh',
    author: 'Turos Pustaka',
    price: 85000,
    discountPercent: 15,
    finalPrice: 72250,
    image: `${CDN}/admin-uploads/visual-fiqh-web-1777866441.webp`,
    categories: ['keislaman-kiwari', 'rujukan-islam-klasik'],
  },
  {
    title: 'Petualangan Si Kecil',
    author: 'GenSa Kids',
    price: 60000,
    discountPercent: 25,
    finalPrice: 45000,
    image: 'assets/generated/book-petualangan.png',
    categories: ['buku-anak-3-6'],
    weightGram: 200,
    pageCount: 32,
    publishYear: 2023,
  },
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
  for (const [index, item] of PRODUCTS.entries()) {
    const sku = `GSI-${String(index + 1).padStart(3, '0')}`;
    const slug = slugify(item.title);
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
        description: `${item.title} adalah buku karya ${item.author} yang tersedia di Gensa Berilmu Store.`,
        price: item.price,
        discountPercent: item.discountPercent,
        finalPrice: item.finalPrice,
        stock: 50,
        weightGram: item.weightGram ?? 300,
        coverType: item.coverType ?? CoverType.SOFTCOVER,
        pageCount: item.pageCount ?? 200,
        publishYear: item.publishYear ?? 2024,
        position: index,
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
