import { describe, it } from "node:test";
import { deepEqual } from "node:assert/strict";
import { parse } from "../src/cassowary.js";

describe("Interpreter", () => {
  it("parses correctly", () => {
    deepEqual(parse(), "I do not work");
  });
});
