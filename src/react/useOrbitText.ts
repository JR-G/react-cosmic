import { useSyncExternalStore, useCallback, useMemo, useEffect } from "react";
import { useOrbitStore } from "./provider.tsx";

/**
 * Hook for managing collaborative text with CRDT semantics.
 *
 * Optimized for text editing with proper conflict resolution.
 * Use this instead of useOrbit for textarea or rich text editors.
 *
 * @param key - Unique key for this text field
 * @param initialValue - Default text if no persisted state exists
 * @returns Tuple of [text, setText] matching useState API
 *
 * @example
 * ```typescript
 * function TextEditor() {
 *   const [content, setContent] = useOrbitText("documentContent", "");
 *
 *   return (
 *     <textarea
 *       value={content}
 *       onChange={(e) => setContent(e.target.value)}
 *       rows={10}
 *     />
 *   );
 * }
 * ```
 */
export function useOrbitText(
  key: string,
  initialValue = ""
): [string, (text: string) => void] {
  const store = useOrbitStore();
  const ytext = useMemo(() => store.getText(key), [store, key]);

  useEffect(() => {
    if (ytext.length === 0 && initialValue.length > 0) {
      ytext.insert(0, initialValue);
    }
  }, [ytext, initialValue]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const observer = () => {
        callback();
      };
      ytext.observe(observer);
      return () => {
        ytext.unobserve(observer);
      };
    },
    [ytext]
  );

  const getSnapshot = useCallback(() => {
    const existing = ytext.toString();
    return existing.length > 0 ? existing : initialValue;
  }, [ytext, initialValue]);

  const text = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setOrbitText = useCallback(
    (newText: string) => {
      const oldText = ytext.toString();
      if (oldText === newText) return;

      let commonPrefix = 0;
      while (
        commonPrefix < oldText.length &&
        commonPrefix < newText.length &&
        oldText[commonPrefix] === newText[commonPrefix]
      ) {
        commonPrefix++;
      }

      let commonSuffix = 0;
      while (
        commonSuffix < oldText.length - commonPrefix &&
        commonSuffix < newText.length - commonPrefix &&
        oldText[oldText.length - 1 - commonSuffix] ===
        newText[newText.length - 1 - commonSuffix]
      ) {
        commonSuffix++;
      }

      store.getYDoc().transact(() => {
        if (commonPrefix + commonSuffix < oldText.length) {
          ytext.delete(
            commonPrefix,
            oldText.length - commonPrefix - commonSuffix
          );
        }
        if (commonPrefix + commonSuffix < newText.length) {
          ytext.insert(
            commonPrefix,
            newText.slice(commonPrefix, newText.length - commonSuffix)
          );
        }
      });
    },
    [ytext, store]
  );

  return [text, setOrbitText];
}
