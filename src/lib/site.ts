export const SITE_URL = 'https://store.gensaberilmu.com';
export const SITE_NAME = 'GenSa Berilmu';
export const SITE_DESCRIPTION = 'Toko buku Islam dan produk muslim keluarga';

// Store identity shown on printed/PDF POS receipts.
export const STORE_LEGAL_NAME = 'PT. Generasi Shalahuddin Berilmu';
export const STORE_PHONE = '0813-8480-4494';
export const STORE_ADDRESS_LINES = [
  'Jalan Margonda Raya Gang H. Fatimah',
  'Bawah Rt 02/014 No. 8, Kemiri Muka, Beji,',
  'Kota Depok, Jawa Barat 16423',
];
export const STORE_ADDRESS = STORE_ADDRESS_LINES.join(' ');

// Only the live production server should be crawlable/indexable.
export const IS_PRODUCTION = process.env.APP_ENV === 'production';
