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

    Stmt_increment(_op, id, _semiColon) {},

    VarDec(_letKw, id, _eq, exp, _semiColon) {
      memory.set(id.eval(), exp.eval());
    },

    PrintStmt(_print, exp, _semiColon) {
      // underscore means we don't care about the value
      console.log(exp.eval());
    },

    numeral(digits) {
      return Number(digits.sourceString);
    },

    id(first, rest) {
      // the keyword and ids are checked by the grammar, no check needed here
      const name = `${first.sourceString}${rest.sourceString}`;
      if (!memory.has(name)) {
        throw new Error(`Variable ${name} not defined`);
      }
      return memory.get(name);
    },
  });
  throw interpreter(match.eval());
}
