import { env } from '@/env';

export class JneTrackingError extends Error {}

type JneTrackingApiResponse =
  | {
      cnote: {
        pod_status: string;
        last_status: string;
        city_name: string;
        estimate_delivery: string;
      };
      history: { date: string; desc: string; code: string }[];
    }
  | { error: string; status: false };

export type JneTrackingHistoryEntry = { date: string; desc: string; code: string };

export type JneTrackingResult = {
  lastStatus: string;
  podStatus: string;
  cityName: string | null;
  estimateDelivery: string | null;
  history: JneTrackingHistoryEntry[];
};

/**
 * Calls JNE's tracing (list/v1/cnote) API to fetch the shipment history for
 * an airwaybill (cnote) number.
 */
export async function fetchJneTracking(awb: string): Promise<JneTrackingResult> {
  if (!env.jneTrackingApiUrl || !env.jneUsername || !env.jneApiKey) {
    throw new JneTrackingError('Konfigurasi JNE tracking belum lengkap');
  }

  const body = new URLSearchParams({
    username: env.jneUsername,
    api_key: env.jneApiKey,
  });

  let response: Response;
  try {
    response = await fetch(`${env.jneTrackingApiUrl}/${encodeURIComponent(awb)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
  } catch {
    throw new JneTrackingError('Gagal menghubungi layanan tracking JNE');
  }

  const data: JneTrackingApiResponse | null = await response.json().catch(() => null);

  if (!data || 'error' in data) {
    throw new JneTrackingError(data?.error ?? 'Gagal mengambil data tracking JNE');
  }

  return {
    lastStatus: data.cnote.last_status,
    podStatus: data.cnote.pod_status,
    cityName: data.cnote.city_name ?? null,
    estimateDelivery: data.cnote.estimate_delivery ?? null,
    history: data.history,
  };
}
