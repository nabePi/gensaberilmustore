import { prisma } from '@/lib/db';

const RESULT_LIMIT = 50;

function insensitiveContains(q: string | undefined) {
  return q ? { contains: q, mode: 'insensitive' as const } : undefined;
}

export async function listProvinces(q?: string) {
  const rows = await prisma.destination.findMany({
    where: { provinceName: insensitiveContains(q) },
    distinct: ['provinceName'],
    select: { provinceName: true },
    orderBy: { provinceName: 'asc' },
    take: RESULT_LIMIT,
  });
  return rows.map((row) => row.provinceName);
}

export async function listCities(province: string, q?: string) {
  const rows = await prisma.destination.findMany({
    where: { provinceName: province, cityName: insensitiveContains(q) },
    distinct: ['cityName'],
    select: { cityName: true },
    orderBy: { cityName: 'asc' },
    take: RESULT_LIMIT,
  });
  return rows.map((row) => row.cityName);
}

export async function listDistricts(province: string, city: string, q?: string) {
  const rows = await prisma.destination.findMany({
    where: { provinceName: province, cityName: city, districtName: insensitiveContains(q) },
    distinct: ['districtName'],
    select: { districtName: true },
    orderBy: { districtName: 'asc' },
    take: RESULT_LIMIT,
  });
  return rows.map((row) => row.districtName);
}

export async function listSubdistricts(
  province: string,
  city: string,
  district: string,
  q?: string,
) {
  return prisma.destination.findMany({
    where: {
      provinceName: province,
      cityName: city,
      districtName: district,
      subdistrictName: insensitiveContains(q),
    },
    select: { id: true, subdistrictName: true, zipCode: true },
    orderBy: { subdistrictName: 'asc' },
    take: RESULT_LIMIT,
  });
}
