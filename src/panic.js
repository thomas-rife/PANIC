import parse from "./parser.js";
import interpreter from "./interpreter.js";
import * as fs from "fs";

// Read the contents of the file grammar.ohm into a string
if (process.argv.length !== 3) {
  console.error("Usage: node src/panic.js FILENAME");
  process.exit(1);
}

try {
  // synax
  const sourceCode = fs.readFileSync(process.argv[2], "utf8");
  const match = parse(sourceCode);
  // semantics
  interpret(match);
} catch (e) {
  console.error(e);
  process.exit(1);
}
