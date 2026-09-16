import { describe, expect, it } from 'vitest';

import { buildDynamicQris, calculateQrisCrc16, validateStaticQris } from '@/server/payment/qris';

function buildTlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

/** Builds a syntactically valid static QRIS payload (tag 01 = "11", no amount) with a correct CRC. */
function buildStaticQris({
  merchantName = 'Toko Bahagia',
  merchantCity = 'JAKARTA PUSAT',
}: { merchantName?: string; merchantCity?: string } = {}) {
  const withoutCrc =
    buildTlv('00', '01') +
    buildTlv('01', '11') +
    buildTlv('26', buildTlv('00', 'COM.EXAMPLE.WWW') + buildTlv('01', '123456789')) +
    buildTlv('52', '5411') +
    buildTlv('53', '360') +
    buildTlv('58', 'ID') +
    buildTlv('59', merchantName) +
    buildTlv('60', merchantCity) +
    '6304';

  return withoutCrc + calculateQrisCrc16(withoutCrc);
}

describe('calculateQrisCrc16', () => {
  it('matches the standard CRC-16/CCITT-FALSE check value for "123456789"', () => {
    // Published check value for the CCITT-FALSE variant (poly 0x1021, init 0xFFFF),
    // which is what the EMVCo/QRIS spec uses.
    expect(calculateQrisCrc16('123456789')).toBe('29B1');
  });
});

describe('validateStaticQris', () => {
  it('accepts a well-formed static QRIS payload', () => {
    expect(validateStaticQris(buildStaticQris())).toBeNull();
  });

  it('rejects a payload that does not start with the payload format indicator', () => {
    expect(validateStaticQris('123456')).toMatch(/000201/);
  });

  it('rejects a payload with a tampered checksum', () => {
    const tampered = buildStaticQris().slice(0, -1) + '0';
    expect(validateStaticQris(tampered)).toMatch(/Checksum/);
  });
});

describe('buildDynamicQris', () => {
  it('switches the point of initiation method from static to dynamic', () => {
    const dynamic = buildDynamicQris(buildStaticQris(), 25000);
    expect(dynamic).toContain('010212');
    expect(dynamic).not.toContain('010211');
  });

  it('injects the transaction amount before the country code tag', () => {
    const dynamic = buildDynamicQris(buildStaticQris(), 25000);
    expect(dynamic).toContain('540525000');
    expect(dynamic.indexOf('540525000')).toBeLessThan(dynamic.indexOf('5802ID'));
  });

  it('preserves merchant fields untouched', () => {
    const dynamic = buildDynamicQris(buildStaticQris(), 25000);
    expect(dynamic).toContain('5912Toko Bahagia');
    expect(dynamic).toContain('6013JAKARTA PUSAT');
  });

  it('produces a payload with a correct, recalculated CRC', () => {
    const dynamic = buildDynamicQris(buildStaticQris(), 25000);
    const withoutCrc = dynamic.slice(0, -4);
    expect(dynamic.slice(-4)).toBe(calculateQrisCrc16(withoutCrc));
  });

  it('rounds a fractional amount to the nearest rupiah', () => {
    const dynamic = buildDynamicQris(buildStaticQris(), 25000.7);
    expect(dynamic).toContain('540525001');
  });

  it('throws for a non-positive amount', () => {
    expect(() => buildDynamicQris(buildStaticQris(), 0)).toThrow(/lebih dari 0/);
  });

  it('throws for an invalid static payload', () => {
    expect(() => buildDynamicQris('not-a-qris', 10000)).toThrow();
  });
});
