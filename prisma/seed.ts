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
