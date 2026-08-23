'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import {
  CART_ITEM_ADDED_EVENT,
  dispatchCartUpdated,
  type CartItemAddedDetail,
} from '@/lib/cart-events';

const FLIGHT_DURATION_MS = 600;
const TOAST_VISIBLE_MS = 1800;
const TOAST_FADE_MS = 300;

type Flight = {
  id: number;
  imageUrl: string | null;
  start: DOMRect;
  target: DOMRect;
};

function getCartIconRect(): DOMRect | null {
  for (const id of ['cart-icon-mobile', 'cart-icon-desktop']) {
    const el = document.getElementById(id);
    if (el && el.getClientRects().length > 0) {
      return el.getBoundingClientRect();
    }
  }
  return null;
}

export function CartFlyToast() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const flightIdRef = useRef(0);
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRemoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function showToast(productTitle: string) {
      if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
      if (toastRemoveTimerRef.current) clearTimeout(toastRemoveTimerRef.current);

      setToastMessage(`"${productTitle}" ditambahkan ke keranjang`);
      setToastVisible(true);
      toastHideTimerRef.current = setTimeout(() => setToastVisible(false), TOAST_VISIBLE_MS);
      toastRemoveTimerRef.current = setTimeout(
        () => setToastMessage(null),
        TOAST_VISIBLE_MS + TOAST_FADE_MS,
      );
    }

    function handleItemAdded(event: Event) {
      const { detail } = event as CustomEvent<CartItemAddedDetail>;
      const target = getCartIconRect();

      if (!detail.sourceRect || !target) {
        dispatchCartUpdated();
        showToast(detail.productTitle);
        return;
      }

      const id = flightIdRef.current++;
      setFlights((current) => [
        ...current,
        { id, imageUrl: detail.imageUrl, start: detail.sourceRect!, target },
      ]);

      setTimeout(() => {
        setFlights((current) => current.filter((flight) => flight.id !== id));
        dispatchCartUpdated();
        showToast(detail.productTitle);
      }, FLIGHT_DURATION_MS);
    }

    window.addEventListener(CART_ITEM_ADDED_EVENT, handleItemAdded);
    return () => window.removeEventListener(CART_ITEM_ADDED_EVENT, handleItemAdded);
  }, []);

  return (
    <>
      {flights.map((flight) => (
        <CartFlyer
          key={flight.id}
          imageUrl={flight.imageUrl}
          start={flight.start}
          target={flight.target}
        />
      ))}

      {toastMessage ? (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-6">
          <div
            className={`rounded-full bg-black/75 px-5 py-3 text-center text-sm font-medium text-white shadow-lg transition-opacity duration-300 ${
              toastVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      ) : null}
    </>
  );
}

function CartFlyer({
  imageUrl,
  start,
  target,
}: {
  imageUrl: string | null;
  start: DOMRect;
  target: DOMRect;
}) {
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: start.left,
    top: start.top,
    width: start.width,
    height: start.height,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 70,
    opacity: 1,
    pointerEvents: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    transition: `left ${FLIGHT_DURATION_MS}ms cubic-bezier(0.55,0,0.85,0.35), top ${FLIGHT_DURATION_MS}ms cubic-bezier(0.55,0,0.85,0.35), width ${FLIGHT_DURATION_MS}ms ease-in, height ${FLIGHT_DURATION_MS}ms ease-in, opacity ${FLIGHT_DURATION_MS}ms ease-in`,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setStyle((current) => ({
        ...current,
        left: target.left + target.width / 2 - 8,
        top: target.top + target.height / 2 - 8,
        width: 16,
        height: 16,
        opacity: 0.2,
      }));
    });
    return () => cancelAnimationFrame(frame);
  }, [target.left, target.top, target.width, target.height]);

  return (
    <div style={style}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-brand" />
      )}
    </div>
  );
}
