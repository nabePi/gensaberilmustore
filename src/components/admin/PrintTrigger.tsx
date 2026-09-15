'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    let cancelled = false;
    const pending = Array.from(document.images).filter((img) => !img.complete);

    function triggerPrint() {
      if (!cancelled) window.print();
    }

    if (pending.length === 0) {
      const timer = setTimeout(triggerPrint, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    let remaining = pending.length;
    function onSettle() {
      remaining -= 1;
      if (remaining === 0) triggerPrint();
    }
    pending.forEach((img) => {
      img.addEventListener('load', onSettle, { once: true });
      img.addEventListener('error', onSettle, { once: true });
    });

    const fallback = setTimeout(triggerPrint, 3000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      pending.forEach((img) => {
        img.removeEventListener('load', onSettle);
        img.removeEventListener('error', onSettle);
      });
    };
  }, []);

  return null;
}
