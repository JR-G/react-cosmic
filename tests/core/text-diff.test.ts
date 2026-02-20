import { describe, it, expect } from "vitest";
import { computeTextDiff } from "../../src/core/text-diff.ts";

describe("computeTextDiff", () => {
  it("should return zero prefix/suffix for identical strings", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("hello", "hello");
    expect(commonPrefix).toBe(5);
    expect(commonSuffix).toBe(0);
  });

  it("should detect a pure insertion in the middle", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("Hello World", "Hello Orbit World");
    expect(commonPrefix).toBe(6);
    expect(commonSuffix).toBe(5);
  });

  it("should detect a pure deletion in the middle", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("Hello Orbit World", "Hello World");
    expect(commonPrefix).toBe(6);
    expect(commonSuffix).toBe(5);
  });

  it("should detect a pure suffix insertion", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("Hello", "Hello!");
    expect(commonPrefix).toBe(5);
    expect(commonSuffix).toBe(0);
  });

  it("should detect a pure prefix insertion", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("World", "Hello World");
    expect(commonPrefix).toBe(0);
    expect(commonSuffix).toBe(5);
  });

  it("should handle empty old string", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("", "hello");
    expect(commonPrefix).toBe(0);
    expect(commonSuffix).toBe(0);
  });

  it("should handle empty new string", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("hello", "");
    expect(commonPrefix).toBe(0);
    expect(commonSuffix).toBe(0);
  });

  it("should handle complete replacement", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("abc", "xyz");
    expect(commonPrefix).toBe(0);
    expect(commonSuffix).toBe(0);
  });

  it("should handle single character change", () => {
    const { commonPrefix, commonSuffix } = computeTextDiff("cat", "bat");
    expect(commonPrefix).toBe(0);
    expect(commonSuffix).toBe(2);
  });

  it("should produce correct delete/insert bounds for middle replacement", () => {
    const oldText = "Hello World";
    const newText = "Hello Orbit World";
    const { commonPrefix, commonSuffix } = computeTextDiff(oldText, newText);

    const deleteCount = oldText.length - commonPrefix - commonSuffix;
    const insertText = newText.slice(commonPrefix, newText.length - commonSuffix);

    expect(deleteCount).toBe(0);
    expect(insertText).toBe("Orbit ");
  });
});
