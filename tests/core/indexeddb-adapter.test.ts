import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IndexedDBAdapter } from "../../src/core/storage/indexeddb-adapter.ts";

describe("IndexedDBAdapter", () => {
  let adapter: IndexedDBAdapter;

  beforeEach(() => {
    adapter = new IndexedDBAdapter();
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  it("should return null for non-existent document", async () => {
    const result = await adapter.load("non-existent-doc");
    expect(result).toBeNull();
  });

  it("should save and load document state", async () => {
    const documentId = "test-doc-1";
    const state = new Uint8Array([1, 2, 3, 4, 5]);

    await adapter.save(documentId, state);
    const loaded = await adapter.load(documentId);

    expect(loaded).toEqual(state);
  });

  it("should overwrite existing document state", async () => {
    const documentId = "test-doc-2";
    const initialState = new Uint8Array([1, 2, 3]);
    const updatedState = new Uint8Array([4, 5, 6, 7]);

    await adapter.save(documentId, initialState);
    await adapter.save(documentId, updatedState);
    const loaded = await adapter.load(documentId);

    expect(loaded).toEqual(updatedState);
  });

  it("should delete document state", async () => {
    const documentId = "test-doc-3";
    const state = new Uint8Array([1, 2, 3]);

    await adapter.save(documentId, state);
    await adapter.delete(documentId);
    const loaded = await adapter.load(documentId);

    expect(loaded).toBeNull();
  });

  it("should handle deleting non-existent document", async () => {
    await expect(adapter.delete("non-existent-doc")).resolves.toBeUndefined();
  });

  it("should handle multiple documents independently", async () => {
    const doc1Id = "doc-1";
    const doc2Id = "doc-2";
    const state1 = new Uint8Array([1, 2, 3]);
    const state2 = new Uint8Array([4, 5, 6]);

    await adapter.save(doc1Id, state1);
    await adapter.save(doc2Id, state2);

    const loaded1 = await adapter.load(doc1Id);
    const loaded2 = await adapter.load(doc2Id);

    expect(loaded1).toEqual(state1);
    expect(loaded2).toEqual(state2);
  });

  it("should handle empty state", async () => {
    const documentId = "empty-doc";
    const emptyState = new Uint8Array([]);

    await adapter.save(documentId, emptyState);
    const loaded = await adapter.load(documentId);

    expect(loaded).toEqual(emptyState);
  });

  it("should handle large state data", async () => {
    const documentId = "large-doc";
    const largeState = new Uint8Array(10000).map((_, i) => i % 256);

    await adapter.save(documentId, largeState);
    const loaded = await adapter.load(documentId);

    expect(loaded).toEqual(largeState);
  });

  it("should allow reuse after dispose", async () => {
    const documentId = "test-doc-reuse";
    const state = new Uint8Array([1, 2, 3]);

    await adapter.save(documentId, state);
    await adapter.dispose();

    const newState = new Uint8Array([4, 5, 6]);
    await adapter.save(documentId, newState);
    const loaded = await adapter.load(documentId);

    expect(loaded).toEqual(newState);
  });

  it("should handle concurrent operations", async () => {
    const promises = Array.from({ length: 10 }, (_, i) => {
      const docId = `concurrent-doc-${i}`;
      const state = new Uint8Array([i]);
      return adapter.save(docId, state);
    });

    await Promise.all(promises);

    const loadPromises = Array.from({ length: 10 }, (_, i) =>
      adapter.load(`concurrent-doc-${i}`)
    );
    const results = await Promise.all(loadPromises);

    results.forEach((result, i) => {
      expect(result).toEqual(new Uint8Array([i]));
    });
  });
});
