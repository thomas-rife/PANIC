import { describe, it } from "node:test";
import assert from "node:assert/strict";
import optimize from "../src/optimizer.js";
import * as core from "../src/core.js";

const i = core.variable("x", true, core.intType);
const x = core.variable("x", true, core.floatType);
const a = core.variable("a", true, "int[]");
const return1p1 = core.returnStatement(core.binary("+", 1, 1, core.intType));
const return2 = core.returnStatement(2);
const returnX = core.returnStatement(x);
const onePlusTwo = core.binary("+", 1, 2, core.intType);
const aParam = core.variable("a", false, core.anyType);
const identity = Object.assign(
  core.func("id", [aParam], [returnX], core.anyType)
);
const intFun = (body) => core.func("f", [], body, core.intType);
const intFunDecl = (body) => core.functionDeclaration(intFun(body));
const callIdentity = (args) => core.functionCall(identity, args);
const or = (...d) => d.reduce((x, y) => core.binary("||", x, y));
const and = (...c) => c.reduce((x, y) => core.binary("&&", x, y));
const less = (x, y) => core.binary("<", x, y);
const eq = (x, y) => core.binary("==", x, y);
const times = (x, y) => core.binary("*", x, y);
const neg = (x) => core.unary("-", x);
const array = (...elements) => core.array(elements);
const assign = (v, e) => core.assignment(v, e);
const emptyArray = core.emptyArray(core.intType);
const sub = (a, e) => core.arrayIndex(a, e);
const program = core.program;

