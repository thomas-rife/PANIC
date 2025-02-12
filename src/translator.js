// panic interpreter

export default function translate(match) {
  const grammar = match.matcher.grammar;

  const locals = new Map();
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
      check(
        !locals.has(id.sourceString),
        `Variable ${id.sourceString} already declared`,
        id
      );
      const initializer = exp.translate();
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
      return `${left.translate()} ${op.sourceString} ${right.translate()}`;

      // switch (
      //   // in the compiler, we return the text of it, run the JS translation
      //   op.sourceString
      // ) {
      //   case "<":
      //     return `${left.translate()} < ${right.translate()}`;
      //   case ">":
      //     return `${left.translate()} > ${right.translate()}`;
      //   case "<=":
      //     return `${left.translate()} <= ${right.translate()}`;
      //   case ">=":
      //     return `${left.translate()} >= ${right.translate()}`;
      //   case "==":
      //     return `${left.translate()} === ${right.translate()}`;
      //   case "!=":
      //     return `${left.translate()} !== ${right.translate()}`;
      //   default:
      //     throw new Error(`What are you doing? There is no ${op.sourceString}`);
      // }
    },
    Condition_add(left, _op, right) {
      return left.translate() + right.translate();
    },
    Condition_sub(left, _op, right) {
      return left.translate() - right.translate();
    },
    Term_mul(left, _op, right) {
      return left.translate() * right.translate();
    },
    Term_div(left, _op, right) {
      return left.translate() / right.translate();
    },
    Term_mod(left, _op, right) {
      return left.translate() % right.translate();
    },
    Primary_parens(_open, exp, _close) {
      return exp.translate();
    },
    numeral(digits, _dot, _fractional, _e, _sign, _exponent) {
      return Number(this.sourceString);
    },
    id(_first, _rest) {
      const name = this.sourceString;
      // need to check if variable has been declared using check function
      check(locals.has(name), `Variable ${name} is not declared`, this);
      return name;
    },
  });

  translator(match).translate();
  return target;
}
