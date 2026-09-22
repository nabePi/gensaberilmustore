import { env } from '@/env';

export class JneTariffError extends Error {}

type JneTariffApiResponse =
  | {
      price: {
        origin_name: string;
        destination_name: string;
        service_display: string;
        service_code: string;
        goods_type: string;
        currency: string;
        price: string;
        etd_from: string;
        etd_thru: string;
        times: string;
      }[];
    }
  | { error: string; status: false };

export type JneTariffOption = {
  serviceCode: string;
  serviceDisplay: string;
  price: number;
  etdFrom: string;
  etdThru: string;
};

/**
 * Calls JNE's tariff (pricedev) API to fetch the shipping cost options for a
 * given destination tariff code and weight. `origin` is JNE_SENDER_ORIGIN.
 */
export async function fetchJneTariffOptions(
  tariffCode: string,
  weightKg: number,
): Promise<JneTariffOption[]> {
  if (!env.jneTariffApiUrl || !env.jneUsername || !env.jneApiKey || !env.jneSenderOrigin) {
    throw new JneTariffError('Konfigurasi JNE belum lengkap');
  }

  const body = new URLSearchParams({
    username: env.jneUsername,
    api_key: env.jneApiKey,
    from: env.jneSenderOrigin,
    thru: tariffCode,
    weight: String(weightKg),
  });

  let response: Response;
  try {
    response = await fetch(env.jneTariffApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error('Gagal menghubungi layanan tarif JNE:', error);
    throw new JneTariffError('Gagal menghubungi layanan tarif JNE');
  }

  const data: JneTariffApiResponse | null = await response.json().catch(() => null);

  if (!data || 'error' in data) {
    console.error('Respons tarif JNE tidak valid:', data);
    throw new JneTariffError(data?.error ?? 'Gagal mengambil tarif JNE');
  }

  return data.price.map((item) => ({
    serviceCode: item.service_code,
    serviceDisplay: item.service_display,
    price: Number(item.price),
    etdFrom: item.etd_from,
    etdThru: item.etd_thru,
  }));
}

export const JNE_SERVICE_OPTIONS = ['REG', 'YES', 'JTR'] as const;
export type JneServiceOption = (typeof JNE_SERVICE_OPTIONS)[number];

/** Picks the standard "REG" (regular) service as the default shipping option. */
export function pickDefaultTariffOption(options: JneTariffOption[]): JneTariffOption | null {
  return options.find((option) => option.serviceCode.startsWith('REG')) ?? options[0] ?? null;
}

function pickTariffOption(
  options: JneTariffOption[],
  service?: JneServiceOption,
): JneTariffOption | null {
  if (!service) return pickDefaultTariffOption(options);
  return options.find((option) => option.serviceDisplay === service) ?? null;
}

export async function getShippingCost(
  tariffCode: string,
  weightKg: number,
  service?: JneServiceOption,
): Promise<JneTariffOption> {
  const options = await fetchJneTariffOptions(tariffCode, weightKg);
  const selected = pickTariffOption(options, service);

  if (!selected) {
    throw new JneTariffError(
      service
        ? `Layanan ${service} tidak tersedia untuk tujuan ini`
        : 'Tarif JNE tidak ditemukan untuk tujuan ini',
    );
  }

  return selected;
}
