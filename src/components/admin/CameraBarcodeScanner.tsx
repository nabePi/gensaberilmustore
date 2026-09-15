'use client';

import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';

// Guards against the same barcode being re-added on every video frame while
// it's still in view of the camera.
const RESCAN_COOLDOWN_MS = 2000;
// How long the detection box stays highlighted before fading out.
const BOX_HIGHLIGHT_MS = 900;

type DetectionBox = { left: number; top: number; width: number; height: number };

export function CameraBarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectionRef = useRef<{ code: string; at: number } | null>(null);
  const boxHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<DetectionBox | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  function highlightDetection(points: { getX(): number; getY(): number }[]) {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || points.length === 0) return;

    const nativeWidth = video.videoWidth;
    const nativeHeight = video.videoHeight;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;
    if (!nativeWidth || !nativeHeight || !displayWidth || !displayHeight) return;

    const xs = points.map((point) => point.getX());
    const ys = points.map((point) => point.getY());
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    // 1D barcodes only report points along the middle scan line, so pad the
    // box vertically so it reads as a rectangle rather than a flat line.
    const minHeight = Math.max((maxX - minX) * 0.35, 40);
    if (maxY - minY < minHeight) {
      const padY = (minHeight - (maxY - minY)) / 2;
      minY -= padY;
      maxY += padY;
    }
    const paddingX = (maxX - minX) * 0.12;
    const paddingY = (maxY - minY) * 0.25;
    minX -= paddingX;
    maxX += paddingX;
    minY -= paddingY;
    maxY += paddingY;

    // Video is rendered with object-cover, so it's scaled up and centered
    // (cropped) inside the container — map native decode coordinates to
    // that same scale/offset to line the box up with what's on screen.
    const scale = Math.max(displayWidth / nativeWidth, displayHeight / nativeHeight);
    const offsetX = (nativeWidth * scale - displayWidth) / 2;
    const offsetY = (nativeHeight * scale - displayHeight) / 2;

    setBox({
      left: minX * scale - offsetX,
      top: minY * scale - offsetY,
      width: (maxX - minX) * scale,
      height: (maxY - minY) * scale,
    });

    if (boxHideTimerRef.current) clearTimeout(boxHideTimerRef.current);
    boxHideTimerRef.current = setTimeout(() => setBox(null), BOX_HIGHLIGHT_MS);
  }

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

          highlightDetection(result.getResultPoints());

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
      if (boxHideTimerRef.current) clearTimeout(boxHideTimerRef.current);
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
          <div
            ref={containerRef}
            className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
            />
            <div className="animate-scan-line pointer-events-none absolute inset-x-0 h-0.5 bg-lime-400 shadow-[0_0_8px_2px_rgba(163,230,53,0.8)]" />
            {box ? (
              <div
                className="pointer-events-none absolute rounded-sm border-2 border-lime-400 shadow-[0_0_10px_2px_rgba(163,230,53,0.7)]"
                style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
              />
            ) : null}
          </div>
        )}
      </div>
    </AdminModal>
  );
}
