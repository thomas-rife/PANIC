import * as fs from "fs";
import * as ohm from "ohm-js";

// Read the contents of the file cassowary.ohm into a string
const grammar = ohm.grammar(fs.readFileSync("src/cassowary.ohm", "utf8"));

const interpreter = grammar.createSemantics();
interpreter.addOperation("eval", {
  Program(statements) {
    for (const statement of statments.children) {
      statement.eval();
    }
  },
});

const sourceCode = process.argv[2];
const match = grammar.match(sourceCode);
if (match.succeeded()) {
  interpreter(match).eval();
} else {
  console.error(match.message);
}
