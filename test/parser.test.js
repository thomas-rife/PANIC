import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

const syntaxChecks = [
  ["Simplest syntatically correct program", "p 1"],
  ["Mutable Variable Declarations", "mu x: 1"],
  ["Immutable Variable Declarations", "im x: 1"],
  ["function with no parameters", "f function1(){}"],
  [
    "function with two parameters separated by commas",
    "f function2(param1 int param2 float){}",
  ],
  [
    "function with return statement",
    "f function3(param1: 2 param2 int){n:1 r n}",
  ],
  ["if statements", "if n=0{r 1}"],
  ["if statements and elif statements", "if n = 0 {r 0} elif n=1{r 2}"],
  [
    "if statements, elif statements and else statements",
    "if n = 0 {return 0} elif n=1{ r 2} else {return x}",
  ],
  ["basic loop example", "l i in x {r 1}"],
  ["looping with a nested if statement", "l i in [0...3] {if x = 1 {p 45}}"],
  [
    "looping complex example with range, also nested loop",
    "l i in [1...5]  {l j in i {p(4) p(5)}}",
  ],
  ["printing relational operators", "p 1 > 3"],
  ["Commenting examples", "f function4() {r 2} # hello"],

  //new test

  ["Empty Function Declaration", "f func(){}"],
  ["Function Declaration with parameters", "f func(x int y: 3 z float){}"],
  [
    "More complex function",
    "f func(x int y: 3 z float){x: 3 * z ** y return x}",
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
  ["Loop while statement", "l i < 3 {p i}"],
  ["More complex patters", "im x: [1 2 3] l i in 8 {} l i in x {}"],
  ["If statement", "im x: 1 if x = 3 {p 1}"],
  [
    "Complex if statement",
    'if 3 > 4 {} elif 4 = 3 {} elif 5 = 4 {} else {p "yay"}',
  ],
  ["add", "3 + 4"],
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
];

const syntaxErrors = [
  ["invalid identifier with emoji", "x😊y: 5", /Line 1, col 2:/],
  ["missing right operand in addition", "p 1 + ;", /Line 1, col 7:/],
  ["unterminated string literal", 'p "hello;', /Line 1, col 10:/],
  ["function call with missing argument", "p foo(,);", /Line 1, col 7:/],
  ["trailing comma in function call", "p foo(1,);", /Line 1, col 8:/],
  ["operator with missing operand", "p 2 **;", /Line 1, col 7:/],
  ["if statement missing colon", "if true p 1", /Line 1, col 9:/],
  ["loop header missing colon", "l i in [0...5] p 1", /Line 1, col 16:/],
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
