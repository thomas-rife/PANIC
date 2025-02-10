import { describe, it } from "node:test";
import { ok, deepEqual, throws } from "node:assert/strict";
import parse from "../src/parser.js";

describe("Interpreter", () => {
  it("parses correctly", () => {
    ok(parse("print 1;").succeeded());
    ok(parse("let x = 1;").succeeded());
    ok(parse("x = 1;").succeeded());
    ok(parse("while x < 10 { x = x < 7 + 1; break; }").succeeded());
  });
  it("throws on syntax errors", () => {
    throws(() => parse("print 1"), /Expected/);
    throws(() => parse("sdkjfhsdjklfhs"), /Expected/);
    throws(() => parse("print -2**2;"), /Expected/);
  });
});
