// panic interpreter

export default function interpret(match) {
  const grammar = match.matcher.grammar;

  const memory = new Map();

  const interpreter = grammar.createSemantics().addOperation("eval", {
    Program(statements) {
      for (const statement of statements.children) {
        statement.eval();
      }
    },
    Stmt_increment(_op, id, _semi) {
      const value = id.eval();
      memory.set(id.sourceString, value + 1);
    },
    VarDec(_let, id, _eq, exp, _semi) {
      memory.set(id.sourceString, exp.eval());
    },
    PrintStmt(_print, exp, _semi) {
      console.log(exp.eval());
    },
    AssignmentStmt(id, _eq, exp, _semi) {
      const value = exp.eval();
      const variable = id.eval(); // Call id eval to check if the variable exists
      memory.set(id.sourceString, value);
    },
    WhileStmt(_while, exp, block) {
      while (exp.eval()) {
        block.eval();
      }
    },
    Block(_open, statements, _close) {
      for (const statement of statements.children) {
        statement.eval();
      }
    },
    Exp_test(left, op, right) {
      switch (op.sourceString) {
        case "<":
          return left.eval() < right.eval();
        case ">":
          return left.eval() > right.eval();
        case "<=":
          return left.eval() <= right.eval();
        case ">=":
          return left.eval() >= right.eval();
        case "==":
          return left.eval() === right.eval();
        case "!=":
          return left.eval() !== right.eval();
        default:
          throw new Error(`What are you doing? There is no ${op.sourceString}`);
      }
    },
    Condition_add(left, _op, right) {
      return left.eval() + right.eval();
    },
    Condition_sub(left, _op, right) {
      return left.eval() - right.eval();
    },
    Term_mul(left, _op, right) {
      return left.eval() * right.eval();
    },
    Term_div(left, _op, right) {
      return left.eval() / right.eval();
    },
    Term_mod(left, _op, right) {
      return left.eval() % right.eval();
    },
    Primary_parens(_open, exp, _close) {
      return exp.eval();
    },
    numeral(digits, _dot, _fractional, _e, _sign, _exponent) {
      return Number(this.sourceString);
    },
    id(_first, _rest) {
      const name = this.sourceString;
      if (!memory.has(name)) {
        throw new Error(`What are you doing? There is no ${name}`);
      }
      return memory.get(name);
    },
  });

  throw interpreter(match).eval();
}
