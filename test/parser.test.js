import { describe, it } from "node:test";
import { ok, deepEqual, throws } from "node:assert/strict";
import parse from "../src/parser.js";

describe("Parser", () => {
  it("parses correctly", () => {
    ok(parse("p 69420").succeeded());
    ok(parse("p 2").succeeded());
    ok(parse("x: 1").succeeded());
    ok(parse("p a").succeeded());
  });
  it("throws on syntax errors", () => {
    throws(() => parse("print 1 ,adf;"));
    throws(() => parse("sdkjfhsdjklfhs"));
    throws(() => parse("for i in range(x):"));
  });
});
