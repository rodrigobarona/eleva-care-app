'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const MAX_POLL_DURATION_MS = 60_000;
const INITIAL_INTERVAL_MS = 2_000;
const MAX_INTERVAL_MS = 8_000;

/**
 * Polls the current page via router.refresh() with exponential backoff
 * until the server component resolves the meeting row (at which point
 * this component is no longer rendered) or a timeout is reached.
 */
export function PaymentProcessingPoller({ onTimeout }: { onTimeout?: () => void }) {
  const router = useRouter();
  const startTimeRef = useRef(0);
  const intervalRef = useRef(INITIAL_INTERVAL_MS);

  useEffect(() => {
    startTimeRef.current = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    function poll() {
      const elapsed = Date.now() - startTimeRef.current;

      if (elapsed >= MAX_POLL_DURATION_MS) {
        onTimeout?.();
        return;
      }

      router.refresh();

      intervalRef.current = Math.min(intervalRef.current * 1.5, MAX_INTERVAL_MS);
      timer = setTimeout(poll, intervalRef.current);
    }

    timer = setTimeout(poll, INITIAL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [router, onTimeout]);

  return null;
}
