import { describe, it } from "node:test";
import { deepEqual } from "node:assert/strict";
import { parse } from "../src/panic.js";

describe("Interpreter", () => {
  it("Parses correctly", () => {
    deepEqual(parse(), "I do not work");
  });
});
