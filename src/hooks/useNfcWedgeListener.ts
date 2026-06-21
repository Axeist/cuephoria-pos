import { useEffect, useRef } from 'react';
import { normalizeNfcUid } from '@/utils/nfcUid.utils';

type UseNfcWedgeListenerOptions = {
  enabled?: boolean;
  onScan: (uid: string) => void;
  /** Max ms between keystrokes before buffer resets (typical wedge burst). */
  interCharMs?: number;
  /** Auto-flush buffer after last keystroke when no Enter is sent. */
  flushMs?: number;
};

/**
 * Listens for keyboard-wedge NFC readers that type a UID quickly and often end with Enter.
 * Ignores typing in normal inputs unless they declare `data-nfc-wedge="true"`.
 */
export function useNfcWedgeListener({
  enabled = true,
  onScan,
  interCharMs = 80,
  flushMs = 200,
}: UseNfcWedgeListenerOptions) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyTime = 0;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      const raw = buffer;
      buffer = '';
      if (!raw) return;
      const uid = normalizeNfcUid(raw);
      if (uid.length >= 4) onScanRef.current(uid);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || target?.isContentEditable === true;
      const isNfcInput = target?.dataset?.nfcWedge === 'true';

      if (isEditable && !isNfcInput) return;

      const now = Date.now();
      if (now - lastKeyTime > interCharMs) buffer = '';
      lastKeyTime = now;

      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(flushTimer);
        flush();
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
        clearTimeout(flushTimer);
        flushTimer = setTimeout(flush, flushMs);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(flushTimer);
    };
  }, [enabled, interCharMs, flushMs]);
}
