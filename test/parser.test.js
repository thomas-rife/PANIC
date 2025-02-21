import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

const syntaxChecks = [
  ["Simplest syntatically correct program", "p 1"],
  ["Variable Declarations", "x: 1"],
  ["function with no params", "f function1():"],
  [
    "function with two params separated by commas",
    "f function2(param1, param2):",
  ],
  ["function with return statement", "f function3(param1, param2): n:1 r n"],
  ["if statements", "if n=0: r 1"],
  ["if statements and elif statements", "if n = 0: r 0 elif n=1: r 2"],
  [
    "if statements, elif statements and else statements",
    "if n = 0: return 0 elif n=1: r 2 else: return x",
  ],
  ["basic loop example", "l i:0 in x: r 1"],
  ["looping with a nested if statement", "l i:0 in [0...3]: if x = 1: p 45"],
  [
    "looping complex example with range, also nested loop",
    "l i:1 in [1...5]: l j:0 in i: p 4 p 5",
  ],
  ["printing relational operators", "p 1 > 3"],
  ["Commenting examples", "f function4(): r 2 # hello"],
];

const syntaxErrors = [
  ["invalid identifier with emoji", "x😊y: 5", /Line 1, col 2:/],
  ["missing right operand in addition", "p 1 + ;", /Line 1, col 7:/],
  ["unterminated string literal", 'p "hello;', /Line 1, col 10:/],
  ["function call with missing argument", "p foo(,);", /Line 1, col 7:/],
  ["trailing comma in function call", "p foo(1,);", /Line 1, col 9:/],
  ["assignment to literal", "5: 10", /Line 1, col 2:/],
  ["operator with missing operand", "p 2 **;", /Line 1, col 7:/],
  ["if statement missing colon", "if true p 1", /Line 1, col 9:/],
  ["loop header missing colon", "l i:0 in [0...5] p 1", /Line 1, col 21:/],
  ["unexpected operator symbol", "p 1 $ 2", /Line 1, col 5:/],
  ["unbalanced parentheses", "p (1 + 2", /Line 1, col 9:/],
  ["keyword used as identifier", "return: 5", /Line 1, col 7:/],
];

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      assert(parse(source).succeeded());
    });
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern);
    });
  }
});
