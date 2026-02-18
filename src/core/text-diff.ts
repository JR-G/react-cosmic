/**
 * Computes the minimal prefix/suffix diff between two strings.
 *
 * Finds the longest common prefix and suffix so that only the changed middle
 * section needs to be replaced. This allows Yjs to record a precise insert/delete
 * transaction rather than replacing the entire string, which is essential for
 * correct CRDT conflict resolution under concurrent edits.
 *
 * @param oldText - The original string
 * @param newText - The target string
 * @returns The lengths of the common prefix and suffix
 */
export function computeTextDiff(
  oldText: string,
  newText: string
): { commonPrefix: number; commonSuffix: number } {
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
    oldText[oldText.length - 1 - commonSuffix] === newText[newText.length - 1 - commonSuffix]
  ) {
    commonSuffix++;
  }

  return { commonPrefix, commonSuffix };
}
