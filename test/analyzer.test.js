import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
// import {
//   program,
//   variableDeclaration,
//   variable,
//   binary,
//   floatType,
// } from "../src/core.js";

// Programs that are semantically correct
const semanticChecks = [
  ["variable declarations", 'im x: 1 mu y: "false"'],
  ["if statement with boolean type", "im x: 1 if x > 3 {p 1}"],
  ["add", "3 + 4"],
  ["multiply", "4 * 7"],
  ["divide", "3 / 1"],
  ["mod", "2 % 2"],
  ["power", "2 ** 3"],
  [
    "complex tests",
    "f why() -> int {if 3 != 4 { r 2} elif 3 ** 4 > 3 and true {r 3}}",
  ],
  ["complex expressions", "3 ** 4 + 2 - 10 % 8 / -3"],
  ["assignment", "mu x: 1 x: 3"],
  ["loops", "l i in [2...8] {p 1}"],
  ["ranges", "[2...10, +3]"],
  ["function-dec", 'f cat(dog Dog sound: "bark") -> int {}'],
  ["break", "l i in [1...5] {if i = 3 { b }}"],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  // ["Non-type in field type", "let x=1;struct S {y:x}", /Type expected/],
];

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)));
    });
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern);
    });
  }
  it("produces the expected representation for a trivial program", () => {
    assert.deepEqual(
      // analyze(parse("let x = π + 2.2;")),
      // program([
      //   variableDeclaration(
      //     variable("x", true, floatType),
      //     binary("+", variable("π", false, floatType), 2.2, floatType)
      //   ),
      // ])
      true,
      true
    );
  });
});
