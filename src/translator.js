export default function translate(match) {
  const grammar = match.matcher.grammar;

  const locals = new Map(); // string -> entity
  const target = [];

  function emit(line) {
    target.push(line);
  }

  function check(condition, message, parseTreeNode) {
    if (!condition) {
      throw new Error(
        `${parseTreeNode.source.getLineAndColumnMessage()} ${message}`
      );
    }
  }

  function checkNumber(e, parseTreeNode) {
    check(e.type === "number", `Expected number`, parseTreeNode);
  }

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean`, parseTreeNode);
  }

  function checkNotDeclared(name, parseTreeNode) {
    check(
      !locals.has(name),
      `Variable already declared: ${name}`,
      parseTreeNode
    );
  }

  function checkDeclared(name, parseTreeNode) {
    check(locals.has(name), `Undeclared variable: ${name}`, parseTreeNode);
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
    Stmt_break(_break, _semi) {
      emit("break;");
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
      locals.set(id.sourceString, variable);
      emit(`let ${variable.name} = ${initializer};`);
    },
    PrintStmt(_print, exp, _semi) {
      emit(`console.log(${exp.translate()});`);
    },
    AssignmentStmt(id, _eq, exp, _semi) {
      const value = exp.translate();
      const variable = id.translate();
      emit(`${variable} = ${value};`);
    },
    WhileStmt(_while, exp, block) {
      const test = exp.translate();
      checkBoolean(test, exp);
      emit(`while (${test}) {`);
      block.translate();
      emit("}");
    },
    Block(_open, statements, _close) {
      for (const statement of statements.children) {
        statement.translate();
      }
    },
    Exp_test(left, op, right) {
      const targetOp =
        { "==": "===", "!=": "!==" }?.[op.sourceString] ?? op.sourceString;
      return `(${left.translate()} ${targetOp} ${right.translate()})`;
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
      return `(${left.translate()} - ${right.translate()})`;
    },
    Term_mul(left, _op, right) {
      return `(${left.translate()} * ${right.translate()})`;
    },
    Term_div(left, _op, right) {
      return `${left.translate()} / ${right.translate()}`;
    },
    Term_mod(left, _op, right) {
      return `(${left.translate()} % ${right.translate()})`;
    },
    Primary_parens(_open, exp, _close) {
      return exp.translate();
    },
    Factor_neg(_op, operand) {
      return `-(${operand.translate()})`;
    },
    Factor_exp(left, _op, right) {
      return `(${left.translate()} ** ${right.translate()})`;
    },
    numeral(digits, _dot, _fractional, _e, _sign, _exponent) {
      return Number(this.sourceString);
    },
    id(_first, _rest) {
      const entity = locals.get(this.sourceString);
      checkDeclared(this.sourceString, this);
      return entity;
    },
    true(_) {
      return true;
    },
    false(_) {
      return false;
    },
  });

  translator(match).translate();
  return target;
}

Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";
