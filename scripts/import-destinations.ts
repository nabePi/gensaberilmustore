import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { readFile, utils } from 'xlsx';

import { prisma } from '@/lib/db';

/**
 * Import JNE destination reference data (province/city/district/subdistrict/
 * zip/tariff code) from an xlsx export into the Destination table.
 *
 * Usage: pnpm db:import-destinations [file.xlsx]
 * Defaults to list_dest.xlsx at the project root.
 */

type SourceRow = {
  COUNTRY_NAME?: string;
  PROVINCE_NAME?: string;
  CITY_NAME?: string;
  DISTRICT_NAME?: string;
  SUBDISTRICT_NAME?: string;
  ZIP_CODE?: string | number;
  TARIFF_CODE?: string;
};

const BATCH_SIZE = 5000;

async function main() {
  const fileArg = process.argv[2] ?? 'list_dest.xlsx';
  const filePath = resolve(process.cwd(), fileArg);

  // eslint-disable-next-line no-console
  console.log(`Membaca ${filePath} ...`);
  const workbook = readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = utils.sheet_to_json<SourceRow>(sheet, { defval: '' });

  // eslint-disable-next-line no-console
  console.log(`${rows.length} baris ditemukan. Menghapus data lama...`);
  await prisma.destination.deleteMany();

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const data = batch
      .filter((row) => row.PROVINCE_NAME && row.CITY_NAME && row.SUBDISTRICT_NAME)
      .map((row) => ({
        id: randomUUID(),
        countryName: String(row.COUNTRY_NAME ?? '').trim(),
        provinceName: String(row.PROVINCE_NAME ?? '').trim(),
        cityName: String(row.CITY_NAME ?? '').trim(),
        districtName: String(row.DISTRICT_NAME ?? '').trim(),
        subdistrictName: String(row.SUBDISTRICT_NAME ?? '').trim(),
        zipCode: String(row.ZIP_CODE ?? '').trim(),
        tariffCode: String(row.TARIFF_CODE ?? '').trim(),
      }));

    await prisma.destination.createMany({ data });
    imported += data.length;
    // eslint-disable-next-line no-console
    console.log(`  ${imported}/${rows.length} baris diimport...`);
  }

  // eslint-disable-next-line no-console
  console.log(`Selesai: ${imported} baris diimport ke tabel Destination.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
