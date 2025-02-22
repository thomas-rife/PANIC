import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

describe("The project setup", () => {
  it("can invoke the parser without errors", () => {
    const sourceCode = "1 = 1";
    const match = parse(sourceCode);
    assert.ok(match.succeeded(), "Parser should succeed on valid input");
  });
});
