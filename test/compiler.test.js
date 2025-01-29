import { describe, it } from "node:assert";
import { deepEqual } from "node:assert/strict";
import { parse } from "../src/bat";

describe("Interpreter", () => {
  it("Parses correctly", () => {
    deepEqual(parse(), "I do not work");
  });
});
