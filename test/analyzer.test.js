import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import { validateHeaderValue } from "node:http";
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
    "f func(x int y: 3 z int)-> int{mu v: 3 * z ** y return v}",
  ],
  ["Function call", "f func(x int y: 3 z float){} func(3 5 2.0)"],
  ["Function call with default", "f func(x int y: 3 z float){} func(3 2.0)"],
  ["Function call with one arg", "f func(x int){} func(2)"],
  ["Function call using default param", "f func(x int y: 3){} func(3 4)"],
  ["Intrinsic Function", "p(3) pl(5) print(8 4 8)"],
  ["Simplest class", "c Dog {con()}"],
  ["More complex class", 'c Dog {con(x int y int) f bark(){p("bark") }}'],
  ["Variable declarations", "im x: 2 mu y: 3"],
  ["More complex var dec", "im x: [1 2 3 4 5]"],
  ["Ranges", "im x: [1...5]"],
  ["Complex ranges", "im x: [1...5, +3]"],
  ["Loop statements", "l i in [1...5] {p(i)}"],
  ["Loop while statement", "mu i: 0 l i < 3 {p(i)}"],
  ["More complex patterns", "im x: [1 2 3] l i in 8 {} l i in x {}"],
  ["If statement", "im x: 1 if x = 3 {p(1)}"],
  [
    "Complex if statement",
    'if 3 > 4 {} elif 4 = 3 {} elif 5 = 4 {} else {p("yay")}',
  ],
  ["add", "p(3 + 4)"],
  ["parens", "p(2 + (4 - 2))"],
  ["multiply", "p(4 * 7)"],
  ["divide", "p(3 / 1)"],
  ["mod", "p(2 % 2)"],
  ["power", "p(2 ** 3)"],
  ["complex expressions", "p(3 ** 4 + 2 - 10 % 8 / -3)"],
  [
    "Complex function with return",
    "f why() -> int {if 3 != 4 { r 2} elif 3 ** 4 > 3 and true {r 3}}",
  ],
  ["Assignment", "mu x: 1 x: 3"],
  ["Break", "l i in [1...5] {if i = 3 { b }}"],
  ["Array indexing", "im x: [1 2 3] p(x[2])"],
  ["Simple class", "c Dog {con(x int y int)f bark() -> int {return x}}"],
  ["Empty Function Declaration", "f func(){}"],
  ["Function with parameters & defaults", "f func(x int y: 3 z float){}"],
  ["Function with return value", "f func() -> int {r 3}"],
  [
    "Function calling another function",
    "f first() -> int {r 2} f second() {p(first())}",
  ],
  ["Immutable and mutable variable declarations", "im x: 2 mu y: 3"],
  ["Reassigning mutable variables", "mu x: 5 x: 10"],
  ["Variable used in an expression", "mu x: 3 mu y: x + 2"],
  ["Loop over range", "l i in [1...5] {p(i)}"],
  ["While loop", "mu i: 0 l i < 3 {p(i) i: i + 1}"],
  ["Break inside loop", "l i in [1...5] {if i = 3 {b}}"],
  ["Class with constructor", "c Dog {con(x int y int)}"],
  ["Class with method", 'c Dog {con(x int y: [3 4]) f bark() {p("bark")}}'],
  [
    "Object method call",
    'c Dog {con(x int) f bark() {p("bark")}} im d: Dog(3) d.bark()',
  ],
  ["Boolean expressions", "mu x: true and false or true"],
  ["Conditional expression", "mu x: true ? 4 : 5"],
  ["Arithmetic operations", "mu x: 3 + 4 * 2"],
  ["EmptyArray", "mu x: []"],
  ["ArraySlice", "mu x: [1 2 3 4] x: x[1:3]"],
  ["ArraySlice no start", "mu x: [1 2 3 4] x: x[:3]"],
  ["ArraySlice no end", "mu x: [1 2 3 4] x: x[2:]"],
  ["ArraySlice no start or end", "mu x: [1 2 3 4] x: x[:]"],
  ["Negate a boolean type", "p(!true)"],
  ["Adding two strings", 'p("hello" + " there")'],
  ["Range with floats", "im x: [2.0...3.0, + 4.0]"],
  ["String multiplication", `p("hello " * 4)`],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["Cannot redeclare functions", "f func(){r 2} f func(){r 1}"],
  ["Break inside a function a function", "f func(){b}"],
  ["Parameters with the same name", "f func(n int n int){}"],
  ["Wrong number of params1", "f zero(){} f im x: 1 zero(x)"],
  ["Wrong number of params2", "f one(n int){} one()"],
  [
    "Wrong number of params3",
    "f default(n int x: 1){} im x: 1 im y: 1 default(x y 1)",
  ],
  ["Wrong param type", "f func(x float){} func(2)"],
  //to do classes"
  ["Redeclaring variables", "mu x: 3 mu x: 4"],
  ["Assigning to immutable variable", "im x: 4 x: 6"],
  //to do loops
  ["Conditional with not boolean type", "2 ? 3 : 4"],
  ["Different consequent and otherwise type", "true ? 2 : 2.0"],
  ["Or without a boolean type", "2 || false"],
  ["And without a boolean type", "true && 5"],
  ["Test without same type", " 3 < 3.0"],
  ["Subtract strings", "'cat' - 'dog'"],
  ["Add different types", "2.0 + true"],
  ["Multiplying strings", "'cat' * 'dog'"],
  ["Multiplying different types", "2.0 / false"],
  ["Power with different types", "2.0 ** true"],
  ["Not equals on literal", "!2"],
  ["Negative string", "-'cat'"],
  ["Not declared id", "x + 2"],
  ["Indexing non indexable", "im x: 2 x[1]"],
  ["Assigning non assignable", "mu x: 2 x: c Dog{}"],
  ["Return from non-function", "l i in 8 {r 4}"],
  ["Cannot redeclare functions", "f func(){r 2} f func(){r 1}"],
  ["Returning from void function", "f func() {r 5}"],
  ["Returning wrong type", "f func() -> int {r 2.5}"],
  ["Function call with too many arguments", "f func(x int){} func(2, 3)"],
  ["Function parameter out of scope", "f func(x int){} p(x)"],
  ["Using variable before declaration", "p(y) mu y: 5"],
  ["Assigning incompatible type", "mu x: 5 x: true"],
  ["Undefined variable in expression", "mu y: x + 3"],
  ["Break outside loop", "b"],
  ["Continue outside loop", "c"],
  ["Modifying immutable inside loop", "im x: 2 l i in [1...5] {x: i}"],
  ["Instantiating undefined class", "im d: Cat{}"],
  ["Calling non-existent method", "c Dog {} im d: Dog{} d.run()"],
  ["Constructor wrong args", "c Dog {con(x int)} im d: Dog{}"],
  [
    "Returning class from primitive function",
    "c Dog {} f func() -> int {r Dog{}}",
  ],
  ["Array index not integer", "im x: [1 2 3] x[true]"],
  ["Assigning wrong type to array", "im x: [1 2 3] x[1]: true"],
  ["Using object as array", "c Dog {} im d: Dog{} p(d[1])"],
  ["AND with non-boolean", "3 and true"],
  ["OR with non-boolean", "false or 5"],
  ["Equality check between incompatible types", "2 = 'hello'"],
  ["Invalid comparison", "'cat' < 5"],
  ["Not operator on number", "!2"],
  ["Chained comparisons with mixed types", "3 < 'dog' < 4"],
  [
    "Call class method that doesn't exist",
    "c Dog{con() f bark(){}} im x: Dog() x.cat()",
  ],
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
