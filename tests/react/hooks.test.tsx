import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import React from "react";
import { OrbitProvider } from "../../src/react/provider.tsx";
import { useOrbit } from "../../src/react/useOrbit.ts";
import { useOrbitText } from "../../src/react/useOrbitText.ts";
import { useOrbitObject } from "../../src/react/useOrbitObject.ts";

describe("React Hooks", () => {
  describe("useOrbit", () => {
    it("should initialize with default value", async () => {
      function TestComponent() {
        const [count] = useOrbit("count", 0);
        return <div>Count: {count}</div>;
      }

      render(
        <OrbitProvider storeId="test-1">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Count: 0")).toBeInTheDocument();
      });
    });

    it("should update value", async () => {
      function TestComponent() {
        const [count, setCount] = useOrbit("count", 0);
        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
          </div>
        );
      }

      render(
        <OrbitProvider storeId="test-2">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Count: 0")).toBeInTheDocument();
      });

      const button = screen.getByText("Increment");
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Count: 1")).toBeInTheDocument();
      });
    });

    it("should share state between components", async () => {
      function ComponentA() {
        const [name, setName] = useOrbit("name", "");
        return (
          <div>
            <div>A: {name}</div>
            <button onClick={() => setName("Alice")}>Set Name</button>
          </div>
        );
      }

      function ComponentB() {
        const [name] = useOrbit("name", "");
        return <div>B: {name}</div>;
      }

      render(
        <OrbitProvider storeId="test-3">
          <ComponentA />
          <ComponentB />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("A:")).toBeInTheDocument();
        expect(screen.getByText("B:")).toBeInTheDocument();
      });

      const button = screen.getByText("Set Name");
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("A: Alice")).toBeInTheDocument();
        expect(screen.getByText("B: Alice")).toBeInTheDocument();
      });
    });
  });

  describe("useOrbitText", () => {
    it("should initialize with default text", async () => {
      function TestComponent() {
        const [text] = useOrbitText("content", "Hello");
        return <div>Text: {text}</div>;
      }

      render(
        <OrbitProvider storeId="test-4">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Text: Hello")).toBeInTheDocument();
      });
    });

    it("should update text", async () => {
      function TestComponent() {
        const [text, setText] = useOrbitText("content", "");
        return (
          <div>
            <div>Text: {text}</div>
            <button onClick={() => setText("Updated")}>Update</button>
          </div>
        );
      }

      render(
        <OrbitProvider storeId="test-5">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Text:")).toBeInTheDocument();
      });

      const button = screen.getByText("Update");
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Text: Updated")).toBeInTheDocument();
      });
    });
  });

  describe("useOrbitObject", () => {
    interface TestObject {
      name: string;
      age: number;
    }

    it("should initialize with default object", async () => {
      function TestComponent() {
        const [user] = useOrbitObject<TestObject>("user", {
          name: "Bob",
          age: 30,
        });
        return (
          <div>
            Name: {user.name}, Age: {user.age}
          </div>
        );
      }

      render(
        <OrbitProvider storeId="test-6">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Name: Bob, Age: 30")).toBeInTheDocument();
      });
    });

    it("should update partial object", async () => {
      function TestComponent() {
        const [user, updateUser] = useOrbitObject<TestObject>("user", {
          name: "Bob",
          age: 30,
        });
        return (
          <div>
            <div>
              Name: {user.name}, Age: {user.age}
            </div>
            <button onClick={() => updateUser({ age: 31 })}>
              Increment Age
            </button>
          </div>
        );
      }

      render(
        <OrbitProvider storeId="test-7">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Name: Bob, Age: 30")).toBeInTheDocument();
      });

      const button = screen.getByText("Increment Age");
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Name: Bob, Age: 31")).toBeInTheDocument();
      });
    });

    it("should handle multiple property updates", async () => {
      function TestComponent() {
        const [user, updateUser] = useOrbitObject<TestObject>("user", {
          name: "",
          age: 0,
        });
        return (
          <div>
            <div>
              Name: {user.name}, Age: {user.age}
            </div>
            <button onClick={() => updateUser({ name: "Charlie", age: 25 })}>
              Update Both
            </button>
          </div>
        );
      }

      render(
        <OrbitProvider storeId="test-8">
          <TestComponent />
        </OrbitProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Name: , Age: 0")).toBeInTheDocument();
      });

      const button = screen.getByText("Update Both");
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Name: Charlie, Age: 25")).toBeInTheDocument();
      });
    });
  });
});
