import { describe, it, expect } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { act } from "react";
import { OrbitProvider, useOrbit, useOrbitObject } from "../../src/index.ts";

describe("Performance Optimizations", () => {
    it("useOrbit should only re-render when its specific key changes", async () => {
        let rendersA = 0;
        let rendersB = 0;

        function ComponentA() {
            const [value] = useOrbit("keyA", "initialA");
            rendersA++;
            return <div>A: {value}</div>;
        }

        function ComponentB() {
            const [value] = useOrbit("keyB", "initialB");
            rendersB++;
            return <div>B: {value}</div>;
        }

        function Controller() {
            const [, setKeyA] = useOrbit<string>("keyA", "initialA");
            return <button onClick={() => setKeyA("newA")}>Update A</button>;
        }

        render(
            <OrbitProvider storeId="opt-test-1">
                <ComponentA />
                <ComponentB />
                <Controller />
            </OrbitProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("A: initialA")).toBeInTheDocument();
            expect(screen.getByText("B: initialB")).toBeInTheDocument();
        });

        // Initial renders (React might render twice in strict mode / during mount)
        const initialRendersA = rendersA;
        const initialRendersB = rendersB;

        const button = screen.getByText("Update A");
        await act(async () => {
            button.click();
        });

        await waitFor(() => {
            expect(screen.getByText("A: newA")).toBeInTheDocument();
        });

        // Component A must have re-rendered
        expect(rendersA).toBeGreaterThan(initialRendersA);
        // Component B must NOT have re-rendered extra times
        expect(rendersB).toBe(initialRendersB);
    });

    it("useOrbitObject should only re-render when its properties change", async () => {
        let rendersObj = 0;

        interface UserProfile {
            name: string;
            age: number;
            [key: string]: any;
        }

        function ObjectComponent() {
            const [user] = useOrbitObject<UserProfile>("user", { name: "Alice", age: 30 });
            rendersObj++;
            return <div>User: {user.name}</div>;
        }

        function OtherComponent() {
            const [, setOther] = useOrbit<string>("otherKey", "initial");
            return <button onClick={() => setOther("new")}>Update Other</button>;
        }

        render(
            <OrbitProvider storeId="opt-test-2">
                <ObjectComponent />
                <OtherComponent />
            </OrbitProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("User: Alice")).toBeInTheDocument();
        });

        const initialRenders = rendersObj;

        const button = screen.getByText("Update Other");
        await act(async () => {
            button.click();
        });

        // Wait a bit to ensure no async re-renders happen
        await new Promise(r => setTimeout(r, 50));

        // Component using useOrbitObject should NOT re-render for an unrelated key update
        // Note: This test assumes orbit-state is shared. In useOrbitObject, it creates a NEW map per key.
        // So it shouldn't even trigger.
        expect(rendersObj).toBe(initialRenders);
    });
});
