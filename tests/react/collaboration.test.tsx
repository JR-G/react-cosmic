import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrbitStatus } from "../../src/react/collaboration/useOrbitStatus.ts";
import { useOrbitAwareness } from "../../src/react/collaboration/useOrbitAwareness.ts";
import { useOrbitCircuit } from "../../src/react/collaboration/useOrbitCircuit.ts";

interface TestAwarenessState {
  user: { name: string };
}

interface MockAwareness {
  getStates: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  clientID: number;
}

interface MockProvider {
  awareness: MockAwareness;
}

type StatusListener = (status: 'connected' | 'connecting' | 'disconnected') => void;

interface MockStore {
  getWebSocketProvider(): MockProvider | undefined;
  getStatus(): 'connected' | 'connecting' | 'disconnected';
  isCircuitOpen(): boolean;
  onStatusChange(listener: StatusListener): void;
  offStatusChange(listener: StatusListener): void;
}

vi.mock("../../src/react/provider.tsx", () => ({
  useOrbitStore: () => mockStore
}));

let mockStore: MockStore;
let mockProvider: MockProvider;
let statusCallbacks: Array<StatusListener> = [];
let mockStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
let mockCircuitOpen = false;

describe("Collaboration Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusCallbacks = [];
    mockStatus = 'disconnected';
    mockCircuitOpen = false;

    mockProvider = {
      awareness: {
        getStates: vi.fn().mockReturnValue(new Map()),
        on: vi.fn(),
        off: vi.fn(),
        clientID: 123
      }
    };

    mockStore = {
      getWebSocketProvider: vi.fn().mockReturnValue(mockProvider),
      getStatus: vi.fn(() => mockStatus),
      isCircuitOpen: vi.fn(() => mockCircuitOpen),
      onStatusChange: vi.fn((cb: StatusListener) => statusCallbacks.push(cb)),
      offStatusChange: vi.fn((cb: StatusListener) => {
        const idx = statusCallbacks.indexOf(cb);
        if (idx !== -1) statusCallbacks.splice(idx, 1);
      }),
    };
  });

  describe("useOrbitStatus", () => {
    it("should reflect connection state changes from store events", () => {
      mockStatus = 'connecting';
      const { result } = renderHook(() => useOrbitStatus());

      expect(result.current).toBe("connecting");

      act(() => {
        mockStatus = 'connected';
        statusCallbacks.forEach(cb => cb('connected'));
      });
      expect(result.current).toBe("connected");

      act(() => {
        mockStatus = 'disconnected';
        statusCallbacks.forEach(cb => cb('disconnected'));
      });
      expect(result.current).toBe("disconnected");
    });

    it("should return disconnected when no WebSocket provider", () => {
      (mockStore.getWebSocketProvider as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      mockStatus = 'disconnected';

      const { result } = renderHook(() => useOrbitStatus());
      expect(result.current).toBe("disconnected");
    });
  });

  describe("useOrbitCircuit", () => {
    it("should return false when circuit is closed", () => {
      const { result } = renderHook(() => useOrbitCircuit());
      expect(result.current).toBe(false);
    });

    it("should return true when circuit trips", () => {
      const { result } = renderHook(() => useOrbitCircuit());

      act(() => {
        mockCircuitOpen = true;
        statusCallbacks.forEach(cb => cb('disconnected'));
      });

      expect(result.current).toBe(true);
    });
  });

  describe("useOrbitAwareness", () => {
    it("should track remote states", () => {
      const remoteStates = new Map([
        [1, { user: { name: "Alice" } }],
        [2, { user: { name: "Bob" } }]
      ]);
      mockProvider.awareness.getStates.mockReturnValue(remoteStates);

      let awarenessCallback: (() => void) | undefined;
      mockProvider.awareness.on.mockImplementation((name: string, cb: () => void) => {
        if (name === "change") awarenessCallback = cb;
      });

      const { result } = renderHook(() => useOrbitAwareness<TestAwarenessState>());

      expect(result.current.size).toBe(2);
      expect(result.current.get(1)?.user.name).toBe("Alice");

      act(() => {
        remoteStates.set(3, { user: { name: "Charlie" } });
        if (awarenessCallback) awarenessCallback();
      });

      expect(result.current.size).toBe(3);
      expect(result.current.get(3)?.user.name).toBe("Charlie");
    });

    it("should support selectors", () => {
      const remoteStates = new Map([
        [1, { user: { name: "Alice" } }],
        [2, { user: { name: "Bob" } }]
      ]);
      mockProvider.awareness.getStates.mockReturnValue(remoteStates);

      let awarenessCallback: (() => void) | undefined;
      mockProvider.awareness.on.mockImplementation((name: string, cb: () => void) => {
        if (name === "change") awarenessCallback = cb;
      });

      const { result } = renderHook(() => useOrbitAwareness(s => s.size));

      expect(result.current).toBe(2);

      act(() => {
        remoteStates.set(3, { user: { name: "Charlie" } });
        if (awarenessCallback) awarenessCallback();
      });

      expect(result.current).toBe(3);
    });
  });
});
