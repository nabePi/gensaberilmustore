'use client';

import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

const PX_PER_MM = 96 / 25.4;
// Bars thinner than this are unreliable on most scanners/printers.
const MIN_BAR_WIDTH_PX = 0.3 * PX_PER_MM;

// Rough Code128 module count: start + (n + checksum) symbols + stop.
function estimateModuleCount(value: string) {
  return 11 * (value.length + 2) + 13;
}

export function Code128Barcode({
  value,
  widthMm = 40,
  heightMm = 8,
  className,
}: {
  value: string;
  widthMm?: number;
  heightMm?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const barWidth = Math.max(MIN_BAR_WIDTH_PX, (widthMm * PX_PER_MM) / estimateModuleCount(value));
    JsBarcode(svgRef.current, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: barWidth,
      height: heightMm * PX_PER_MM,
    });
  }, [value, widthMm, heightMm]);

  return <svg ref={svgRef} className={className} />;
}
