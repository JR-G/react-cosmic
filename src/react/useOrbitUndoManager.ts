import { useState, useCallback, useMemo, useEffect } from "react";
import * as Y from "yjs";
import { useOrbitStore } from "./provider.tsx";

/**
 * The type of Yjs structure to attach the undo manager to.
 *
 * - `'text'` — wraps the Y.Text at the given key (use with useOrbitText)
 * - `'map'` — wraps the Y.Map at the given key (use with useOrbit / useOrbitObject)
 * - `'array'` — wraps the Y.Array at the given key (use with useOrbitArray)
 */
export type UndoScope = 'text' | 'map' | 'array';

/**
 * Return value from useOrbitUndoManager.
 */
export interface UndoManagerResult {
  /** Reverts the most recent tracked change. No-op if nothing to undo. */
  undo(): void;
  /** Re-applies the most recently undone change. No-op if nothing to redo. */
  redo(): void;
  /** Whether there is a change available to undo. */
  canUndo: boolean;
  /** Whether there is a change available to redo. */
  canRedo: boolean;
}

/**
 * Hook that provides undo/redo for a specific Orbit-managed key.
 *
 * Creates a Yjs UndoManager scoped to one Y type, so undo/redo only affects
 * that key rather than the entire document. Operations within 500ms are
 * grouped into a single undo step.
 *
 * @param key - The Orbit key to manage undo history for
 * @param scope - Which Yjs type the key maps to (default: 'text')
 * @returns Undo/redo controls and availability flags
 *
 * @example
 * ```typescript
 * function TextEditor() {
 *   const [content, setContent] = useOrbitText('doc', '');
 *   const { undo, redo, canUndo, canRedo } = useOrbitUndoManager('doc', 'text');
 *
 *   return (
 *     <>
 *       <button onClick={undo} disabled={!canUndo}>Undo</button>
 *       <button onClick={redo} disabled={!canRedo}>Redo</button>
 *       <textarea value={content} onChange={e => setContent(e.target.value)} />
 *     </>
 *   );
 * }
 * ```
 */
export function useOrbitUndoManager(
  key: string,
  scope: UndoScope = 'text'
): UndoManagerResult {
  const store = useOrbitStore();

  const ytype = useMemo(() => {
    if (scope === 'text') return store.getText(key);
    if (scope === 'array') return store.getArray(key);
    return store.getMap(key);
  }, [store, key, scope]);

  const manager = useMemo(
    () => new Y.UndoManager(ytype as Y.AbstractType<unknown>, { captureTimeout: 500 }),
    [ytype]
  );

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const update = () => {
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
    };

    manager.on('stack-item-added', update);
    manager.on('stack-item-popped', update);
    manager.on('stack-cleared', update);

    return () => {
      manager.off('stack-item-added', update);
      manager.off('stack-item-popped', update);
      manager.off('stack-cleared', update);
      manager.destroy();
    };
  }, [manager]);

  const undo = useCallback(() => {
    manager.undo();
  }, [manager]);

  const redo = useCallback(() => {
    manager.redo();
  }, [manager]);

  return { undo, redo, canUndo, canRedo };
}
