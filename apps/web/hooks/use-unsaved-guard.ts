import { useEffect, useCallback, useRef } from 'react';

/**
 * Guards against losing unsaved changes.
 *
 * - Intercepts the browser `beforeunload` event (tab close / hard navigation).
 * - Intercepts client-side link clicks in the capture phase (before Next.js
 *   handles them) and blocks navigation if the user cancels.
 * - Intercepts browser back/forward via `popstate`.
 * - Exposes `confirmIfDirty(cb)` — call this before any in-app action that
 *   would discard changes (e.g. switching matches). If the user cancels the
 *   confirm dialog the callback is skipped.
 */
export function useUnsavedGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Browser tab close / hard reload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Intercept link clicks in the CAPTURE phase — runs before Next.js Link handler
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;

      // Walk up from target to find the nearest <a> element
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (!target) return;

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Only intercept internal navigations (same origin, different path)
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      if (!window.confirm('You have unsaved changes. Discard them?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Capture phase so we run BEFORE Next.js Link's onClick
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // Back/forward button guard
  useEffect(() => {
    // Store current path so we can restore it
    const currentPath = window.location.pathname + window.location.search;

    const handlePopState = () => {
      if (!dirtyRef.current) return;
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        // Push the original URL back to stay on the page
        history.pushState(null, '', currentPath);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /** Run `cb` only if not dirty, or if the user confirms discarding changes. */
  const confirmIfDirty = useCallback((cb: () => void) => {
    if (!dirtyRef.current) {
      cb();
      return;
    }
    if (window.confirm('You have unsaved changes. Discard them?')) {
      cb();
    }
  }, []);

  return { confirmIfDirty };
}