const tests = [
  ["folds +", core.binary("+", 5, 8), 13],
  ["folds -", core.binary("-", 5n, 8n), -3n],
  ["folds *", core.binary("*", 5, 8), 40],
  ["folds /", core.binary("/", 5, 8), 0.625],
  ["folds **", core.binary("**", 5, 8), 390625],
  ["folds <", core.binary("<", 5, 8), true],
  ["folds <=", core.binary("<=", 5, 8), true],
  ["folds ==", core.binary("=", 5, 8), false],
  ["folds !=", core.binary("!=", 5, 8), true],
  ["folds >=", core.binary(">=", 5, 8), false],
  ["folds >", core.binary(">", 5, 8), false],
  ["optimizes +0", core.binary("+", x, 0), x],
  ["optimizes -0", core.binary("-", x, 0), x],
  ["optimizes *1 for ints", core.binary("*", i, 1), i],
  ["optimizes *1 for floats", core.binary("*", x, 1), x],
  ["optimizes /1", core.binary("/", x, 1), x],
  ["optimizes *0", core.binary("*", x, 0), 0],
  ["optimizes 0*", core.binary("*", 0, x), 0],
  ["optimizes 0/", core.binary("/", 0, x), 0],
  ["optimizes 0+ for floats", core.binary("+", 0, x), x],
  ["optimizes 0+ for ints", core.binary("+", 0n, i), i],
  ["optimizes 0-", core.binary("-", 0, x), neg(x)],
  ["optimizes 1*", core.binary("*", 1, x), x],
  ["folds negation", core.unary("-", 8), -8],
  ["optimizes 1** for ints", core.binary("**", 1n, i), 1n],
  ["optimizes 1** for floats", core.binary("**", 1n, x), 1n],
  ["optimizes **0", core.binary("**", x, 0), 1],
  ["removes left false from ||", or(false, less(x, 1)), less(x, 1)],
  ["removes right false from ||", or(less(x, 1), false), less(x, 1)],
  ["removes left true from &&", and(true, less(x, 1)), less(x, 1)],
  ["removes right true from &&", and(less(x, 1), true), less(x, 1)],
  [
    "removes x=x at beginning",
    program([core.assignment(x, x), core.binary("+", x, 1)]),
    program([core.binary("+", x, 1)]),
  ],
  [
    "removes x=x at end",
    program([core.binary("+", x, 1), core.assignment(x, x)]),
    program([core.binary("+", x, 1)]),
  ],
  [
    "removes x=x in middle",
    program([core.binary("+", x, 1), assign(x, x), core.binary("+", x, 1)]),
    program([core.binary("+", x, 1), core.binary("+", x, 1)]),
  ],
  [
    "optimizes if-true",
    core.ifStatement(true, [core.binary("+", x, 1)], [], []),
    [core.binary("+", x, 1)],
  ],
  [
    "optimizes if-false",
    core.ifStatement(false, [], [], [core.elseStmt([core.binary("+", x, 1)])]),
    [core.binary("+", x, 1)],
  ],
  [
    "optimizes while-false",
    program([core.whileStatement(false, [core.binary("+", x, 1)])]),
    program([]),
  ],
  [
    "optimizes for",
    core.forStatement(x, core.range(1, 3, "-", 1), [core.binary("+", x, 1)]),
    [],
  ],
  [
    "optimizes in functions",
    program([intFunDecl([return1p1])]),
    program([intFunDecl([return2])]),
  ],
  ["optimizes in subscripts", sub(a, onePlusTwo), sub(a, 3)],
  ["optimizes in array literals", array(0, onePlusTwo, 9), array(0, 3, 9)],
  ["optimizes in arguments", callIdentity([times(3, 5)]), callIdentity([15])],
  [
    "passes through nonoptimizable constructs",
    ...Array(2).fill([
      core.program([core.returnStatement()]),
      core.variableDeclaration("x", true, "z"),
      core.assignment(x, core.binary("*", x, "z")),
      core.assignment(x, core.unary("not", x)),
      core.variableDeclaration("q", false, core.anyType),
      core.variableDeclaration("r", false, core.anyType),
      core.whileStatement(true, [core.breakStatement]),
      core.ifStatement(x, [], []),
      core.forStatement(x, array(1, 2, 3), []),
    ]),
  ],
  [
    "optimizes ranges using + when start > end",
    core.forStatement(x, core.range(5, 1, "+", 1), [core.binary("+", x, 1)]),
    [],
  ],
  [
    "case * for ranges where start > end and x is greater than 1",
    core.forStatement(x, core.range(5, 1, "*", 2), [core.binary("*", x, 2)]),
    [],
  ],
  [
    "case * for ranges where start < end and x is less than 1",
    core.forStatement(x, core.range(1, 5, "*", 0.5), [
      core.binary("*", x, 0.5),
    ]),
    [],
  ],
  [
    "case * for ranges where value is 1",
    core.forStatement(x, core.range(2, 5, "*", 1), [core.binary("*", x, 1)]),
    core.forStatement(x, 2, [x]),
  ],
  [
    "case * for ranges where value is 0",
    core.forStatement(x, core.range(0, 0, "*", 0), [core.binary("*", x, 0)]),
    [],
  ],
  [
    "case ** for ranges where value is 0",
    core.forStatement(x, core.range(0, 0, "**", 0), [core.binary("*", x, 0)]),
    [],
  ],
  [
    "case ** for ranges where start < end and x is less than 1",
    core.forStatement(x, core.range(1, 5, "**", 0.5), [
      core.binary("**", x, 0.5),
    ]),
    [],
  ],
  [
    "case ** for ranges where start > end and x is greater than 1",
    core.forStatement(x, core.range(10, 5, "**", 2), [core.binary("**", x, 2)]),
    [],
  ],
  [
    "case ** for ranges where value is 1",
    core.forStatement(x, core.range(2, 5, "**", 1), [core.binary("**", x, 1)]),
    core.forStatement(x, 2, [core.binary("**", x, 1)]),
  ],
  [
    "case / for ranges where start > end and x is less than 1",
    core.forStatement(x, core.range(10, 1, "/", 0.2), [
      core.binary("/", x, 0.2),
    ]),
    [],
  ],
  [
    "case / for ranges where start < end and x is < than 1",
    core.forStatement(x, core.range(1, 10, "/", 2), [core.binary("/", x, 2)]),
    [],
  ],
  ["case / for ranges where value is 1", core.range(10, 1, "/", 1), 10],
  [
    "case / for ranges where value is 0",
    core.forStatement(x, core.range(0, 0, "/", 0), [core.binary("/", x, 0)]),
    [],
  ],
  [
    "selects first matching elseif",
    core.ifStatement(
      false,
      [],
      [core.elifStmt(true, [core.binary("+", x, 1)])],
      []
    ),
    [core.binary("+", x, 1)],
  ],
  [
    "falls back to else when all elseifs false",
    core.ifStatement(
      false,
      [],
      [core.elifStmt(false, [core.binary("+", x, 2)])],
      [core.elseStmt([core.binary("-", x, 3)])]
    ),
    [core.binary("-", x, 3)],
  ],
  [
    "returns empty when all elseifs false and no else",
    core.ifStatement(
      false,
      [],
      [core.elifStmt(false, [core.binary("+", x, 4)])],
      []
    ),
    [],
  ],
  [
    "returns if there are elseifs and their length is 0",
    core.ifStatement(false, [], [], []),
    [],
  ],
  [
    "optimizes when one elif is true",
    core.ifStatement(
      false,
      [],
      core.elifStmt(true, return1p1),
      core.elseStmt([])
    ),
    return1p1,
  ],
  [
    "optimizes constructor calls",
    Object.assign(core.constructorCall([core.binary("+", 1, 2)]), {
      callee: x,
    }),
    Object.assign(core.constructorCall([3]), { callee: x }),
  ],
];

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
      assert.deepEqual(optimize(before), after);
    });
  }
});
