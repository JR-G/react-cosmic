import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OrbitStore } from "../../src/core/store.ts";
import { IndexedDBAdapter } from "../../src/core/storage/indexeddb-adapter.ts";

describe("OrbitStore", () => {
  let store: OrbitStore;
  let storage: IndexedDBAdapter;

  beforeEach(() => {
    storage = new IndexedDBAdapter();
  });

  afterEach(async () => {
    if (store) {
      await store.dispose();
    }
    await storage.dispose();
  });

  it("should initialize without storage", async () => {
    store = new OrbitStore({ storeId: "test-1" });
    await store.init();
    expect(store.storeId).toBe("test-1");
  });

  it("should initialize with storage", async () => {
    store = new OrbitStore({
      storeId: "test-2",
      storage,
    });
    await store.init();
    expect(store.storeId).toBe("test-2");
  });

  it("should create and use a map", async () => {
    store = new OrbitStore({ storeId: "test-3" });
    await store.init();

    const map = store.getMap("data");
    map.set("key", "value");

    expect(map.get("key")).toBe("value");
  });

  it("should create and use text", async () => {
    store = new OrbitStore({ storeId: "test-4" });
    await store.init();

    const text = store.getText("content");
    text.insert(0, "hello");

    expect(text.toString()).toBe("hello");
  });

  it("should create and use an array", async () => {
    store = new OrbitStore({ storeId: "test-5" });
    await store.init();

    const array = store.getArray("items");
    array.push(["item1", "item2"]);

    expect(array.length).toBe(2);
    expect(array.get(0)).toBe("item1");
  });

  it("should persist state to storage", async () => {
    store = new OrbitStore({
      storeId: "test-6",
      storage,
      persistDebounceMs: 50,
    });
    await store.init();

    const map = store.getMap("data");
    map.set("key", "value");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const newStore = new OrbitStore({
      storeId: "test-6",
      storage,
    });
    await newStore.init();

    const loadedMap = newStore.getMap("data");
    expect(loadedMap.get("key")).toBe("value");

    await newStore.dispose();
  });

  it("should load existing state on init", async () => {
    const storeId = "test-7";

    const firstStore = new OrbitStore({
      storeId,
      storage,
    });
    await firstStore.init();

    const map = firstStore.getMap("data");
    map.set("persisted", "yes");
    await firstStore.persist();
    await firstStore.dispose();

    store = new OrbitStore({
      storeId,
      storage,
    });
    await store.init();

    const loadedMap = store.getMap("data");
    expect(loadedMap.get("persisted")).toBe("yes");
  });

  it("should debounce persist operations", async () => {
    const mockStorage = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    store = new OrbitStore({
      storeId: "test-8",
      storage: mockStorage,
      persistDebounceMs: 100,
    });
    await store.init();

    const map = store.getMap("data");
    map.set("key1", "value1");
    map.set("key2", "value2");
    map.set("key3", "value3");

    expect(mockStorage.save).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockStorage.save).toHaveBeenCalledTimes(1);
  });

  it("should persist immediately when calling persist()", async () => {
    const mockStorage = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    store = new OrbitStore({
      storeId: "test-9",
      storage: mockStorage,
    });
    await store.init();

    const map = store.getMap("data");
    map.set("key", "value");

    await store.persist();

    expect(mockStorage.save).toHaveBeenCalledTimes(1);
  });

  it("should allow multiple init calls without error", async () => {
    store = new OrbitStore({ storeId: "test-10" });
    await store.init();
    await store.init();
    await store.init();

    expect(store.storeId).toBe("test-10");
  });

  it("should handle dispose without storage", async () => {
    store = new OrbitStore({ storeId: "test-11" });
    await store.init();
    await expect(store.dispose()).resolves.toBeUndefined();
  });

  it("should flush pending updates on dispose", async () => {
    const mockStorage = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    store = new OrbitStore({
      storeId: "test-12",
      storage: mockStorage,
      persistDebounceMs: 1000,
    });
    await store.init();

    const map = store.getMap("data");
    map.set("key", "value");

    await store.dispose();

    expect(mockStorage.save).toHaveBeenCalled();
  });
});
