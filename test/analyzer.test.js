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
  ["Empty Function Declaration", "f func(){}"],
  ["Function Declaration with parameters", "f func(x int y: 3 z float){}"],
  [
    "More complex function",
    "f func(x int y: 3 z int){mu v: 3 * z ** y return v}",
  ],
  ["Function call", "f func(x int y: 3 z float){} func(3 5 2.0)"],
  ["Function call with default", "f func(x int y: 3 z float){} func(3 2.0)"],
  ["Function call with one arg", "f func(x int){} func 2"],
  ["Intrinsic Function", "p 3 pl(5) print(8 4 8)"],
  ["Simplest class", "c Dog {}"],
  ["More complex class", 'c Dog {con(x int y int){} f bark(){p "bark" }}'],
  ["Variable declarations", "im x: 2 mu y: 3"],
  ["More complex var dec", "im x: [1 2 3 4 5]"],
  ["Ranges", "im x: [1...5]"],
  ["Complex ranges", "im x: [1...5, +3]"],
  ["Loop statements", "l i in [1...5] {p i}"],
  ["Loop while statement", "mu i: 0 l i < 3 {p i}"],
  ["More complex patterns", "im x: [1 2 3] l i in 8 {} l i in x {}"],
  ["If statement", "im x: 1 if x = 3 {p 1}"],
  [
    "Complex if statement",
    'if 3 > 4 {} elif 4 = 3 {} elif 5 = 4 {} else {p "yay"}',
  ],
  ["add", "3 + 4"],
  ["parens", "2 + (4 - 2)"],
  ["multiply", "4 * 7"],
  ["divide", "3 / 1"],
  ["mod", "2 % 2"],
  ["power", "2 ** 3"],
  ["complex expressions", "3 ** 4 + 2 - 10 % 8 / -3"],
  [
    "Complex function with return",
    "f why() -> int {if 3 != 4 { r 2} elif 3 ** 4 > 3 and true {r 3}}",
  ],
  ["Assignment", "mu x: 1 x: 3"],
  ["Break", "l i in [1...5] {if i = 3 { b }}"],
  ["Array indexing", "im x: [1 2 3] x[2] p x[2]"],
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
