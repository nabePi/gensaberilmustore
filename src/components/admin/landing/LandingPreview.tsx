'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { adminBtnOutlineSm } from '@/lib/admin/styles';
import type { LandingContent } from '@/server/landing/schema';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://gensaberilmu.com';
const MESSAGE_TYPE = 'gensa-landing-preview';
const READY_TYPE = 'gensa-landing-preview-ready';

const FRAMES = {
  mobile: { width: 390, height: 780, label: 'Mobile' },
  desktop: { width: 1280, height: 800, label: 'Desktop' },
} as const;

type Device = keyof typeof FRAMES;

export function LandingPreview({ content }: { content: LandingContent }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device>('mobile');
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [scale, setScale] = useState(1);
  const [nonce, setNonce] = useState(0);

  function reload() {
    setReady(false);
    setTimedOut(false);
    setNonce((n) => n + 1);
  }

  const origin = useMemo(() => new URL(LANDING_URL).origin, []);
  const frame = FRAMES[device];

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if ((event.data as { type?: string } | null)?.type === READY_TYPE) {
        setReady(true);
        setTimedOut(false);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin]);

  // Reload resets the handshake; if the landing never answers, tell the admin why.
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [nonce]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage({ type: MESSAGE_TYPE, content }, origin);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [content, ready, origin]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(Math.min(1, box.clientWidth / frame.width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, [frame.width]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg bg-neutral-100 p-0.5"
          role="group"
          aria-label="Ukuran preview"
        >
          {(Object.keys(FRAMES) as Device[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                device === key ? 'bg-white text-foreground shadow-theme-xs' : 'text-neutral-500'
              }`}
            >
              {FRAMES[key].label}
            </button>
          ))}
        </div>
        <button type="button" className={adminBtnOutlineSm} onClick={reload}>
          Muat ulang
        </button>
      </div>

      <div
        ref={boxRef}
        className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
      >
        <div
          style={{
            width: frame.width * scale,
            height: frame.height * scale,
            margin: '0 auto',
          }}
        >
          <iframe
            key={nonce}
            ref={frameRef}
            title="Preview landing page"
            src={`${LANDING_URL}/?preview=1`}
            style={{
              width: frame.width,
              height: frame.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              border: 0,
            }}
          />
        </div>
      </div>

      {timedOut && !ready ? (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-700" role="status">
          Preview belum merespons. Pastikan versi terbaru landing page (dengan mode preview) sudah
          ter-deploy, lalu{' '}
          <button type="button" className="font-medium underline" onClick={reload}>
            muat ulang
          </button>
          . Perubahan tetap tersimpan di editor.
        </p>
      ) : (
        <p className="text-xs text-neutral-500">
          {ready ? 'Preview langsung mengikuti perubahan Anda.' : 'Memuat preview…'}
        </p>
      )}
    </div>
  );
}
