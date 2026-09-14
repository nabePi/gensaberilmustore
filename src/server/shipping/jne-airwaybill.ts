import { env } from '@/env';

export class JneAirwaybillError extends Error {}

type JneGenerateCnoteResponse =
  | { detail: { status: string; cnote_no?: string; reason?: string }[] }
  | { error: string; status: string };

export type GenerateAirwaybillParams = {
  orderNumber: string;
  service: string;
  destinationTariffCode: string;
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverRegion: string;
  receiverZip: string;
  receiverPhone: string;
  quantity: number;
  weightKg: number;
  goodsValue: number;
  goodsDesc: string;
};

const ADDRESS_CHUNK_LENGTH = 30;

function splitAddress(address: string): [string, string, string] {
  const clean = address.trim();
  const parts: string[] = [];
  for (let i = 0; i < clean.length && parts.length < 3; i += ADDRESS_CHUNK_LENGTH) {
    parts.push(clean.slice(i, i + ADDRESS_CHUNK_LENGTH));
  }
  while (parts.length < 3) parts.push('');
  return parts as [string, string, string];
}

function toPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 15);
}

/** OLSHOP_CUST is limited to 10 bytes by JNE's API. */
function toOlshopCust(value: string): string {
  return value.slice(0, 10);
}

/**
 * Calls JNE's Generate Airwaybill (generatecnote) API to create a shipment
 * and obtain the resi/airwaybill (cnote) number for an order.
 */
export async function generateJneAirwaybill(params: GenerateAirwaybillParams): Promise<string> {
  if (
    !env.jneGenerateCnoteApiUrl ||
    !env.jneUsername ||
    !env.jneApiKey ||
    !env.jneSenderOrigin ||
    !env.jneOlshopBranch ||
    !env.jneOlshopCust ||
    !env.jneShipperName ||
    !env.jneShipperAddr1 ||
    !env.jneShipperCity ||
    !env.jneShipperZip ||
    !env.jneShipperPhone
  ) {
    throw new JneAirwaybillError('Konfigurasi JNE airwaybill belum lengkap');
  }

  const [receiverAddr1, receiverAddr2, receiverAddr3] = splitAddress(params.receiverAddress);

  const body = new URLSearchParams({
    username: env.jneUsername,
    api_key: env.jneApiKey,
    OLSHOP_BRANCH: env.jneOlshopBranch,
    OLSHOP_CUST: toOlshopCust(env.jneOlshopCust),
    OLSHOP_ORDERID: params.orderNumber,
    OLSHOP_SHIPPER_NAME: env.jneShipperName,
    OLSHOP_SHIPPER_ADDR1: env.jneShipperAddr1,
    OLSHOP_SHIPPER_ADDR2: env.jneShipperAddr2 ?? '',
    OLSHOP_SHIPPER_ADDR3: env.jneShipperAddr3 ?? '',
    OLSHOP_SHIPPER_CITY: env.jneShipperCity,
    OLSHOP_SHIPPER_REGION: env.jneShipperRegion ?? '',
    OLSHOP_SHIPPER_ZIP: env.jneShipperZip,
    OLSHOP_SHIPPER_PHONE: toPhoneDigits(env.jneShipperPhone),
    OLSHOP_RECEIVER_NAME: params.receiverName,
    OLSHOP_RECEIVER_ADDR1: receiverAddr1,
    OLSHOP_RECEIVER_ADDR2: receiverAddr2,
    OLSHOP_RECEIVER_ADDR3: receiverAddr3,
    OLSHOP_RECEIVER_CITY: params.receiverCity,
    OLSHOP_RECEIVER_REGION: params.receiverRegion,
    OLSHOP_RECEIVER_ZIP: params.receiverZip,
    OLSHOP_RECEIVER_PHONE: toPhoneDigits(params.receiverPhone),
    OLSHOP_QTY: String(params.quantity),
    OLSHOP_WEIGHT: String(params.weightKg),
    OLSHOP_GOODSDESC: params.goodsDesc.slice(0, 60),
    OLSHOP_GOODSVALUE: String(params.goodsValue),
    OLSHOP_GOODSTYPE: '2',
    OLSHOP_INS_FLAG: 'N',
    OLSHOP_ORIG: env.jneSenderOrigin,
    OLSHOP_DEST: params.destinationTariffCode,
    OLSHOP_SERVICE: params.service,
    OLSHOP_COD_FLAG: 'N',
    OLSHOP_COD_AMOUNT: '0',
  });

  let response: Response;
  try {
    response = await fetch(env.jneGenerateCnoteApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
  } catch {
    throw new JneAirwaybillError('Gagal menghubungi layanan airwaybill JNE');
  }

  const data: JneGenerateCnoteResponse | null = await response.json().catch(() => null);

  if (!data || 'error' in data) {
    throw new JneAirwaybillError(data?.error ?? 'Gagal membuat airwaybill JNE');
  }

  const detail = data.detail[0];
  if (!detail || detail.status.toLowerCase() !== 'sukses' || !detail.cnote_no) {
    throw new JneAirwaybillError(detail?.reason ?? 'Gagal membuat airwaybill JNE');
  }

  return detail.cnote_no;
}
