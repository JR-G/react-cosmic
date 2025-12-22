import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrbitStatus } from "../../src/react/collaboration/useOrbitStatus.ts";
import { useOrbitAwareness } from "../../src/react/collaboration/useOrbitAwareness.ts";

vi.mock("../../src/react/provider.tsx", () => ({
    useOrbitStore: () => mockStore
}));

let mockStore: any;
let mockProvider: any;
let statusCallbacks: Array<() => void> = [];

describe("Collaboration Hooks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        statusCallbacks = [];

        mockProvider = {
            wsconnected: false,
            wsconnecting: true,
            awareness: {
                getStates: vi.fn().mockReturnValue(new Map()),
                on: vi.fn(),
                off: vi.fn(),
                clientID: 123
            }
        };

        mockStore = {
            getWebSocketProvider: vi.fn().mockReturnValue(mockProvider),
            onStatusChange: vi.fn((cb) => statusCallbacks.push(cb)),
            offStatusChange: vi.fn(),
        };
    });

    it("useOrbitStatus should reflect connection state", () => {
        const { result } = renderHook(() => useOrbitStatus());

        expect(result.current).toBe("connecting");

        act(() => {
            mockProvider.wsconnected = true;
            mockProvider.wsconnecting = false;
            statusCallbacks.forEach(cb => cb());
        });
        expect(result.current).toBe("connected");

        act(() => {
            mockProvider.wsconnected = false;
            mockProvider.wsconnecting = false;
            statusCallbacks.forEach(cb => cb());
        });
        expect(result.current).toBe("disconnected");
    });

    it("useOrbitAwareness should track remote states", () => {
        const remoteStates = new Map([
            [1, { user: { name: "Alice" } }],
            [2, { user: { name: "Bob" } }]
        ]);
        mockProvider.awareness.getStates.mockReturnValue(remoteStates);

        let awarenessCallback: any;
        mockProvider.awareness.on.mockImplementation((name: string, cb: any) => {
            if (name === "change") awarenessCallback = cb;
        });

        const { result } = renderHook(() => useOrbitAwareness());

        expect(result.current.size).toBe(2);
        expect(result.current.get(1).user.name).toBe("Alice");

        act(() => {
            remoteStates.set(3, { user: { name: "Charlie" } });
            if (awarenessCallback) awarenessCallback();
        });

        expect(result.current.size).toBe(3);
        expect(result.current.get(3).user.name).toBe("Charlie");
    });

    it("useOrbitAwareness should support selectors", () => {
        const remoteStates = new Map([
            [1, { user: { name: "Alice" } }],
            [2, { user: { name: "Bob" } }]
        ]);
        mockProvider.awareness.getStates.mockReturnValue(remoteStates);

        let awarenessCallback: any;
        mockProvider.awareness.on.mockImplementation((name: string, cb: any) => {
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
