import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { OrbitStore } from "../../src/core/store.ts";
import { IndexedDBAdapter } from "../../src/core/storage/indexeddb-adapter.ts";

describe("TabSync", () => {
  let store1: OrbitStore;
  let store2: OrbitStore;
  let storage: IndexedDBAdapter;

  beforeEach(() => {
    storage = new IndexedDBAdapter();
  });

  afterEach(async () => {
    if (store1) {
      await store1.dispose();
    }
    if (store2) {
      await store2.dispose();
    }
    await storage.dispose();
  });

  it("should initialize tab sync by default", async () => {
    store1 = new OrbitStore({
      storeId: "test-1",
    });
    await store1.init();

    expect(store1).toBeDefined();
  });

  it("should not initialize tab sync when disabled", async () => {
    store1 = new OrbitStore({
      storeId: "test-2",
      enableTabSync: false,
    });
    await store1.init();

    expect(store1).toBeDefined();
  });

  it("should sync updates between two stores with same storeId", async () => {
    const storeId = "test-sync-1";

    store1 = new OrbitStore({ storeId });
    store2 = new OrbitStore({ storeId });

    await store1.init();
    await store2.init();

    const map1 = store1.getMap("data");
    map1.set("key", "value");

    await new Promise((resolve) => setTimeout(resolve, 50));

    const map2 = store2.getMap("data");
    expect(map2.get("key")).toBe("value");
  });

  it("should not sync updates between stores with different storeIds", async () => {
    store1 = new OrbitStore({ storeId: "store-a" });
    store2 = new OrbitStore({ storeId: "store-b" });

    await store1.init();
    await store2.init();

    const map1 = store1.getMap("data");
    map1.set("key", "value1");

    await new Promise((resolve) => setTimeout(resolve, 50));

    const map2 = store2.getMap("data");
    expect(map2.get("key")).toBeUndefined();
  });

  it("should sync text updates between stores", async () => {
    const storeId = "test-sync-text";

    store1 = new OrbitStore({ storeId });
    store2 = new OrbitStore({ storeId });

    await store1.init();
    await store2.init();

    const text1 = store1.getText("content");
    text1.insert(0, "hello");

    await new Promise((resolve) => setTimeout(resolve, 50));

    const text2 = store2.getText("content");
    expect(text2.toString()).toBe("hello");
  });

  it("should handle bidirectional sync", async () => {
    const storeId = "test-bidirectional";

    store1 = new OrbitStore({ storeId });
    store2 = new OrbitStore({ storeId });

    await store1.init();
    await store2.init();

    const map1 = store1.getMap("data");
    const map2 = store2.getMap("data");

    map1.set("from-store1", "value1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    map2.set("from-store2", "value2");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(map1.get("from-store2")).toBe("value2");
    expect(map2.get("from-store1")).toBe("value1");
  });

  it("should clean up tab sync on dispose", async () => {
    store1 = new OrbitStore({ storeId: "test-cleanup" });
    await store1.init();

    const map = store1.getMap("data");
    map.set("key", "value");

    await expect(store1.dispose()).resolves.toBeUndefined();
  });

  it("should work with storage and tab sync together", async () => {
    const storeId = "test-storage-sync";

    store1 = new OrbitStore({
      storeId,
      storage,
      persistDebounceMs: 50,
    });
    store2 = new OrbitStore({
      storeId,
      storage,
    });

    await store1.init();
    await store2.init();

    const map1 = store1.getMap("data");
    map1.set("key", "value");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const map2 = store2.getMap("data");
    expect(map2.get("key")).toBe("value");

    await store1.dispose();
    await store2.dispose();

    const store3 = new OrbitStore({
      storeId,
      storage,
    });
    await store3.init();

    const map3 = store3.getMap("data");
    expect(map3.get("key")).toBe("value");

    await store3.dispose();
  });
});
