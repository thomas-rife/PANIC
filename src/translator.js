// panic interpreter

import { parse } from "node:path";

export default function translate(match) {
  const grammar = match.matcher.grammar;

  const locals = new Map(); // string -> entity
  const target = [];

  function emit(line) {
    target.push(line);
  }

  function check(condition, message, parseTreeNode) {
    if (!condition) {
      // if condition doesn't pass, throw an error
      throw new Error(
        `${parseTreeNode.source.getLineAndColumnMessage()} ${message}`
      );
    }
  }

  function checkNumber(exp, parseTreeNode) {
    check(e.type === "number", "Expected a number", parseTreeNode);
  }

  function checkBoolean(exp, parseTreeNode) {
    check(e.type === "boolean", "Expected a boolean", parseTreeNode);
  }

  function checkDeclared(name, parseTreeNode) {
    check(locals.has(name), `Variable ${name} is not declared`, parseTreeNode);
  }

  function checkNotDeclared(name, parseTreeNode) {
    check(
      !locals.has(name),
      `Variable ${name} is already declared`,
      parseTreeNode
    );
  }

  const translator = grammar.createSemantics().addOperation("translate", {
    Program(statements) {
      for (const statement of statements.children) {
        statement.translate();
      }
    },
    Stmt_increment(_op, id, _semi) {
      const variable = id.translate();
      emit(`${variable}++;`);
    },
    VarDec(_let, id, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const initializer = exp.translate();
      const variable = {
        kind: "variable",
        name: id.sourceString,
        mutable: true,
        type: initializer.type,
        toString() {
          return this.name;
        },
      };
      locals.set(id.sourceString, "number");
      emit(`let ${id.sourceString} = ${initializer};`);
    },
    PrintStmt(_print, exp, _semi) {
      emit(`print(${exp.translate()});`);
    },
    AssignmentStmt(id, _eq, exp, _semi) {
      const value = exp.translate();
      const variable = id.translate(); // Call id translate to check if the variable exists
      emit(`${variable} = ${value};`);
    },
    WhileStmt(_while, exp, block) {
      // translateuate test and then start executing body

      checkBoolean(test, exp);
      emit(`while (${exp.translate()}) {`);
      block.translate();
      emit("}");
    },
    Stmt_break(_break, _semi) {
      // how do we interpret breaks? functions are similar; how do we do a return?
      emit("break;");
    },
    Block(_open, statements, _close) {
      for (const statement of statements.children) {
        statement.translate();
      }
    },
    Exp_test(left, op, right) {
      // we could return just the operator, but our language has different versions of the same JS operators
      // this checks first if our panic operator has two equals and pairs it with JS triple and so on
      targetOp =
        { "==": "===", "!=": "!==" }[op.sourceString] || op.sourceString;
      return `(${left.translate()} ${op.sourceString} ${right.translate()})`;
    },
    Condition_add(left, _op, right) {
      const x = left.translate();
      const y = right.translate();

      checkNumber(x, left);
      checkNumber(y, right);

      return {
        type: "number",
        toString() {
          return `(${x} + ${y})`;
        },
      };
    },
    Condition_sub(left, _op, right) {
      return `(${left.translate() - right.translate()})`;
    },
    Term_mul(left, _op, right) {
      return `(${left.translate() * right.translate()})`;
    },

    Term_div(left, _op, right) {
      return `(${left.translate() / right.translate()})`;
    },
    Term_mod(left, _op, right) {
      return `(${left.translate() % right.translate()})`;
    },
    Primary_parens(_open, exp, _close) {
      return `(${exp.translate()})`;
    },
    numeral(digits, _dot, _fractional, _e, _sign, _exponent) {
      return Number(this.sourceString);
    },
    factor_neg(_op, right) {
      return `-(${right.translate()})`;
    },
    factor_exp(_op, right) {
      return `(${left.translate()}${right.translate()})`;
    },
    id(_first, _rest) {
      const entity = locals.get(this.sourceString);
      checkDeclared(this.sourceString, this);
      return entity;
    },
    true(_) {
      return true; // type declared on line 156 Boolean.prototype.type = "boolean";
    },
    false(_) {
      return false; // type declared on line 156 Boolean.prototype.type = "boolean";
    },
  });

  translator(match).translate();
  return target;
}

Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";
