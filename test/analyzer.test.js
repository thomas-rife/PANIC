import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import { validateHeaderValue } from "node:http";
import {
  program,
  variableDeclaration,
  variable,
  binary,
  floatType,
  intType,
} from "../src/core.js";

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
  ["Range with vars", `im x: 3 im y: [x...x, +2]`],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  [
    "Cannot redeclare functions",
    "f func(){r 2} f func(){r 1}",
    /Unable to return from a void function./,
  ],
  ["Break inside a function a function", "f func(){b}", /Must be in a loop./],
  [
    "Parameters with the same name",
    "f func(n int n int){}",
    /Param names must be unique./,
  ],
  [
    "Wrong number of params1",
    "f zero(){} f im x: 1 zero(x)",
    /Expected not a keyword/,
  ],
  [
    "Wrong number of params2",
    "f one(n int){} one()",
    /Expected 1 arguments, but 0 parameters were passed/,
  ],
  [
    "Wrong number of params3",
    "f default(n int x: 1){} im x: 1 im y: 1 default(x y 1)",
    /Expected between 1 and 2 arguments, but 3 parameters were passed/,
  ],
  [
    "Wrong param type",
    "f func(x float){} func(2)",
    /Type mismatch: expected float, got int/,
  ],
  //to do classes"
  ["Redeclaring variables", "mu x: 3 mu x: 4", /Already declared x./],
  [
    "Assigning to immutable variable",
    "im x: 4 x: 6",
    /Cannot read properties of undefined \(reading 'mutable'\)/,
  ],
  //to do loops
  [
    "Conditional with not boolean type",
    "p(2 ? 3 : 4)",
    /Must have type boolean/,
  ],
  [
    "Different consequent and otherwise type",
    "p(true ? 2 : 2.0)",
    /Must have the same type, got float expected int./,
  ],
  ["Or without a boolean type", "p(2 or false)", /Must have type boolean/],
  ["And without a boolean type", "p(true and 5)", /Must have type boolean/],
  [
    "Test without same type",
    "p(3 < 3.0)",
    /Must have the same type, got float expected int./,
  ],
  ["Subtract strings", 'p("cat" - "dog")', /Must have type integer or float/],
  ["Add different types", "p(2.0 + true)", /Must have type integer or float/],
  ["Multiplying strings", 'p("cat" * "dog")', /Must have type integer/],
  [
    "Multiplying different types",
    "p(2.0 / false)",
    /Must have type integer or float/,
  ],
  [
    "Power with different types",
    "p(2.0 ** true)",
    /Must have type integer or float/,
  ],
  ["Not equals on literal", "p(!2)", /Must have type boolean/],
  ["Negative string", 'p(-"cat")', /Must have type integer or float/],
  ["Not declared id", "p(x + 2)", /Unable to find x./],
  ["Indexing non indexable", "im x: 2 p(x[1])", /Must have type array/],
  // ["Assigning non assignable", "mu x: 2 p(x: c Dog{})", /asdf/],
  ["Return from non-function", "l i in 8 {r 4}", /Must be in a function./],
  [
    "Cannot redeclare functions",
    "f func(){r 2} f func(){r 1}",
    /Unable to return from a void function./,
  ],
  [
    "Returning from void function",
    "f func() {r 5}",
    /Unable to return from a void function./,
  ],
  [
    "Returning wrong type",
    "f func() -> int {r 2.5}",
    /Unable to return float from function marked to return int./,
  ],
  [
    "Function call with too many arguments",
    "f func(x int){} func(2, 3)",
    /Expected "\)"$/,
  ],
  [
    "Function parameter out of scope",
    "f func(x int){} p(x)",
    /Unable to find x./,
  ],
  ["Using variable before declaration", "p(y) mu y: 5", /Unable to find y./],
  [
    "Assigning incompatible type",
    "mu x: 5 x: true",
    /cannot assign type boolean to int/,
  ],
  ["Undefined variable in expression", "mu y: x + 3", /Unable to find x./],
  ["Break outside loop", "b", /Must be in a loop./],
  ["Continue outside loop", "c", /Expected a letter/],
  [
    "Modifying immutable inside loop",
    "im x: 2 l i in [1...5] {x: i}",
    /Cannot read properties of undefined \(reading 'mutable'\)/,
  ],
  ["Instantiating undefined class", "im d: Cat{}", /Expected end of input/],
  [
    "Calling non-existent method",
    "c Dog {} im d: Dog{} d.run()",
    /Expected "con"$/,
  ],
  [
    "Constructor wrong args",
    "c Dog {con(x int)} im d: Dog()",
    /Expected 1 arguments, but 0 parameters were passed/,
  ],
  [
    "Returning class from primitive function",
    "c Dog {con()} f func() -> int {r Dog()}",
    /Unable to return Dog from function marked to return int./,
  ],
  [
    "Trying to index a immutable array",
    "im x: [1 2 3] x[1]: true",
    /x\[1\] is not mutable$/,
  ],
  [
    "Assigning wrong type to array",
    "mu x: [1 2 3] x[1]: true",
    /cannot assign type boolean to int/,
  ],
  [
    "Using object as array",
    "c Dog {con()} im d: Dog() p(d[1])",
    /Must have type array/,
  ],
  ["AND with non-boolean", "p(3 and true)", /Must have type boolean/],
  ["OR with non-boolean", "p(false or 5)", /Must have type boolean/],
  ["Equality check between incompatible types", 'p(2 = "hello")', / /],
  [
    "Invalid comparison",
    'p("cat" < 5)',
    /Must have the same type, got int expected string./,
  ],
  ["Not operator on number", "p(!2)", /Must have type boolean/],
  // ["Chained comparisons with mixed types", 'p(3 < "dog" < 4)', /asdf/],
  [
    "Call class method that doesn't exist",
    "c Dog{con() f bark(){}} im x: Dog() x.cat()",
    /Type Dog does not have method cat/,
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
      analyze(parse("mu x: 3.14 + 2.2")),
      program([
        variableDeclaration(
          variable("x", true, "float"),
          binary("+", 3.14, 2.2, "float")
        ),
      ])
    );
  });
});
