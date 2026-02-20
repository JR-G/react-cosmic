import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { OrbitProvider } from "../../src/react/provider.tsx";
import { useOrbitArray } from "../../src/react/useOrbitArray.ts";

describe("useOrbitArray", () => {
  it("should initialise with an empty array", async () => {
    function TestComponent() {
      const [items] = useOrbitArray<string>("items", []);
      return <div>Count: {items.length}</div>;
    }

    render(
      <OrbitProvider storeId="array-test-1">
        <TestComponent />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 0")).toBeInTheDocument();
    });
  });

  it("should initialise with provided items", async () => {
    function TestComponent() {
      const [items] = useOrbitArray<string>("items", ["a", "b", "c"]);
      return <div>Count: {items.length}</div>;
    }

    render(
      <OrbitProvider storeId="array-test-2">
        <TestComponent />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 3")).toBeInTheDocument();
    });
  });

  it("should push items", async () => {
    function TestComponent() {
      const [items, { push }] = useOrbitArray<string>("items", []);
      return (
        <div>
          <div>Count: {items.length}</div>
          <button onClick={() => push("new item")}>Add</button>
        </div>
      );
    }

    render(
      <OrbitProvider storeId="array-test-3">
        <TestComponent />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 0")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Add").click();
    });

    await waitFor(() => {
      expect(screen.getByText("Count: 1")).toBeInTheDocument();
    });
  });

  it("should remove items by index", async () => {
    function TestComponent() {
      const [items, { remove }] = useOrbitArray<string>("items", ["a", "b", "c"]);
      return (
        <div>
          <div>{items.join(",")}</div>
          <button onClick={() => remove(1)}>Remove middle</button>
        </div>
      );
    }

    render(
      <OrbitProvider storeId="array-test-4">
        <TestComponent />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("a,b,c")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Remove middle").click();
    });

    await waitFor(() => {
      expect(screen.getByText("a,c")).toBeInTheDocument();
    });
  });

  it("should insert items at a specific index", async () => {
    function TestComponent() {
      const [items, { insert }] = useOrbitArray<string>("items", ["a", "c"]);
      return (
        <div>
          <div>{items.join(",")}</div>
          <button onClick={() => insert(1, "b")}>Insert b</button>
        </div>
      );
    }

    render(
      <OrbitProvider storeId="array-test-5">
        <TestComponent />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("a,c")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Insert b").click();
    });

    await waitFor(() => {
      expect(screen.getByText("a,b,c")).toBeInTheDocument();
    });
  });

  it("should clear all items", async () => {
    function TestComponent() {
      const [items, { clear }] = useOrbitArray<string>("items", ["a", "b", "c"]);
      return (
        <div>
          <div>Count: {items.length}</div>
          <button onClick={clear}>Clear</button>
        </div>
      );
    }

    render(
      <OrbitProvider storeId="array-test-6">
        <TestComponent />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 3")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Clear").click();
    });

    await waitFor(() => {
      expect(screen.getByText("Count: 0")).toBeInTheDocument();
    });
  });

  it("should share array state between components", async () => {
    function Writer() {
      const [, { push }] = useOrbitArray<string>("shared-items", []);
      return <button onClick={() => push("item")}>Add</button>;
    }

    function Reader() {
      const [items] = useOrbitArray<string>("shared-items", []);
      return <div>Count: {items.length}</div>;
    }

    render(
      <OrbitProvider storeId="array-test-7">
        <Writer />
        <Reader />
      </OrbitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 0")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Add").click();
    });

    await waitFor(() => {
      expect(screen.getByText("Count: 1")).toBeInTheDocument();
    });
  });
});
