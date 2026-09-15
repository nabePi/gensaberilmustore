'use client';

import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';

// Guards against the same barcode being re-added on every video frame while
// it's still in view of the camera.
const RESCAN_COOLDOWN_MS = 2000;

export function CameraBarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectionRef = useRef<{ code: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;

          const code = result.getText();
          const now = Date.now();
          const last = lastDetectionRef.current;
          if (last && last.code === code && now - last.at < RESCAN_COOLDOWN_MS) return;

          lastDetectionRef.current = { code, at: now };
          onDetectedRef.current(code);
        },
      )
      .then((startedControls) => {
        if (cancelled) {
          startedControls.stop();
          return;
        }
        controls = startedControls;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan.',
        );
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <AdminModal title="Scan Barcode / QR Produk" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          Arahkan kamera ke barcode ISBN, barcode SKU, atau QR code produk.
        </p>
        {error ? (
          <p className="rounded-md bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
        ) : (
          <video
            ref={videoRef}
            className="aspect-video w-full rounded-lg bg-neutral-900 object-cover"
            muted
            playsInline
          />
        )}
      </div>
    </AdminModal>
  );
}
