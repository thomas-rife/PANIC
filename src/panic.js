import parse from "./parser.js";
import interpreter from "./interpreter.js";

// Read the contents of the file grammar.ohm into a string
if (process.argv.length !== 3) {
  console.error("Usage: node src/panic.js <sourceCodeFileName>");
  process.exit(1);
}

try {
  // synax
  const match = parse(process.argv[2]);
  // semantics
  interpret(match);
} catch (e) {
  console.error(e);
  process.exit(1);
}
