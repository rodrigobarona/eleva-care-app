'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  /** The current content to save */
  content: T;
  /** The last saved content (to detect changes) */
  lastSavedContent: T;
  /** Function to perform the actual save operation */
  onSave: (content: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 2000) */
  delay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Custom equality function (default: strict equality) */
  isEqual?: (a: T, b: T) => boolean;
}

interface UseAutoSaveReturn {
  /** Current status of the auto-save operation */
  status: AutoSaveStatus;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Trigger a manual save */
  saveNow: () => Promise<void>;
  /** Cancel any pending auto-save */
  cancel: () => void;
}

/**
 * A React hook for auto-saving content with debouncing and proper cleanup.
 *
 * Features:
 * - Debounced save to prevent excessive API calls
 * - Save on unmount to prevent data loss
 * - Stable function references to avoid stale closures
 * - Status tracking for UI feedback
 *
 * @example
 * ```tsx
 * const { status, hasUnsavedChanges, saveNow } = useAutoSave({
 *   content: editorContent,
 *   lastSavedContent: serverContent,
 *   onSave: async (content) => {
 *     await fetch('/api/save', { method: 'POST', body: JSON.stringify({ content }) });
 *   },
 *   delay: 2000,
 * });
 * ```
 */
export function useAutoSave<T>({
  content,
  lastSavedContent,
  onSave,
  delay = 2000,
  enabled = true,
  isEqual = (a, b) => a === b,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');

  // Use refs to avoid stale closures in callbacks and effects
  const contentRef = useRef(content);
  const lastSavedRef = useRef(lastSavedContent);
  const onSaveRef = useRef(onSave);
  const isEqualRef = useRef(isEqual);
  const isSavingRef = useRef(false);

  // Keep refs up to date
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    lastSavedRef.current = lastSavedContent;
  }, [lastSavedContent]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    isEqualRef.current = isEqual;
  }, [isEqual]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = !isEqual(content, lastSavedContent);

  // Core save function with error handling
  const performSave = useCallback(async (contentToSave: T) => {
    // Prevent concurrent saves
    if (isSavingRef.current) return;

    // Don't save if content matches last saved
    if (isEqualRef.current(contentToSave, lastSavedRef.current)) {
      setStatus('saved');
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    try {
      await onSaveRef.current(contentToSave);
      setStatus('saved');
    } catch (error) {
      console.error('[useAutoSave] Save failed:', error);
      setStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // Debounced save function
  const debouncedSave = useDebounceCallback(performSave, delay);

  // Cancel function to stop pending saves
  const cancel = useCallback(() => {
    debouncedSave.cancel();
    if (status === 'pending') {
      setStatus('idle');
    }
  }, [debouncedSave, status]);

  // Manual save function (immediate, bypasses debounce)
  const saveNow = useCallback(async () => {
    debouncedSave.cancel();
    await performSave(contentRef.current);
  }, [debouncedSave, performSave]);

  // Trigger debounced save when content changes
  useEffect(() => {
    if (!enabled) return;

    if (!isEqualRef.current(content, lastSavedRef.current)) {
      setStatus('pending');
      debouncedSave(content);
    }
  }, [content, enabled, debouncedSave]);

  // Reset status when content matches saved content
  useEffect(() => {
    if (isEqual(content, lastSavedContent) && status === 'pending') {
      debouncedSave.cancel();
      setStatus('saved');
    }
  }, [content, lastSavedContent, isEqual, status, debouncedSave]);

  // Save on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (!isEqualRef.current(contentRef.current, lastSavedRef.current)) {
        // Cancel debounced save and perform immediate save
        debouncedSave.cancel();
        // Fire and forget - component is unmounting
        void onSaveRef.current(contentRef.current);
      }
    };
  }, [debouncedSave]);

  return {
    status,
    hasUnsavedChanges,
    saveNow,
    cancel,
  };
}
